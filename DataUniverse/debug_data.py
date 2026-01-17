import asyncio
import sys
import os

sys.path.append(os.getcwd())

from backend.database import AsyncSessionLocal
from backend.models import DataSource, ETLJob
from sqlalchemy import select

async def list_all():
    async with AsyncSessionLocal() as session:
        # Check Sources
        result = await session.execute(select(DataSource))
        sources = result.scalars().all()
        print(f"--- Data Sources ({len(sources)}) ---")
        for s in sources:
            print(f"ID: {s.id}, Name: {s.name}, Type: {s.type}")
            
        # Check Jobs
        result = await session.execute(select(ETLJob))
        jobs = result.scalars().all()
        print(f"\n--- ETL Jobs ({len(jobs)}) ---")
        for j in jobs:
            print(f"ID: {j.id}, Name: {j.name}, Status: {j.status}, Source: {j.source_id}, Target: {j.target_id}")

if __name__ == "__main__":
    asyncio.run(list_all())
