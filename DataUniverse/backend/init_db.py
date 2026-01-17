"""
Database initialization script for DataUniverse
Creates the data_sources table and other required tables
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine
from database import DATABASE_URL, Base
from models import DataSource, ETLJob, Document

async def init_database():
    """Initialize database tables"""
    print("Connecting to database...")
    print(f"Database URL: {DATABASE_URL}")
    
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    try:
        print("\nCreating tables...")
        async with engine.begin() as conn:
            # Drop all tables (use with caution in production!)
            await conn.run_sync(Base.metadata.drop_all)
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        
        print("\n✅ Database tables created successfully!")
        print("\nCreated tables:")
        print("  - data_sources")
        print("  - etl_jobs")
        print("  - documents")
        
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("=" * 60)
    print("DataUniverse Database Initialization")
    print("=" * 60)
    asyncio.run(init_database())
