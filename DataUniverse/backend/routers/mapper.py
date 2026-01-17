from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List, Dict, Any
from ..database import get_db
from ..models import DataSource, ETLJob
from ..schemas import ETLJobCreate, ETLJobResponse

router = APIRouter(prefix="/mapper", tags=["mapper"])

@router.get("/sources", response_model=List[Dict[str, Any]])
async def get_available_sources(db: AsyncSession = Depends(get_db)):
    """Get all available data sources for mapping"""
    result = await db.execute(select(DataSource))
    sources = result.scalars().all()
    return [{"id": s.id, "name": s.name, "type": s.type, "source_type": s.source_type} for s in sources]

@router.get("/schema/{source_id}")
async def get_source_schema(source_id: int, db: AsyncSession = Depends(get_db)):
    """Get schema/fields from a data source"""
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # For now, return mock schema based on source type
    # In production, this would introspect actual database/file schemas
    if source.source_type == "RDBMS" or source.source_type == "NO SQL":
        # Mock database schema
        return {
            "source_id": source_id,
            "source_name": source.name,
            "fields": [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "string"},
                {"name": "email", "type": "string"},
                {"name": "created_at", "type": "timestamp"}
            ]
        }
    elif source.source_type == "Flat Files":
        # Mock file schema
        return {
            "source_id": source_id,
            "source_name": source.name,
            "fields": [
                {"name": "column_1", "type": "string"},
                {"name": "column_2", "type": "string"},
                {"name": "column_3", "type": "number"}
            ]
        }
    else:
        # Generic schema
        return {
            "source_id": source_id,
            "source_name": source.name,
            "fields": [
                {"name": "field_1", "type": "string"},
                {"name": "field_2", "type": "string"}
            ]
        }

@router.post("/mapping", response_model=ETLJobResponse)
async def create_mapping(job: ETLJobCreate, db: AsyncSession = Depends(get_db)):
    """Create a new ETL mapping job"""
    new_job = ETLJob(**job.dict())
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job

@router.get("/mappings", response_model=List[ETLJobResponse])
async def get_all_mappings(db: AsyncSession = Depends(get_db)):
    """Get all ETL mapping jobs"""
    result = await db.execute(select(ETLJob))
    return result.scalars().all()
