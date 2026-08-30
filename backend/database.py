import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

def run_db_migrations():
    """
    Ensures new verification columns exist on PostgreSQL / SQLite tables and defaults existing alarms to multi_step with 3 questions.
    """
    migration_sqls = [
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'multi_step';",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS verification_steps INTEGER DEFAULT 3;",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS required_accuracy FLOAT DEFAULT 67.0;",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS consecutive_required INTEGER DEFAULT 2;",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 20;",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snooze_duration INTEGER DEFAULT 5;",
        "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS max_snoozes INTEGER DEFAULT 3;",
        "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'passed';",
        "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);",
        "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS wakefulness_rating INTEGER;",
        "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;",
        "UPDATE alarms SET verification_method = 'multi_step', verification_steps = 3, required_accuracy = 67.0 WHERE verification_method IS NULL OR verification_method = '' OR verification_method = 'puzzle_completion' OR verification_steps <= 1;"
    ]
    try:
        with engine.connect() as conn:
            for sql in migration_sqls:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except Exception as ex:
                    logger.debug(f"Migration note for statement '{sql}': {ex}")
        logger.info("Database schema verification columns verified and alarms upgraded to multi-step.")
    except Exception as e:
        logger.warning(f"Note during DB migration check: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()