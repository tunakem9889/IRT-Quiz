import sys
from pathlib import Path

# Add backend directory to sys.path to import app modules
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

from app.db import get_db_connection

def clear_database():
    print("Clearing all questions from the database...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM questions")
    rows_deleted = cursor.rowcount
    
    conn.commit()
    conn.close()
    
    print(f"Deleted {rows_deleted} questions.")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL questions? (yes/no): ")
    if confirm.lower() == "yes":
        clear_database()
    else:
        print("Operation cancelled.")
