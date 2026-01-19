from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List, Dict, Any
from ..database import get_db
from ..models import DataSource, ETLJob, MapperService
from ..schemas import (
    ETLJobCreate, 
    ETLJobResponse, 
    MapperServiceCreate, 
    MapperServiceResponse
)

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
    
    # Return empty fields by default, to be filled by the frontend from extractor/template
    return {
        "source_id": source_id,
        "source_name": source.name,
        "fields": []
    }

@router.post("/services", response_model=MapperServiceResponse)
async def create_mapper_service(service: MapperServiceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new Mapper Service"""
    new_svc = MapperService(**service.dict())
    db.add(new_svc)
    await db.commit()
    await db.refresh(new_svc)
    return new_svc

@router.get("/services", response_model=List[MapperServiceResponse])
async def list_mapper_services(db: AsyncSession = Depends(get_db)):
    """List all registered Mapper Services"""
    result = await db.execute(select(MapperService))
    return result.scalars().all()

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
