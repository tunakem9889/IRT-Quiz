import sqlite3
import json

conn = sqlite3.connect('data/quiz.db')
cursor = conn.cursor()

# Check for LaTeX in questions
rows = cursor.execute("SELECT item_id, stem FROM questions WHERE stem LIKE '%$%' LIMIT 5").fetchall()

print("=== Questions with LaTeX ($) ===")
for row in rows:
    print(f"\nID: {row[0]}")
    print(f"Stem: {row[1][:200]}")
    print("-" * 50)

if not rows:
    print("No questions with $ found. Checking all questions...")
    rows = cursor.execute("SELECT item_id, stem FROM questions LIMIT 5").fetchall()
    for row in rows:
        print(f"\nID: {row[0]}")
        print(f"Stem: {row[1][:200]}")
        print("-" * 50)

conn.close()
