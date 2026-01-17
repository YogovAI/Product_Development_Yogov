import asyncio
from sqlalchemy import text
from backend.database import get_db

async def check_connection():
    try:
        async for session in get_db():
            # Check connection
            result = await session.execute(text("SELECT 1"))
            print(f"Connection successful: {result.scalar()}")
            
            # Try to create vector extension
            try:
                await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await session.commit()
                print("Vector extension enabled or already exists.")
            except Exception as e:
                print(f"Failed to enable vector extension: {e}")
                # Check if it exists anyway
                try:
                    res = await session.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
                    if res.scalar():
                        print("Vector extension is present.")
                    else:
                        print("Vector extension is NOT present.")
                except Exception as e2:
                    print(f"Failed to check extension status: {e2}")
            
            return
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(check_connection())
