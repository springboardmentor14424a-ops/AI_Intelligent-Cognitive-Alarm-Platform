"""
Database Initialization & Seeding Script
Creates Database tables and populates default demo accounts (Admin, Coach, User).
"""
import sys
import os

# Add root project directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, Base
from models import User
from security import hash_password

DEFAULT_DEMO_ACCOUNTS = [
    {
        "name": "Chief Administrator",
        "email": "admin@alarm.com",
        "password": "password123",
        "role": "ADMIN",
        "provider": "LOCAL"
    },
    {
        "name": "Dr. Sarah Jenkins",
        "email": "coach@alarm.com",
        "password": "password123",
        "role": "COACH",
        "provider": "LOCAL"
    },
    {
        "name": "Alex Mercer",
        "email": "user@alarm.com",
        "password": "password123",
        "role": "USER",
        "provider": "LOCAL"
    },
    {
        "name": "John Doe",
        "email": "john@gmail.com",
        "password": "Password@123",
        "role": "USER",
        "provider": "LOCAL"
    }
]

def init_db():
    print("Connecting to Database and creating tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables created successfully.")

    db = SessionLocal()
    try:
        print("Seeding default demo accounts (Admin, Wellness Coach, User)...")
        for acc in DEFAULT_DEMO_ACCOUNTS:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                demo_user = User(
                    name=acc["name"],
                    email=acc["email"],
                    password=hash_password(acc["password"]),
                    role=acc["role"],
                    provider=acc["provider"]
                )
                db.add(demo_user)
                print(f"[OK] Created {acc['role']} account: {acc['email']}")
            else:
                print(f"[OK] Account {acc['email']} ({acc['role']}) already exists.")
        
        db.commit()
        print("[OK] All demo accounts seeded successfully!")

    except Exception as e:
        print(f"Error during database seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
