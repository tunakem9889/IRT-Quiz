"""FastAPI application for Adaptive Quiz (IRT 2PL/3PL)."""
from __future__ import annotations

import json
import math
import random
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import irt
from .schemas import (
    QuizConfig,
    QuizResult,
    QuizStatusResponse,
    Question,
    StartQuizRequest,
    StartQuizResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
QUESTIONS_PATH = DATA_DIR / "questions.json"
QUESTIONS_DIR = DATA_DIR / "questions"

app = FastAPI(
    title="Adaptive Quiz API",
    description="API for Computer Adaptive Testing using IRT (2PL/3PL)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_question_collections() -> Dict[str, List[Question]]:
    """Load question banks grouped by category."""
    collections: Dict[str, List[Question]] = {}

    if QUESTIONS_DIR.is_dir():
        for path in sorted(QUESTIONS_DIR.glob("*.json")):
            category = path.stem.lower()
            with path.open("r", encoding="utf-8") as f:
                raw_items = json.load(f)
            questions: List[Question] = []
            for item in raw_items:
                question_data = dict(item)
                question_data.setdefault("category", category)
                questions.append(Question(**question_data))
            if questions:
                collections[category] = questions
    elif QUESTIONS_PATH.is_file():
        with QUESTIONS_PATH.open("r", encoding="utf-8") as f:
            raw_items = json.load(f)
        if raw_items:
            collections["general"] = [
                Question(**{**item, "category": item.get("category", "general")})
                for item in raw_items
            ]

    if not collections:
        raise RuntimeError(
            "Không tìm thấy dữ liệu câu hỏi. Vui lòng kiểm tra thư mục 'data/questions'."
        )

    return collections


QUESTION_COLLECTIONS = load_question_collections()
QUESTION_CATEGORIES = sorted(QUESTION_COLLECTIONS.keys())
CATEGORY_DISPLAY_NAMES = {
    "math": "Toán",
    "chemistry": "Hóa",
    "physics": "Lý",
    "history": "Lịch sử",
}


def get_question_bank(category: Optional[str]) -> List[Question]:
    """Return question bank for a specific category or default."""
    if category:
        normalized = category.lower()
        if normalized not in QUESTION_COLLECTIONS:
            valid = ", ".join(QUESTION_CATEGORIES)
            raise HTTPException(
                status_code=404,
                detail=f"Danh mục '{category}' không tồn tại. Các danh mục hợp lệ: {valid}.",
            )
        return QUESTION_COLLECTIONS[normalized]

    default_category = QUESTION_CATEGORIES[0]
    return QUESTION_COLLECTIONS[default_category]


class QuizSession:
    """Quiz session state."""

    def __init__(self, session_id: str, config: QuizConfig, category: str):
        self.session_id = session_id
        self.config = config
        self.category = category
        self.theta = 0.0
        self.information_sum = 0.0
        self.responses = []  # List of {item_id, correct, a, b, c}
        self.asked_ids = set()
        self.q_count = 0
        self.answered_count = 0
        self.current_item: Optional[Question] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "session_id": self.session_id,
            "config": self.config.model_dump(),
            "category": self.category,
            "theta": self.theta,
            "information_sum": self.information_sum,
            "responses": self.responses,
            "asked_ids": list(self.asked_ids),
            "q_count": self.q_count,
            "answered_count": self.answered_count,
            "current_item": self.current_item.model_dump() if self.current_item else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, object]) -> "QuizSession":
        session = cls(
            str(data["session_id"]),
            QuizConfig(**data["config"]),
            str(data.get("category", "general")),
        )
        session.theta = float(data["theta"])
        session.information_sum = float(data["information_sum"])
        session.responses = list(data["responses"])  # type: ignore[list-item]
        session.asked_ids = set(data["asked_ids"])  # type: ignore[arg-type]
        session.q_count = int(data["q_count"])
        session.answered_count = int(data["answered_count"])
        current_item = data.get("current_item")
        session.current_item = Question(**current_item) if current_item else None
        return session


sessions: Dict[str, Dict[str, object]] = {}


def select_next_item(
    theta: float, asked_ids: set[str], question_bank: List[Question]
) -> Optional[Question]:
    candidates = [q for q in question_bank if q.item_id not in asked_ids]
    if not candidates:
        return None

    scored = []
    for item in candidates:
        info_value = irt.info_item(item.params.a, item.params.b, theta, item.params.c)
        scored.append({"item": item, "info": info_value})

    scored.sort(key=lambda x: x["info"], reverse=True)
    top_k = scored[: min(5, len(scored))]
    selected = random.choice(top_k)
    return selected["item"]


def should_stop(session: QuizSession) -> bool:
    se = irt.estimate_se(session.information_sum)
    if session.q_count >= session.config.max_questions:
        return True
    if session.information_sum > 0 and se <= session.config.stop_se and session.answered_count >= 3:
        return True
    return False


@app.get("/")
async def root():
    return {
        "message": "Adaptive Quiz API",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/quiz/start": "Start a new quiz",
            "POST /api/quiz/submit": "Submit an answer",
            "GET /api/quiz/{session_id}/status": "Get quiz status",
            "GET /api/quiz/{session_id}/result": "Get quiz result",
        },
    }


@app.post("/api/quiz/start", response_model=StartQuizResponse)
async def start_quiz(request: StartQuizRequest = StartQuizRequest()):
    session_id = str(uuid.uuid4())
    config = request.config or QuizConfig()
    category = request.category.lower() if request.category else QUESTION_CATEGORIES[0]
    if category not in QUESTION_COLLECTIONS:
        valid = ", ".join(QUESTION_CATEGORIES)
        raise HTTPException(
            status_code=404,
            detail=f"Danh mục '{category}' không tồn tại. Các danh mục hợp lệ: {valid}.",
        )

    question_bank = QUESTION_COLLECTIONS[category]
    session = QuizSession(session_id, config, category)

    question = select_next_item(session.theta, session.asked_ids, question_bank)
    if not question:
        raise HTTPException(status_code=400, detail="No questions available")

    session.current_item = question
    session.asked_ids.add(question.item_id)

    sessions[session_id] = session.to_dict()

    se = irt.estimate_se(session.information_sum)
    se_value = se if math.isfinite(se) else None

    return StartQuizResponse(
        session_id=session_id,
        question=question,
        category=session.category,
        theta=session.theta,
        se=se_value,
        q_count=session.q_count,
        answered_count=session.answered_count,
    )


@app.post("/api/quiz/submit", response_model=SubmitAnswerResponse)
async def submit_answer(request: SubmitAnswerRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = QuizSession.from_dict(sessions[request.session_id])
    question_bank = QUESTION_COLLECTIONS.get(
        session.category, QUESTION_COLLECTIONS[QUESTION_CATEGORIES[0]]
    )

    if not session.current_item:
        raise HTTPException(status_code=400, detail="No current question")

    item = session.current_item
    skipped = request.skipped or request.choice_index is None
    session.q_count += 1

    correct = None
    if not skipped:
        choice_index = request.choice_index
        if choice_index is None:
            raise HTTPException(status_code=400, detail="choice_index required when not skipped")

        correct = choice_index == item.correct

        response = {
            "item_id": item.item_id,
            "correct": correct,
            "a": item.params.a,
            "b": item.params.b,
            "c": item.params.c,
        }
        session.responses.append(response)
        session.answered_count += 1

        session.theta = irt.update_theta_map(
            session.theta,
            session.responses,
            theta_clamp=session.config.theta_clamp,
            newton_max_iter=session.config.newton_max_iter,
            newton_tol=session.config.newton_tol,
            newton_max_step=session.config.newton_max_step,
        )

        session.information_sum = irt.recompute_information_sum(session.theta, session.responses)

    finished = should_stop(session)

    next_question = None
    if not finished:
        next_question = select_next_item(session.theta, session.asked_ids, question_bank)
        if next_question:
            session.current_item = next_question
            session.asked_ids.add(next_question.item_id)
        else:
            finished = True

    sessions[session.session_id] = session.to_dict()

    se = irt.estimate_se(session.information_sum)
    se_value = se if math.isfinite(se) else None

    return SubmitAnswerResponse(
        session_id=session.session_id,
        correct=correct,
        theta=session.theta,
        se=se_value,
        q_count=session.q_count,
        answered_count=session.answered_count,
        finished=finished,
        next_question=next_question,
    )


@app.get("/api/quiz/{session_id}/status", response_model=QuizStatusResponse)
async def get_quiz_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = QuizSession.from_dict(sessions[session_id])
    se = irt.estimate_se(session.information_sum)
    se_value = se if math.isfinite(se) else None

    return QuizStatusResponse(
        session_id=session_id,
        theta=session.theta,
        se=se_value,
        q_count=session.q_count,
        answered_count=session.answered_count,
        information_sum=session.information_sum,
    )


@app.get("/api/quiz/{session_id}/result", response_model=QuizResult)
async def get_quiz_result(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = QuizSession.from_dict(sessions[session_id])
    se = irt.estimate_se(session.information_sum)
    se_value = se if math.isfinite(se) else None

    correct_count = sum(1 for r in session.responses if r["correct"])
    answered = session.answered_count

    report = (
        "Số câu trình bày: {q}\n"
        "Đã trả lời: {answered}\n"
        "Số câu đúng: {correct}/{answered}\n"
        "Ghi chú: câu bỏ qua không ảnh hưởng θ hoặc SE trong bản demo này."
    ).format(q=session.q_count, answered=answered, correct=correct_count)

    return QuizResult(
        session_id=session_id,
        theta=session.theta,
        se=se_value,
        q_count=session.q_count,
        answered_count=answered,
        correct_count=correct_count,
        report=report,
    )


@app.get("/api/questions")
async def get_questions(category: Optional[str] = None):
    if category:
        bank = get_question_bank(category)
        return [q.model_dump() for q in bank]

    questions: List[Question] = []
    for bank in QUESTION_COLLECTIONS.values():
        questions.extend(bank)
    return [q.model_dump() for q in questions]


@app.get("/api/categories")
async def get_categories():
    return [
        {"id": key, "name": CATEGORY_DISPLAY_NAMES.get(key, key.title())}
        for key in QUESTION_CATEGORIES
    ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
