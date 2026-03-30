"""
Database migration script to add missing columns
Run this once to fix database schema issues
"""
import sqlite3
import os

DB_PATH = "./visionrapid.db"

def check_and_migrate():
    if not os.path.exists(DB_PATH):
        print("Database doesn't exist yet. It will be created on server start.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    if not cursor.fetchone():
        print("Users table doesn't exist. Run the server to create it.")
        conn.close()
        return
    
    # Check columns in users table
    cursor.execute("PRAGMA table_info(users);")
    columns = {row[1] for row in cursor.fetchall()}
    print(f"Existing columns: {columns}")
    
    # Check if username column exists
    if 'username' not in columns:
        print("Adding 'username' column...")
        try:
            # Add username column with a default value
            cursor.execute("ALTER TABLE users ADD COLUMN username TEXT;")
            # Update existing rows with email as username (temporary)
            cursor.execute("UPDATE users SET username = email WHERE username IS NULL;")
            conn.commit()
            print("Successfully added 'username' column!")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("'username' column already exists.")
    
    conn.close()
    print("\nMigration complete! Restart the server.")

if __name__ == "__main__":
    check_and_migrate()
