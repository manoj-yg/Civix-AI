import logging
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.core.config import settings

logger = logging.getLogger("civix_backend")

class Base(DeclarativeBase):
    pass

db_url = settings.get_database_url()

_cached_engine = None

def init_engine():
    global _cached_engine
    if _cached_engine is not None:
        return _cached_engine

    db_dir = settings.ROOT_DIR if hasattr(settings, "ROOT_DIR") else Path(__file__).resolve().parent.parent.parent.parent
    local_db_path = Path(db_dir) / "temp" / "civix_ai.db"
    local_db_path.parent.mkdir(parents=True, exist_ok=True)

    # Check for direct local SQLite usage
    if getattr(settings, "USE_SQLITE", False) or "sqlite" in db_url:
        _cached_engine = create_sqlite_engine(local_db_path)
        return _cached_engine

    if "postgresql" in db_url:
        try:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=300,
                connect_args={"connect_timeout": 6}
            )
            with eng.connect() as conn:
                pass
            logger.info("Successfully connected to Neon Cloud PostgreSQL database.")
            _cached_engine = eng
            return _cached_engine
        except Exception as e:
            logger.info(f"Neon Cloud connection timed out or offline ({e}). Using local SQLite fallback database.")

    _cached_engine = create_sqlite_engine(local_db_path)
    return _cached_engine

def create_sqlite_engine(local_db_path):
    eng = create_engine(
        f"sqlite:///{local_db_path}",
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
    
    # Safe auto-migration for PostgreSQL & SQLite
    from sqlalchemy import text, inspect
    inspector = inspect(engine)
    if "inspections" in inspector.get_table_names():
        existing_cols = [c["name"] for c in inspector.get_columns("inspections")]
        for col, col_type in [
            ("assigned_engineer", "VARCHAR(255)"),
            ("work_notes", "TEXT"),
            ("resolution_notes", "TEXT"),
            ("resolved_at", "TIMESTAMP")
        ]:
            if col not in existing_cols:
                try:
                    with engine.connect() as conn:
                        conn.execute(text(f"ALTER TABLE inspections ADD COLUMN {col} {col_type};"))
                        conn.commit()
                except Exception:
                    pass
except Exception as e:
    logger.warning(f"Metadata table creation warning: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
