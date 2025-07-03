import asyncio
import sqlalchemy as sa
from database import engine
import logging

# Disable all logging
logging.disable(logging.CRITICAL)

async def check_tables():
    tables = []
    async with engine.connect() as conn:
        # Get list of tables from PostgreSQL information schema
        result = await conn.execute(sa.text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        ))
        tables = [row[0] for row in result]
    
    print("\nTables in database:")
    for table in tables:
        print(f"- {table}")

if __name__ == "__main__":
    asyncio.run(check_tables()) 