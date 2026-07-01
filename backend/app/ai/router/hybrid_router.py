from langgraph.types import Command


def semantic_router(state):
    """
    Keyword-based router that directs messages to the correct specialist agent.

    Priority order:
      1. Conversation continuity  (keep multi-turn flows in the right agent)
      2. Common utility           (balance checks — NOT confirmations)
      3. HR policy knowledge
      4. Complaint action
      5. Leave action
      6. Default → HR agent
    """
    messages = state.get("messages", [])

    def safe_extract_text(content):
        if isinstance(content, list):
            return " ".join(
                str(item.get("text", "")) for item in content if isinstance(item, dict)
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

    # ── 1. Conversation Continuity (HIGHEST PRIORITY) ────────────────────────
    history_to_check = messages[:-1] if len(messages) > 1 else []
    last_ai_msg = ""
    for msg in reversed(history_to_check):
        if getattr(msg, "type", "") == "ai":
            last_ai_msg = safe_extract_text(msg.content)
            break

    if last_ai_msg:
        last_ai_lower = last_ai_msg.lower()

        # After Google auth connection the last AI content is the bare sentinel
        # "GOOGLE_AUTH_REQUIRED". Look back at which tool triggered it so we can
        # resume the correct agent instead of falling through to the default.
        if "google_auth_required" in last_ai_lower:
            leave_tools   = {"apply_leave_tool"}
            complaint_tools = {"submit_formal_complaint"}
            for msg in reversed(history_to_check):
                if getattr(msg, "type", "") == "ai":
                    tcs = getattr(msg, "tool_calls", []) or []
                    for tc in tcs:
                        name = tc.get("name", "") if isinstance(tc, dict) else getattr(tc, "name", "")
                        if name in leave_tools:
                            print("[Router] Post-auth continuation → LEAVE_AGENT")
                            return Command(goto="leave_agent")
                        if name in complaint_tools:
                            print("[Router] Post-auth continuation → COMPLAINT_AGENT")
                            return Command(goto="complaint_agent")
            # No tool match found — most common post-auth scenario is leave
            print("[Router] Post-auth default → LEAVE_AGENT")
            return Command(goto="leave_agent")

        # Signals that the complaint agent is mid-flow or awaiting confirmation
        complaint_continuation_signals = [
            "anonymously",
            "incident date",
            "accused",
            "shall i submit this formal complaint",
            "would you like me to proceed",
            "complaint to hr",
            "formal complaint",
            "incident",
            "anonymous",
            "anonymity",
            "harassment",
            "bullying",
            "grievance",
        ]
        
        # Signals that the leave agent is mid-flow or awaiting confirmation
        leave_continuation_signals = [
            "dates",
            "reason",
            "shall i submit this leave request",
            "would you like me to proceed",
            "leave request",
            "annual leave",
            "sick leave",
            "gmail connected",
            "submit my leave",
            "proceed and submit",
            "leave type",
        ]

        is_complaint_continuation = any(kw in last_ai_lower for kw in complaint_continuation_signals)
        is_leave_continuation = any(kw in last_ai_lower for kw in leave_continuation_signals)

        # Disambiguate overlapping or generic continuation indicators
        if is_complaint_continuation and is_leave_continuation:
            # Score based on keyword counts to see which flow is more dominant
            comp_count = sum(last_ai_lower.count(kw) for kw in ["complaint", "incident", "harassment", "bullying", "grievance", "accused"])
            leave_count = sum(last_ai_lower.count(kw) for kw in ["leave", "vacation", "pto", "annual", "sick"])
            if comp_count > leave_count:
                is_leave_continuation = False
            else:
                is_complaint_continuation = False

        if not is_complaint_continuation and not is_leave_continuation:
            if "would you like me to proceed" in last_ai_lower or "proceed" in last_ai_lower:
                # Scan further back to see which topic was discussed
                for msg in reversed(history_to_check):
                    if getattr(msg, "type", "") == "ai":
                        prev_ai_lower = safe_extract_text(msg.content)
                        if any(kw in prev_ai_lower for kw in ["complaint", "harassment", "bullying", "incident", "anonymous", "grievance"]):
                            is_complaint_continuation = True
                            break
                        if any(kw in prev_ai_lower for kw in ["leave", "vacation", "pto", "annual", "sick"]):
                            is_leave_continuation = True
                            break

        if is_complaint_continuation:
            print("[Router] Continuation → COMPLAINT_AGENT")
            return Command(goto="complaint_agent")
        elif is_leave_continuation:
            print("[Router] Continuation → LEAVE_AGENT")
            return Command(goto="leave_agent")

    # ── 2. Common Utility ─────────────────────────────────────────────────────
    common_utility_keywords = [
        "balance",
        "how many leaves",
        "how many days",
        "remaining",
        "status",
        "check my",
        "how much leave",
        "leave left",
        "days left",
        "leave remaining",
        "leave available",
        "days remaining",
        "days available",
        "leave i have",
        "what is my leave",
        "how many annual",
        "how many sick",
        "my leave balance",
        "my annual",
        "my sick",
        "entitlement",
    ]
    if any(kw in user_text_lower for kw in common_utility_keywords):
        print("[Router] Utility → COMMON_AGENT")
        return Command(goto="common_agent")

    # ── 3. HR Policy / Knowledge questions ────────────────────────────────────
    hr_policy_keywords = [
        "types of leave",
        "leave policy",
        "what is",
        "how many types",
        "explain",
        "policy",
        "handbook",
        "dress code",
        "benefits",
        "working hours",
        "rules",
        "guidelines",
        "maternity",
        "paternity",
    ]
    if any(kw in user_text_lower for kw in hr_policy_keywords):
        print("[Router] Policy/knowledge question → HR_AGENT")
        return Command(goto="hr_agent")

    # ── 4. Complaint ACTION keywords ──────────────────────────────────────────
    complaint_keywords = [
        "complain",
        "complaint",
        "file a complaint",
        "report",
        "harassment",
        "grievance",
        "misconduct",
        "discrimination",
        "bully",
    ]
    if any(kw in user_text_lower for kw in complaint_keywords):
        print("[Router] Action keyword → COMPLAINT_AGENT")
        return Command(goto="complaint_agent")

    # ── 5. Leave ACTION keywords ──────────────────────────────────────────────
    leave_action_keywords = [
        "apply leave",
        "apply for leave",
        "take leave",
        "want leave",
        "need leave",
        "book leave",
        "request leave",
        "vacation",
        "pto",
    ]
    # "sick leave" as an apply action (NOT just "sick" alone)
    has_exact_match = any(kw in user_text_lower for kw in leave_action_keywords)
    has_split_intent = "leave" in user_text_lower and any(
        act in user_text_lower for act in ["apply", "take", "want", "book", "need"]
    )
    
    # Detect quick sick notification emails — route to common_agent instead
    is_sick_email = any(kw in user_text_lower for kw in [
        "send mail", "send email", "notify", "inform"
    ]) and any(kw in user_text_lower for kw in ["sick", "unwell", "ill", "not feeling"])
    
    if is_sick_email:
        print("[Router] Sick notification email → COMMON_AGENT")
        return Command(goto="common_agent")

    if has_exact_match or has_split_intent:
        print("[Router] Action keyword → LEAVE_AGENT")
        return Command(goto="leave_agent")

    # ── 6. Default: general HR queries ───────────────────────────────────────
    print("[Router] Default → HR_AGENT")
    return Command(goto="hr_agent")
