import asyncio
import sqlalchemy as sa
from database import engine
import logging

# Disable all logging
logging.disable(logging.CRITICAL)

async def check_alembic_version():
    async with engine.connect() as conn:
        try:
            # Check the alembic_version table
            result = await conn.execute(sa.text("SELECT version_num FROM alembic_version"))
            version = result.scalar()
            print(f"\nCurrent Alembic version: {version}")
        except Exception as e:
            print(f"\nError checking Alembic version: {e}")

if __name__ == "__main__":
    asyncio.run(check_alembic_version()) 