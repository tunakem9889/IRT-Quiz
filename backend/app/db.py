import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional
from .schemas import Question, ItemParams

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "quiz.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with the questions table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS questions (
        item_id TEXT PRIMARY KEY,
        stem TEXT NOT NULL,
        choices TEXT NOT NULL, -- JSON array
        correct INTEGER NOT NULL,
        params_a REAL NOT NULL,
        params_b REAL NOT NULL,
        params_c REAL,
        category TEXT NOT NULL,
        content_tags TEXT, -- JSON array
        language TEXT DEFAULT 'vi'
    )
    """)
    
    conn.commit()
    conn.close()

def insert_question(question: Question):
    """Insert a single question into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    INSERT OR REPLACE INTO questions (
        item_id, stem, choices, correct, 
        params_a, params_b, params_c, 
        category, content_tags, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        question.item_id,
        question.stem,
        json.dumps(question.choices),
        question.correct,
        question.params.a,
        question.params.b,
        question.params.c,
        question.category,
        json.dumps(question.content_tags) if question.content_tags else None,
        question.language
    ))
    
    conn.commit()
    conn.close()

def row_to_question(row: sqlite3.Row) -> Question:
    """Convert a database row to a Question object."""
    return Question(
        item_id=row['item_id'],
        stem=row['stem'],
        choices=json.loads(row['choices']),
        correct=row['correct'],
        params=ItemParams(
            a=row['params_a'],
            b=row['params_b'],
            c=row['params_c']
        ),
        category=row['category'],
        content_tags=json.loads(row['content_tags']) if row['content_tags'] else None,
        language=row['language']
    )

def get_all_questions() -> List[Question]:
    """Retrieve all questions from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM questions")
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_question(row) for row in rows]

def get_questions_by_category(category: str) -> List[Question]:
    """Retrieve questions by category."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM questions WHERE category = ?", (category,))
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_question(row) for row in rows]

def get_all_categories() -> List[str]:
    """Retrieve all unique categories."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT category FROM questions ORDER BY category")
    rows = cursor.fetchall()
    conn.close()
    
    return [row['category'] for row in rows]

def update_question(question: Question):
    """Update an existing question in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    UPDATE questions SET
        stem = ?, choices = ?, correct = ?, 
        params_a = ?, params_b = ?, params_c = ?, 
        category = ?, content_tags = ?, language = ?
    WHERE item_id = ?
    """, (
        question.stem,
        json.dumps(question.choices),
        question.correct,
        question.params.a,
        question.params.b,
        question.params.c,
        question.category,
        json.dumps(question.content_tags) if question.content_tags else None,
        question.language,
        question.item_id
    ))
    
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    if rows_affected == 0:
        raise ValueError(f"Question with item_id '{question.item_id}' not found")

def delete_question(item_id: str):
    """Delete a question from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM questions WHERE item_id = ?", (item_id,))
    
    conn.commit()
    conn.close()
