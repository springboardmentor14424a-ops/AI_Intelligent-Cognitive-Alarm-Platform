"""
Seeds three demo accounts (Admin / Wellness Coach / Standard User) on server
startup so the "Quick Demo Login" buttons always work without anyone having
to register first. Safe to call every startup — it only creates accounts
that don't already exist yet.
"""
from sqlalchemy.orm import Session

from app import models, auth

DEMO_ACCOUNTS = [
    {"name": "Demo Admin", "email": "demo.admin@cognitivealarm.dev", "role": "admin"},
    {"name": "Demo Wellness Coach", "email": "demo.coach@cognitivealarm.dev", "role": "wellness_coach"},
    {"name": "Demo User", "email": "demo.user@cognitivealarm.dev", "role": "user"},
]
DEMO_PASSWORD = "demo1234"  # fine for a local dev demo account; never do this in production


def seed_demo_accounts(db: Session) -> None:
    for acc in DEMO_ACCOUNTS:
        existing = db.query(models.User).filter(models.User.email == acc["email"]).first()
        if existing:
            continue
        user = models.User(
            name=acc["name"],
            email=acc["email"],
            hashed_password=auth.hash_password(DEMO_PASSWORD),
            role=acc["role"],
            is_demo=True,
        )
        db.add(user)
    db.commit()
