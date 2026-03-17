"""Example script to test the Adaptive Quiz API."""
from __future__ import annotations

import json
import sys
from typing import Any, Dict

import requests

BASE_URL = "http://localhost:8000"


def test_start_quiz() -> str:
    print("=== Testing Start Quiz ===")
    response = requests.post(
        f"{BASE_URL}/api/quiz/start",
        json={
            "category": "math",
            "config": {
                "max_questions": 10,
                "stop_se": 0.35,
                "theta_clamp": 4.0,
                "newton_max_iter": 12,
                "newton_tol": 0.0001,
                "newton_max_step": 1.0,
            }
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print()
    return data["session_id"]


def test_submit_answer(session_id: str, choice_index: int | None, skipped: bool = False) -> Dict[str, Any]:
    print(f"=== Testing Submit Answer (choice={choice_index}, skipped={skipped}) ===")
    response = requests.post(
        f"{BASE_URL}/api/quiz/submit",
        json={
            "session_id": session_id,
            "choice_index": choice_index,
            "skipped": skipped,
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print()
    return data


def test_get_status(session_id: str) -> None:
    print("=== Testing Get Status ===")
    response = requests.get(f"{BASE_URL}/api/quiz/{session_id}/status", timeout=10)
    response.raise_for_status()
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print()


def test_get_result(session_id: str) -> None:
    print("=== Testing Get Result ===")
    response = requests.get(f"{BASE_URL}/api/quiz/{session_id}/result", timeout=10)
    response.raise_for_status()
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print()


def run_full_quiz() -> None:
    print("=" * 50)
    print("Running Full Quiz Test")
    print("=" * 50)
    print()

    session_id = test_start_quiz()

    for _ in range(5):
        result = test_submit_answer(session_id, choice_index=1)
        if result.get("finished"):
            break
        test_get_status(session_id)

    test_get_result(session_id)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "full":
        run_full_quiz()
    else:
        session_id = test_start_quiz()
        test_submit_answer(session_id, choice_index=1)
        test_get_status(session_id)
