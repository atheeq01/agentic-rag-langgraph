import asyncio
import time
from datetime import datetime
from typing import Annotated, List, TypedDict

import psycopg.errors
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from psycopg_pool import AsyncConnectionPool

from app.ai.prompts import (
    COMMON_AGENT_PROMPT,
    COMPLAINT_PROMPT,
    HR_PROMPT,
    LEAVE_PROMPT,
)
from app.ai.router.hybrid_router import semantic_router
from app.ai.tools.hr_tools import make_tools_for_user
from app.core.config import settings



# LLM
API_KEY = settings.GOOGLE_API_KEY
DEFAULT_MODEL = settings.DEFAULT_MODEL

if not API_KEY:
    raise ValueError("GOOGLE_API_KEY not found")

_base_llm = ChatGoogleGenerativeAI(
    model=DEFAULT_MODEL,
    temperature=0.2,
    timeout=30,
    api_key=API_KEY,
)


# Async PG connection pool  (singleton)
# max_idle=300 keeps connections below Cloud SQL's ~10-min idle-kill threshold.
# max_lifetime=3600 forces periodic recycling to avoid silent server-side resets.
# TCP keepalives let the OS detect severed connections before the next query.
_pool = AsyncConnectionPool(
    conninfo=settings.DATABASE_URL,
    kwargs={
        "autocommit": True,
        "prepare_threshold": 0,
        "keepalives": 1,
        "keepalives_idle": 60,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    min_size=2,
    max_size=20,
    max_idle=300,
    max_lifetime=3600,
    reconnect_timeout=30,
    open=False,  # opened in startup()
)

_checkpointer: AsyncPostgresSaver | None = None
def _get_checkpointer() -> AsyncPostgresSaver:
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = AsyncPostgresSaver(_pool)
    return _checkpointer


# Startup  (call once from FastAPI lifespan)
async def startup():
    """
    Open the connection pool and run Langgraph checkpointer migrations.
    Call this from your FastAPI @asynccontextmanager lifespan, NOT lazily
    inside run_chat, to avoid per-request races.
    """
    await _pool.open()
    await _get_checkpointer().setup()
    print("[Graph] DB pool and checkpointer ready.")


async def shutdown():
    await _pool.close()
    print("[Graph] DB pool closed.")






# State
class State(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    user_context: dict


def get_system_context(state: State, base_prompt: str) -> str:
    import zoneinfo
    ctx = state.get("user_context", {})
    tz = zoneinfo.ZoneInfo("Asia/Colombo")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    return (
        f"{base_prompt}\n\n"
        f"SYSTEM CONTEXT (DO NOT ASK USER)\n"
        f"Employee ID: {ctx.get('employee_id')}\n"
        f"Employee Name: {ctx.get('employee_name')}\n"
        f"Today Date: {today}\n"
        f"HR Department Email: {settings.HR_DEPARTMENT_EMAIL}\n"
        f"RULES:\n"
        f"- NEVER ask for Employee ID or Name.\n"
        f"- ALWAYS use this data in your tools.\n"
        f"- If an employee requests to send an HR-related email (like sick leave), ALWAYS send it to the HR Department Email."
    )


# extract_text  –  safely pull text from the final message
def extract_text(content) -> str:
    if isinstance(content, list):
        return " ".join(
            str(item.get("text", ""))
            for item in content
            if isinstance(item, dict) and "text" in item
        )
    return str(content) if content else ""


def _safe_final_text(messages: List[BaseMessage]) -> str:
    """
    Walk backwards through messages to find the last AIMessage.
    Prevents raw ToolMessage output being returned to the user when the
    agent loop exits unexpectedly mid-tool-call.
    """
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return extract_text(msg.content)
    # Ultimate fallback
    return extract_text(messages[-1].content) if messages else ""



# LLM call with retry
async def _invoke_with_retry(bound_llm, messages, max_retries: int = 3):
    """
    Retry the LLM call on transient errors (rate limits, timeouts, 5xx).
    Uses simple exponential back-off: 1s, 2s, 4s.
    """
    last_exc = None
    for attempt in range(max_retries):
        try:
            return await bound_llm.ainvoke(messages)
        except Exception as exc:
            last_exc = exc
            wait = 2 ** attempt
            print(f"  [LLM] Attempt {attempt + 1} failed ({exc}). Retrying in {wait}s…")
            await asyncio.sleep(wait)
    raise last_exc


# Core agent loop  (shared by all agent nodes)
async def _run_agent_loop(
        state: State,
        bound_llm,
        base_prompt: str,
        tool_map: dict,
        max_iterations: int = 6,
):
    """
    Run a single agent with an internal tool-calling loop.
    Loops until the LLM produces a final text response (no tool_calls)
    or until max_iterations is reached.
    """
    sys_prompt = get_system_context(state, base_prompt)
    messages = [SystemMessage(content=sys_prompt)] + list(state["messages"])
    all_new_messages: List[BaseMessage] = []

    for i in range(max_iterations):
        t0 = time.time()
        response = await _invoke_with_retry(bound_llm, messages)
        print(f"  [Agent] LLM call #{i + 1} took {time.time() - t0:.2f}s")

        all_new_messages.append(response)

        # No tool calls → final answer
        if not getattr(response, "tool_calls", None):
            break

        # Execute tools
        tool_messages: List[ToolMessage] = []
        requires_google_auth = False

        for tc in response.tool_calls:
            tool_fn = tool_map.get(tc["name"])
            if tool_fn is None:
                tool_messages.append(
                    ToolMessage(
                        content=f"Error: Tool '{tc['name']}' not found.",
                        tool_call_id=tc["id"],
                    )
                )
                continue
            try:
                assert tool_fn is not None
                result = str(tool_fn.invoke(tc["args"]))
                if "GOOGLE_AUTH_REQUIRED" in result:
                    requires_google_auth = True
                tool_messages.append(
                    ToolMessage(content=result, tool_call_id=tc["id"])
                )
            except Exception as exc:
                print(f"  [Tool ERROR] '{tc['name']}' raised: {exc}")
                tool_messages.append(
                    ToolMessage(content=f"Error: {exc}", tool_call_id=tc["id"])
                )

        all_new_messages.extend(tool_messages)

        if requires_google_auth:
            print("  [Agent] GOOGLE_AUTH_REQUIRED — short-circuiting loop.")
            all_new_messages.append(AIMessage(content="GOOGLE_AUTH_REQUIRED"))
            break

        messages.append(response)
        messages.extend(tool_messages)

    return {"messages": all_new_messages}



_graph_cache = {}
MAX_CACHE_SIZE = 100
GRAPH_VERSION = "v3"

# Public entry point
async def run_chat(user_input: str, user, session_id: str) -> str:
    """
    Execute the agentic graph for a user message.

    `user` is a fully-loaded ORM User object.  Tools are created as closures
    scoped to this specific user object, so concurrent calls never share state.
    """
    # Build per-request tool closures
    tool_map = make_tools_for_user(user)

    # Create node closures that capture tool_map without putting it in State
    async def _leave_agent(state: State):
        tm = tool_map["leave"]
        bound = _base_llm.bind_tools(list(tm.values()))
        return await _run_agent_loop(state, bound, LEAVE_PROMPT, tm)

    async def _complaint_agent(state: State):
        tm = tool_map["complaint"]
        bound = _base_llm.bind_tools(list(tm.values()))
        return await _run_agent_loop(state, bound, COMPLAINT_PROMPT, tm)

    async def _hr_agent(state: State):
        tm = tool_map["hr"]
        bound = _base_llm.bind_tools(list(tm.values()))
        return await _run_agent_loop(state, bound, HR_PROMPT, tm)

    async def _common_agent(state: State):
        tm = tool_map["common"]
        bound = _base_llm.bind_tools(list(tm.values()))
        return await _run_agent_loop(state, bound, COMMON_AGENT_PROMPT, tm)

    sid = f"{GRAPH_VERSION}:{session_id}"
    if sid not in _graph_cache:
        if len(_graph_cache) >= MAX_CACHE_SIZE:
            _graph_cache.pop(next(iter(_graph_cache)))
            
        # Compile a fresh graph for this session
        builder = StateGraph(State)
        builder.add_node("router", semantic_router)
        builder.add_node("leave_agent", _leave_agent)
        builder.add_node("complaint_agent", _complaint_agent)
        builder.add_node("hr_agent", _hr_agent)
        builder.add_node("common_agent", _common_agent)
        builder.add_edge(START, "router")
        builder.add_edge("leave_agent", END)
        builder.add_edge("complaint_agent", END)
        builder.add_edge("hr_agent", END)
        builder.add_edge("common_agent", END)
        
        _graph_cache[sid] = builder.compile(checkpointer=_get_checkpointer())
        
    graph = _graph_cache[sid]

    config = {"configurable": {"thread_id": sid}}
    t_start = time.time()

    invoke_payload = {
        "messages": [HumanMessage(content=user_input)],
        "user_context": {
            "employee_id": str(user.id),
            "employee_name": user.full_name,
        },
    }

    for attempt in range(2):
        try:
            result = await graph.ainvoke(invoke_payload, config=config)
            break
        except psycopg.errors.AdminShutdown:
            if attempt == 0:
                print("[run_chat] DB connection terminated by server, retrying once…")
                await asyncio.sleep(0.5)
            else:
                raise

    print(f"[run_chat] Total time: {time.time() - t_start:.2f}s")
    return _safe_final_text(result["messages"])
