from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Log the database URL (without credentials) for debugging
db_url_parts = settings.DATABASE_URL.split('@')
if len(db_url_parts) > 1:
    logger.info(f"Connecting to database: {db_url_parts[1]}")
else:
    logger.warning("Database URL format is unexpected. Please check your .env file.")

try:
    # Create async engine with connection pooling
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
        poolclass=QueuePool,
    )
    
    # Create sessionmaker for async sessions
    AsyncSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    logger.info("Database connection pool initialized successfully")
    
except Exception as e:
    logger.error(f"Error initializing database connection: {str(e)}")
    raise

async def get_db() -> AsyncSession:
    """
    Dependency function to get a database session.
    
    Usage:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_db)):
            # use db session
            
    Returns:
        AsyncSession: A SQLAlchemy async session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            await session.close() 