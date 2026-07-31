import datetime
from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base

class User(Base):
    """
    User Model matching PostgreSQL table design:
    - id: Primary Key
    - name: User Name
    - email: Unique Email
    - password: Encrypted Password (BCrypt)
    - role: USER / Wellness Coach / Administrator
    - provider: LOCAL or GOOGLE
    - created_at: Creation Timestamp
    - updated_at: Update Timestamp
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="USER")
    provider = Column(String(50), nullable=False, default="LOCAL")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}', role='{self.role}')>"
