import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import os

# Load .env from the same folder as this file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", 5432),
        database=os.getenv("DB_NAME", "wellspring"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "")
    )
