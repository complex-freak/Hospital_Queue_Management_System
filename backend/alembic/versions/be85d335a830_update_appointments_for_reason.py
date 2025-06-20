"""update_appointments_for_reason

Revision ID: be85d335a830
Revises: 222cc60d5f70
Create Date: 2025-06-20 11:20:58.751700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be85d335a830'
down_revision: Union[str, None] = '222cc60d5f70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
