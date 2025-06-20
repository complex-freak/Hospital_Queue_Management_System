"""update_appointments_for_reason

Revision ID: 99955f171d45
Revises: be85d335a830
Create Date: 2025-06-20 11:23:00.326479

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99955f171d45'
down_revision: Union[str, None] = 'be85d335a830'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
