import json
import sys
from pathlib import Path

# Add backend directory to sys.path to import app modules
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

from app.db import init_db, insert_question
from app.schemas import Question

DATA_DIR = BASE_DIR / "data"
QUESTIONS_DIR = DATA_DIR / "questions"

def migrate():
    print("Initializing database...")
    init_db()
    
    if not QUESTIONS_DIR.is_dir():
        print(f"Questions directory not found: {QUESTIONS_DIR}")
        return

    print(f"Scanning for JSON files in {QUESTIONS_DIR}...")
    json_files = sorted(QUESTIONS_DIR.glob("*.json"))
    
    if not json_files:
        print("No JSON files found.")
        return

    total_questions = 0
    for path in json_files:
        category = path.stem.lower()
        print(f"Processing {path.name} (Category: {category})...")
        
        try:
            with path.open("r", encoding="utf-8") as f:
                raw_items = json.load(f)
            
            count = 0
            for item in raw_items:
                # Ensure category is set
                item_data = dict(item)
                item_data.setdefault("category", category)
                
                try:
                    question = Question(**item_data)
                    insert_question(question)
                    count += 1
                except Exception as e:
                    print(f"  Error parsing item {item.get('item_id', 'unknown')}: {e}")
            
            print(f"  Imported {count} questions.")
            total_questions += count
            
        except Exception as e:
            print(f"  Error reading file {path.name}: {e}")

    print(f"\nMigration complete. Total questions imported: {total_questions}")

if __name__ == "__main__":
    migrate()
