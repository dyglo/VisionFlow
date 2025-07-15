"""Add image_data column to files table

Revision ID: add_image_data_column
Revises: 89f67f2f7365
Create Date: 2025-07-15 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_image_data_column'
down_revision = '89f67f2f7365'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add image_data column to files table
    op.add_column('files', sa.Column('image_data', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove image_data column from files table
    op.drop_column('files', 'image_data')
