from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
import re
import ssl

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zealthy.db")

# Neon / Heroku return postgres:// — convert to pg8000 dialect
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+pg8000" not in DATABASE_URL and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# pg8000 needs SSL via connect_args — strip SSL params from the URL
if "pg8000" in DATABASE_URL:
    DATABASE_URL = re.sub(r'[?&]sslmode=[^&&#]*', '', DATABASE_URL)
    DATABASE_URL = re.sub(r'[?&]channel_binding=[^&&#]*', '', DATABASE_URL)
    DATABASE_URL = re.sub(r'\?$', '', DATABASE_URL)   # clean trailing ?
    DATABASE_URL = re.sub(r'\?&', '?', DATABASE_URL)  # clean ?& artifact
    ssl_context = ssl.create_default_context()
    connect_args = {"ssl_context": ssl_context}
elif "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
