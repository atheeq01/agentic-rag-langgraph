def test_leave_date_validation_rejects_past_date():
    from datetime import date, timedelta
    from unittest.mock import MagicMock
    from app.ai.tools.hr_tools import make_tools_for_user

    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.role = "employee"

    tools = make_tools_for_user(mock_user)
    apply = tools["leave"]["apply_leave_tool"]

    past_date = (date.today() - timedelta(days=1)).isoformat()
    result = apply.invoke({
        "start_date": past_date,
        "end_date": past_date,
        "leave_type": "annual",
        "reason": "test"
    })
    assert "past" in result.lower()

def test_leave_date_validation_rejects_reversed_dates():
    from datetime import date, timedelta
    from unittest.mock import MagicMock
    from app.ai.tools.hr_tools import make_tools_for_user

    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.role = "employee"

    tools = make_tools_for_user(mock_user)
    apply = tools["leave"]["apply_leave_tool"]

    future = (date.today() + timedelta(days=30)).isoformat()
    earlier = (date.today() + timedelta(days=20)).isoformat()
    result = apply.invoke({
        "start_date": future,
        "end_date": earlier,
        "leave_type": "annual",
        "reason": "test"
    })
    assert "earlier" in result.lower()
