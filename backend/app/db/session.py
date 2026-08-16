import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.core.config import settings

logger = logging.getLogger("civix_backend")

class Base(DeclarativeBase):
    pass

db_url = settings.get_database_url()

def init_engine():
    if "postgresql" in db_url:
        try:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                connect_args={"connect_timeout": 2}
            )
            with eng.connect() as conn:
                pass
            logger.info("Successfully connected to PostgreSQL PostGIS database.")
            return eng
        except Exception as e:
            logger.warning(f"PostgreSQL unavailable at {db_url}: {e}. Using SQLite fallback database for local execution.")

    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )

    @event.listens_for(eng, "connect")
    def register_sqlite_functions(dbapi_conn, connection_record):
        spatial_funcs = {
            ("GeomFromEWKT", 1): lambda val: val,
            ("ST_AsText", 1): lambda val: val,
            ("ST_DWithin", 3): lambda a, b, c: 1,
            ("ST_SetSRID", 2): lambda val, srid: val,
            ("ST_MakePoint", 2): lambda x, y: f"POINT({x} {y})",
            ("RecoverGeometryColumn", 5): lambda a, b, c, d, e: 0,
            ("AsEWKB", 1): lambda val: val,
            ("CreateSpatialIndex", 2): lambda a, b: 0,
            ("InitSpatialMetaData", 0): lambda: 0,
            ("InitSpatialMetaData", 1): lambda a: 0,
            ("SpatialIndex", 2): lambda a, b: 0,
            ("DisableSpatialIndex", 2): lambda a, b: 0,
            ("DiscardGeometryColumn", 2): lambda a, b: 0,
        }
        for (name, num_args), fn in spatial_funcs.items():
            try:
                dbapi_conn.create_function(name, num_args, fn)
            except Exception:
                pass

    return eng

engine = init_engine()

# Import models so Base.metadata knows about all tables
try:
    import app.models.models
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Metadata table creation warning: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
