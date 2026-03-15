import asyncio
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Use strings here that can connect to the local postgres docker instance
# Normally we'd use a test specific DB url. We'll reuse the default for integration testing.

TEST_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/biscraper"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    # Ideally normally call engine.begin() and run metadata.create_all() here.
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def async_session(async_engine) -> AsyncSession:
    async_session_maker = async_sessionmaker(async_engine, expire_on_commit=False)
    
    async with async_session_maker() as session:
        yield session
        # Normally would have logic to rollback a transaction here to clean test data state
        # await session.rollback()
