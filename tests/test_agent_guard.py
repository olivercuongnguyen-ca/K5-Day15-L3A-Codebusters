"""Code guards on the leave reason, before any model call (synthetic inputs only)."""
import json
import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(os.path.dirname(HERE), "codebase")]

import agent  # noqa: E402


@pytest.mark.parametrize("reason", ["Bị ốm / đi khám bệnh", "Việc gia đình đột xuất",
                                    "Trùng lịch thi / hoạt động học thuật", "Em đi khám BHYT ở BV Bạch Mai",
                                    "em bi sot cao tu toi qua", "Em có lịch hẹn appointment với doctor"])
def test_real_reasons_pass(reason):
    assert agent.reason_problem(reason) is None


@pytest.mark.parametrize("reason", ["", "ốm", "asdfghjkl qwerty", "aaaaaaaa bbbbbbb", "dfg hjk lmn",
                                    "lol lol lol lol lol lol", "12345678 !!!", "em bị ốm asdkjh qwrtz zxcvb"])
def test_gibberish_or_empty_is_asked_back_without_the_model(reason, monkeypatch):
    monkeypatch.setattr(agent, "call_model", lambda *a, **k: pytest.fail("model must not be called"))
    out = json.loads(agent.answer(json.dumps({"student_id": "SV0001", "session": "LEC 14", "reason": reason}))["output"])
    assert out["status"] == "need_info" and out["question"] and out["email"] is None


def test_tips_are_capped_and_cleaned():
    assert agent._tips({"tips": [" Nêu giờ khám ", 3, "", "a", "b", "c"]}) == ["Nêu giờ khám", "a", "b"]
    assert agent._tips({"tips": "not a list"}) == []
