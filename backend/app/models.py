import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, DateTime
from app.database import Base


class RoleEnum(str, enum.Enum):
    USER = "USER"
    WELLNESS_COACH = "WELLNESS_COACH"
    ADMIN = "ADMIN"


class ProviderEnum(str, enum.Enum):
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # nullable because Google-provider accounts have no local password
    password = Column(String(255), nullable=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.USER, nullable=False)
    provider = Column(Enum(ProviderEnum), default=ProviderEnum.LOCAL, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
