"""add_bio_education_experience_to_doctor

Revision ID: e2618bd275c7
Revises: 36b6e8a2d415
Create Date: 2025-07-03 06:38:44.336050

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2618bd275c7'
down_revision: Union[str, None] = '36b6e8a2d415'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
