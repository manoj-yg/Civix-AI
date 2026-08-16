"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-13 07:50:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Enable PostGIS extension if available
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

def downgrade() -> None:
    pass
