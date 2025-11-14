"""Pydantic schemas for Adaptive Quiz API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ItemParams(BaseModel):
    """IRT parameters for an item."""
    a: float = Field(..., description="Discrimination parameter")
    b: float = Field(..., description="Difficulty parameter")
    c: Optional[float] = Field(None, description="Guessing parameter (for 3PL)")


class Question(BaseModel):
    """Question item."""
    item_id: str
    stem: str
    choices: List[str]
    correct: int
    params: ItemParams
    category: str = Field("general", description="Question category/subject")
    content_tags: Optional[List[str]] = None
    language: Optional[str] = "vi"


class QuizConfig(BaseModel):
    """Quiz configuration."""
    max_questions: int = Field(10, ge=3, le=50, description="Maximum number of questions")
    stop_se: float = Field(0.35, ge=0.05, le=1.5, description="Stop when SE reaches this threshold")
    theta_clamp: float = Field(4.0, description="Maximum absolute value for theta")
    newton_max_iter: int = Field(12, description="Maximum Newton-Raphson iterations")
    newton_tol: float = Field(1e-4, description="Newton-Raphson convergence tolerance")
    newton_max_step: float = Field(1.0, description="Maximum step size per iteration")


class StartQuizRequest(BaseModel):
    """Request to start a new quiz."""
    config: Optional[QuizConfig] = None
    category: Optional[str] = Field(
        None, description="Question category to use (default: first available)"
    )


class StartQuizResponse(BaseModel):
    """Response when starting a quiz."""
    session_id: str
    question: Question
    category: str
    theta: float = 0.0
    se: Optional[float] = None
    q_count: int = 0
    answered_count: int = 0


class SubmitAnswerRequest(BaseModel):
    """Request to submit an answer."""
    session_id: str
    choice_index: Optional[int] = Field(None, description="Selected choice index (None for skip)")
    skipped: bool = Field(False, description="Whether the question was skipped")


class SubmitAnswerResponse(BaseModel):
    """Response after submitting an answer."""
    session_id: str
    correct: Optional[bool] = Field(None, description="Whether answer was correct (None if skipped)")
    theta: float
    se: Optional[float] = None
    q_count: int
    answered_count: int
    finished: bool = Field(False, description="Whether quiz is finished")
    next_question: Optional[Question] = None


class QuizStatusResponse(BaseModel):
    """Current quiz status."""
    session_id: str
    theta: float
    se: Optional[float] = None
    q_count: int
    answered_count: int
    information_sum: float


class QuizResult(BaseModel):
    """Final quiz result."""
    session_id: str
    theta: float
    se: Optional[float] = None
    q_count: int
    answered_count: int
    correct_count: int
    report: str
