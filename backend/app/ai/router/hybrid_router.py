# from langgraph.types import Command
#
# def semantic_router(state):
#     """
#     Fast keyword-based router with smart priority and robust conversation continuity.
#     """
#     messages = state.get("messages", [])
#
#     def safe_extract_text(content):
#         if isinstance(content, list):
#             return " ".join(
#                 [str(item.get("text", "")) for item in content if isinstance(item, dict)]
#             ).lower()
#         return str(content).lower()
#
#     # Extract latest user message
#     user_text = ""
#     for msg in reversed(messages):
#         if getattr(msg, "type", "") == "human":
#             user_text = safe_extract_text(msg.content).strip()
#             break
#
#     if not user_text:
#         return Command(goto="hr_agent")
#
#     user_text_lower = user_text.lower()
#
#     # ── 1. Conversation continuity (Robust Context Check) ──
#     # Instead of relying on word count, we check what the AI asked last.
#     history_to_check = messages[:-1] if len(messages) > 1 else []
#     last_ai_msg = ""
#     for msg in reversed(history_to_check):
#         if getattr(msg, "type", "") == "ai":
#             last_ai_msg = safe_extract_text(msg.content)
#             break
#
#     if last_ai_msg:
#         last_ai_lower = last_ai_msg.lower()
#         # If the AI was in the middle of gathering complaint details
#         if any(kw in last_ai_lower for kw in ["anonymously", "incident date", "accused", "shall i submit"]):
#             print("[Router] Continuation → COMPLAINT_AGENT")
#             return Command(goto="complaint_agent")
#
#         # If the AI was in the middle of gathering leave details
#         if any(kw in last_ai_lower for kw in ["dates", "reason", "shall i submit this leave"]):
#             print("[Router] Continuation → LEAVE_AGENT")
#             return Command(goto="leave_agent")
#
#     # ── 2. HR Policy / Knowledge questions (Highest keyword priority) ──
#     hr_policy_keywords = [
#         "types of leave", "type of leave", "leave types", "leave policy",
#         "what is", "what are", "how many types", "tell me about",
#         "explain", "policy", "handbook", "dress code", "benefits",
#         "salary structure", "working hours", "rules for", "guidelines",
#         "eligible for", "eligibility", "entitlement", "what kind",
#         "maternity", "paternity", "bereavement", "sabbatical",
#         "probation", "notice period", "termination", "onboarding",
#         "remote work", "work from home", "wfh", "attendance",
#         "code of conduct", "performance review", "appraisal",
#     ]
#
#     if any(kw in user_text_lower for kw in hr_policy_keywords):
#         print("[Router] Policy/knowledge question → HR_AGENT")
#         return Command(goto="hr_agent")
#
#     # ── 3. Complaint ACTION keywords (Explicit action requests) ──
#     complaint_keywords = [
#         "complain", "complaint", "file a complaint",
#         "raise a complaint", "lodge complaint",
#         "report", "harassment", "grievance",
#         "accused", "misconduct", "hostile",
#         "discrimination", "bully",
#     ]
#
#     if any(kw in user_text_lower for kw in complaint_keywords):
#         print("[Router] Action keyword → COMPLAINT_AGENT")
#         return Command(goto="complaint_agent")
#
#     # ── 4. Leave ACTION keywords ──
#     leave_action_keywords = [
#         "apply leave", "apply for leave", "apply a leave", "apply my leave",
#         "take leave", "take a leave", "want leave", "want a leave",
#         "want to take leave", "i want to take",
#         "need leave", "need a leave", "book leave", "book a leave",
#         "submit leave", "request leave", "sick leave",
#         "leave from", "leave starting", "leave on",
#         "day off", "days off", "time off",
#         "vacation", "pto",
#         "leave balance", "remaining leave", "how many leaves",
#         "check leave", "check my leave", "my leave balance",
#         "annual leave", "casual leave", "medical leave",
#     ]
#
#     if any(kw in user_text_lower for kw in leave_action_keywords):
#         print("[Router] Action keyword → LEAVE_AGENT")
#         return Command(goto="leave_agent")
#
#     # ── 5. Broad leave word detection (Lower priority) ──
#     if "leave" in user_text_lower:
#         question_words = ["what", "how", "why", "when", "which", "tell", "explain", "describe"]
#         if any(user_text_lower.startswith(qw) for qw in question_words):
#             print("[Router] Leave question → HR_AGENT")
#             return Command(goto="hr_agent")
#         else:
#             print("[Router] Leave mention → LEAVE_AGENT")
#             return Command(goto="leave_agent")
#
#     # ── 6. Default: general HR queries ──
#     print("[Router] Default → HR_AGENT")
#     return Command(goto="hr_agent")

from langgraph.types import Command

def semantic_router(state):
    """
    Fast keyword-based router that supports the new Common Agent for
    general tasks like checking balances and confirming emails.
    """
    messages = state.get("messages", [])

    def safe_extract_text(content):
        if isinstance(content, list):
            return " ".join(
                [str(item.get("text", "")) for item in content if isinstance(item, dict)]
            ).lower()
        return str(content).lower()

    # Extract latest user message
    user_text = ""
    for msg in reversed(messages):
        if getattr(msg, "type", "") == "human":
            user_text = safe_extract_text(msg.content).strip()
            break

    if not user_text:
        return Command(goto="hr_agent")

    user_text_lower = user_text.lower()

    user_text_lower = user_text.lower()

    # ── 1. Conversation Continuity (HIGHEST PRIORITY NOW) ──
    history_to_check = messages[:-1] if len(messages) > 1 else []
    last_ai_msg = ""
    for msg in reversed(history_to_check):
        if getattr(msg, "type", "") == "ai":
            last_ai_msg = safe_extract_text(msg.content)
            break

    if last_ai_msg:
        last_ai_lower = last_ai_msg.lower()

        # Gathering complaint details or awaiting complaint confirmation
        if any(kw in last_ai_lower for kw in
               ["anonymously", "incident date", "accused", "shall i submit this formal complaint"]):
            print("[Router] Continuation → COMPLAINT_AGENT")
            return Command(goto="complaint_agent")

        # Gathering leave details or awaiting leave confirmation
        if any(kw in last_ai_lower for kw in ["dates", "reason", "shall i submit this leave request"]):
            print("[Router] Continuation → LEAVE_AGENT")
            return Command(goto="leave_agent")

    # ── 2. Common Utility & Confirmation (Moved to Step 2) ──
    common_utility_keywords = [
        "balance", "how many leaves", "remaining", "status", "check my",
        "send", "confirm", "yes", "done", "mail", "email", "draft", "proceed"
    ]
    if any(kw in user_text_lower for kw in common_utility_keywords):
        print("[Router] Utility/Confirmation → COMMON_AGENT")
        return Command(goto="common_agent")


    # ── 3. Conversation Continuity ──
    history_to_check = messages[:-1] if len(messages) > 1 else []
    last_ai_msg = ""
    for msg in reversed(history_to_check):
        if getattr(msg, "type", "") == "ai":
            last_ai_msg = safe_extract_text(msg.content)
            break

    if last_ai_msg:
        last_ai_lower = last_ai_msg.lower()

        # Gathering complaint details
        if any(kw in last_ai_lower for kw in ["anonymously", "incident date", "accused"]):
            print("[Router] Continuation → COMPLAINT_AGENT")
            return Command(goto="complaint_agent")

        # Gathering leave details
        if any(kw in last_ai_lower for kw in ["dates", "reason"]):
            print("[Router] Continuation → LEAVE_AGENT")
            return Command(goto="leave_agent")

    # ── 4. HR Policy / Knowledge questions ──
    hr_policy_keywords = [
        "types of leave", "leave policy", "what is", "how many types",
        "explain", "policy", "handbook", "dress code", "benefits",
        "working hours", "rules", "guidelines", "maternity", "paternity"
    ]

    if any(kw in user_text_lower for kw in hr_policy_keywords):
        print("[Router] Policy/knowledge question → HR_AGENT")
        return Command(goto="hr_agent")

    # ── 5. Complaint ACTION keywords ──
    complaint_keywords = [
        "complain", "complaint", "file a complaint", "report", "harassment",
        "grievance", "misconduct", "discrimination", "bully"
    ]

    if any(kw in user_text_lower for kw in complaint_keywords):
        print("[Router] Action keyword → COMPLAINT_AGENT")
        return Command(goto="complaint_agent")

    # ── 6. Leave ACTION keywords & Broad Matching ──
    leave_action_keywords = [
        "apply leave", "apply for leave", "take leave", "want leave",
        "need leave", "book leave", "request leave", "sick leave",
        "vacation", "pto"
    ]

    # Check for exact keyword match OR if the sentence contains both an action word and "leave"
    has_exact_match = any(kw in user_text_lower for kw in leave_action_keywords)
    has_split_intent = "leave" in user_text_lower and any(act in user_text_lower for act in ["apply", "take", "want", "book", "sick", "need"])

    if has_exact_match or has_split_intent:
        print("[Router] Action keyword → LEAVE_AGENT")
        return Command(goto="leave_agent")

    # ── 7. Default: general HR queries ──
    print("[Router] Default → HR_AGENT")
    return Command(goto="hr_agent")