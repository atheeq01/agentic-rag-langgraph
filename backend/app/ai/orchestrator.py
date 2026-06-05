from datetime import datetime
from typing import TypedDict, Annotated, List
import os
import time

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool
from psycopg_pool import ConnectionPool
from langgraph.graph.message import add_messages

from langchain_core.messages import (
    HumanMessage,
    SystemMessage,
    BaseMessage,
    ToolMessage,
)
from langchain_google_genai import ChatGoogleGenerativeAI

from app.ai.prompts import (
    LEAVE_PROMPT,
    COMPLAINT_PROMPT,
    HR_PROMPT,
    COMMON_AGENT_PROMPT,
)
from app.ai.router.hybrid_router import semantic_router
from app.core.config import settings

from app.ai.tools.hr_tools import (
    check_sql_leave_balance,
    hr_vector_search,
    draft_and_send_email,
    current_user_var,
    apply_leave_tool,
    submit_formal_complaint,
    get_current_date,
)

API_KEY = settings.GOOGLE_API_KEY

DEFAULT_MODEL = settings.DEFAULT_MODEL
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY not found")

llm = ChatGoogleGenerativeAI(
    model=DEFAULT_MODEL,
    temperature=0.2,
    timeout=30,
)

connection_kwargs = {
    "autocommit": True,
    "prepare_threshold": 0,
}

pool = AsyncConnectionPool(
    conninfo=settings.DATABASE_URL, kwargs=connection_kwargs, max_size=20, open=False
)

_check_pointer = None
_graph = None

def get_checkpointer():
    global _check_pointer
    if _check_pointer is None:
        _check_pointer = AsyncPostgresSaver(pool)
    return _check_pointer

def get_graph():
    global _graph
    if _graph is None:
        _graph = builder.compile(checkpointer=get_checkpointer())
    return _graph


# ──────────────── STATE ────────────────
class State(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    user_context: dict


def get_system_context(state: State, base_prompt: str) -> str:
    user_context = state.get("user_context", {})
    today_date = datetime.now().strftime("%Y-%m-%d")
    return (
        f"{base_prompt}\n\n"
        f"SYSTEM CONTEXT (DO NOT ASK USER)\n"
        f"Employee ID: {user_context.get('employee_id')}\n"
        f"Employee Name: {user_context.get('employee_name')}\n"
        f"Today Date: {today_date}\n"
        f"RULES:\n"
        f"- NEVER ask for Employee ID or Name.\n"
        f"- ALWAYS use this data in your tools."
    )


def extract_text(content) -> str:
    if isinstance(content, list):
        return " ".join(
            [
                str(item.get("text", ""))
                for item in content
                if isinstance(item, dict) and "text" in item
            ]
        )
    return str(content) if content else ""


# ──────────────── TOOL-BOUND LLMs ────────────────
leave_llm = llm.bind_tools(
    [check_sql_leave_balance, apply_leave_tool, draft_and_send_email, get_current_date]
)
complaint_llm = llm.bind_tools([submit_formal_complaint, check_sql_leave_balance])
hr_llm = llm.bind_tools([hr_vector_search, draft_and_send_email])
common_llm = llm.bind_tools(
    [check_sql_leave_balance, draft_and_send_email, get_current_date]
)


# ──────────────── TOOL EXECUTOR ────────────────
def execute_tools(response, tool_map):
    """Execute tool calls from LLM response and return ToolMessages."""
    tool_messages = []
    requires_google_auth = False
    if not hasattr(response, "tool_calls") or not response.tool_calls:
        return tool_messages, requires_google_auth

    for tc in response.tool_calls:
        tool_name = tc["name"]
        tool = tool_map.get(tool_name)
        if tool is None:
            tool_messages.append(
                ToolMessage(
                    content=f"Error: Tool {tool_name} not found.", tool_call_id=tc["id"]
                )
            )
            continue
        try:
            result = tool.invoke(tc["args"])
            result_str = str(result)
            if "GOOGLE_AUTH_REQUIRED" in result_str:
                requires_google_auth = True
            tool_messages.append(ToolMessage(content=result_str, tool_call_id=tc["id"]))
        except Exception as e:
            tool_messages.append(
                ToolMessage(content=f"Error: {str(e)}", tool_call_id=tc["id"])
            )

    return tool_messages, requires_google_auth


# ──────────────── AGENT RUNNER (handles tool loop internally) ────────────────
async def _run_agent_loop(
    state: State, bound_llm, base_prompt: str, tool_map: dict, max_iterations: int = 6
):
    """
    Runs a single agent with an internal tool-calling loop.
    Instead of bouncing back through the graph for each tool call (slow),
    we loop inside this function until the LLM produces a final text response.
    """
    sys_prompt = get_system_context(state, base_prompt)
    messages = [SystemMessage(content=sys_prompt)] + list(state["messages"])

    all_new_messages = []

    for i in range(max_iterations):
        t0 = time.time()
        response = await bound_llm.ainvoke(messages)
        elapsed = time.time() - t0
        print(f"  [Agent] LLM call #{i + 1} took {elapsed:.2f}s")

        all_new_messages.append(response)

        # If LLM didn't call any tools, we're done
        if not getattr(response, "tool_calls", None):
            break

        # Execute tools and feed results back
        tool_msgs, requires_google_auth = execute_tools(response, tool_map)
        all_new_messages.extend(tool_msgs)

        # If a tool requires Google auth, short-circuit immediately.
        # Return the keyword verbatim so the frontend can detect it.
        if requires_google_auth:
            print("  [Agent] GOOGLE_AUTH_REQUIRED detected — short-circuiting loop.")
            from langchain_core.messages import AIMessage

            all_new_messages.append(AIMessage(content="GOOGLE_AUTH_REQUIRED"))
            break

        # Extend the message list so the next LLM call has full context
        messages.append(response)
        messages.extend(tool_msgs)

    return {"messages": all_new_messages}


# ──────────────── AGENT NODES ────────────────


async def run_common_agent(state: State):
    print("[Common Agent] Handling general utility task...")
    return await _run_agent_loop(
        state,
        common_llm,
        COMMON_AGENT_PROMPT,
        tool_map={
            "check_sql_leave_balance": check_sql_leave_balance,
            "draft_and_send_email": draft_and_send_email,
            "get_current_date": get_current_date,
        },
    )


# ──────────────── AGENT NODES ────────────────
async def run_leave_agent(state: State):
    print("[Leave Agent] Starting...")
    return await _run_agent_loop(
        state,
        leave_llm,
        LEAVE_PROMPT,
        tool_map={
            "check_sql_leave_balance": check_sql_leave_balance,
            "apply_leave_tool": apply_leave_tool,
            "draft_and_send_email": draft_and_send_email,
            "get_current_date": get_current_date,
        },
    )


async def run_complaint_agent(state: State):
    print("[Complaint Agent] Starting...")
    return await _run_agent_loop(
        state,
        complaint_llm,
        COMPLAINT_PROMPT,
        tool_map={
            "submit_formal_complaint": submit_formal_complaint,
            "check_sql_leave_balance": check_sql_leave_balance,
        },
    )


async def run_hr_agent(state: State):
    print("[HR Agent] Starting...")
    return await _run_agent_loop(
        state,
        hr_llm,
        HR_PROMPT,
        tool_map={
            "hr_vector_search": hr_vector_search,
            "draft_and_send_email": draft_and_send_email,
        },
    )


# ──────────────── BUILD GRAPH ────────────────
builder = StateGraph(State)

builder.add_node("router", semantic_router)
builder.add_node("common_agent", run_common_agent)
builder.add_node("leave_agent", run_leave_agent)
builder.add_node("complaint_agent", run_complaint_agent)
builder.add_node("hr_agent", run_hr_agent)

builder.add_edge(START, "router")

builder.add_edge("common_agent", END)
builder.add_edge("leave_agent", END)
builder.add_edge("complaint_agent", END)
builder.add_edge("hr_agent", END)

# graph = builder.compile(checkpointer=check_pointer)  <-- Now lazy loaded via get_graph()


# ──────────────── RUN CHAT ────────────────
_db_setup_completed = False


async def run_chat(user_input: str, user, session_id: str):
    """Execute the agentic RAG graph for a user message."""
    global _db_setup_completed

    if not _db_setup_completed:
        await pool.open()
        await get_checkpointer().setup()
        _db_setup_completed = True

    current_user_var.set(user)

    config = {"configurable": {"thread_id": str(session_id)}}

    t_start = time.time()

    result = await get_graph().ainvoke(
        {
            "messages": [HumanMessage(content=user_input)],
            "user_context": {
                "employee_id": str(user.id),
                "employee_name": user.full_name,
            },
        },
        config=config,
    )

    elapsed = time.time() - t_start
    print(f"[run_chat] Total time: {elapsed:.2f}s")

    final_msg = result["messages"][-1]
    return extract_text(final_msg.content)
