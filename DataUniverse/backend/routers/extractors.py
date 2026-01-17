import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ..database import get_db
from ..models import DataSource, ExtractorService
from ..schemas import ExtractorServiceCreate, ExtractorServiceResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/extractors", tags=["extractors"])

@router.post("/analyze/{source_id}")
async def analyze_source(source_id: int, db: AsyncSession = Depends(get_db)):
    """Analyze a data source and return metadata like record count and schema."""
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    details = source.connection_details
    logger.info(f"Analyzing source {source_id} (Type: {source.source_type})")

    if source.source_type == "Flat Files":
        raw_file_name = details.get("Source File Name")
        file_path = details.get("Source File Path")
        file_ext = details.get("Source File Type") # Likely 'csv', 'parquet', etc.
        
        if not raw_file_name or not file_path:
            raise HTTPException(status_code=400, detail="Missing configuration: 'Source File Name' and 'Source File Path' are required.")
            
        # Refined name handling: concatenate with extension (forced to lowercase) if not present
        file_name = raw_file_name
        if file_ext:
            clean_ext = file_ext.lower().strip('.')
            if not file_name.lower().endswith(f".{clean_ext}"):
                file_name = f"{file_name}.{clean_ext}"
            
        # Standardize path joining
        full_path = os.path.join(file_path, file_name)
        
        if not os.path.exists(full_path):
             logger.error(f"File not found at: {full_path}")
             raise HTTPException(
                 status_code=404, 
                 detail=f"File not found at: {full_path}. Please verify the path and ensure the filename and extension are correct."
             )
             
        try:
            # Read a sample for schema
            logger.info(f"Reading CSV sample from {full_path}")
            # Identify actual extension for pandas read
            ext = os.path.splitext(full_path)[1].lower()
            
            if ext == '.csv':
                df = pd.read_csv(full_path, nrows=10).convert_dtypes()
            elif ext == '.parquet':
                 df = pd.read_parquet(full_path).head(10).convert_dtypes()
            else:
                 # Fallback to CSV if extension is missing/unknown but user says it's flat
                 df = pd.read_csv(full_path, nrows=10).convert_dtypes()
            
            # Record count - efficient for large files
            logger.info("Calculating record count")
            total_records = 0
            if ext == '.csv':
                with open(full_path, 'rb') as f:
                    total_records = sum(1 for line in f) - 1 # Subtract header
            elif ext == '.parquet':
                import pyarrow.parquet as pq
                meta = pq.read_metadata(full_path)
                total_records = meta.num_rows
            
            schema = []
            for col, dtype in df.dtypes.items():
                schema.append({
                    "name": col,
                    "type": str(dtype)
                })
            
            # File size
            file_size_bytes = os.path.getsize(full_path)
            if file_size_bytes > 1024**3:
                size_str = f"{file_size_bytes / (1024**3):.2f} GB"
            else:
                size_str = f"{file_size_bytes / (1024**2):.2f} MB"
            
            return {
                "records_count": total_records,
                "schema": schema,
                "data_volume": size_str,
                "full_path": full_path
            }
        except Exception as e:
            logger.error(f"Error reading source {full_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Data Engine Error: {str(e)}")
            
    return {
        "records_count": 0,
        "schema": [],
        "data_volume": "N/A",
        "message": f"Deep analysis for {source.source_type} is processing in background..."
    }

@router.post("/", response_model=ExtractorServiceResponse)
async def create_extractor(extractor: ExtractorServiceCreate, db: AsyncSession = Depends(get_db)):
    logger.info(f"Creating extractor service: {extractor.name}")
    new_extractor = ExtractorService(**extractor.dict())
    db.add(new_extractor)
    await db.commit()
    await db.refresh(new_extractor)
    return new_extractor

@router.get("/{extractor_id}", response_model=ExtractorServiceResponse)
async def get_extractor(extractor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExtractorService).filter(ExtractorService.id == extractor_id))
    extractor = result.scalar_one_or_none()
    if not extractor:
        raise HTTPException(status_code=404, detail="Extractor not found")
    return extractor

@router.put("/{extractor_id}", response_model=ExtractorServiceResponse)
async def update_extractor(extractor_id: int, extractor_update: ExtractorServiceCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExtractorService).filter(ExtractorService.id == extractor_id))
    extractor = result.scalar_one_or_none()
    if not extractor:
        raise HTTPException(status_code=404, detail="Extractor not found")
    
    for key, value in extractor_update.dict().items():
        setattr(extractor, key, value)
    
    await db.commit()
    await db.refresh(extractor)
    return extractor

@router.get("/", response_model=List[ExtractorServiceResponse])
async def list_extractors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExtractorService))
    return result.scalars().all()

@router.delete("/{extractor_id}")
async def delete_extractor(extractor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExtractorService).filter(ExtractorService.id == extractor_id))
    extractor = result.scalar_one_or_none()
    if not extractor:
        raise HTTPException(status_code=404, detail="Extractor not found")
    
    await db.delete(extractor)
    await db.commit()
    return {"message": "Extractor deleted successfully"}
