from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Dict, Any
from ..database import get_db
from ..models import LoaderService, MapperService, ExtractorService, TransformTemplate, DataSource
from ..schemas import LoaderServiceCreate, LoaderServiceResponse
from ..utils.file_readers import FileReader
from ..utils.table_creator import TableCreator
from ..utils.etl_engine import ETLEngine
from pathlib import Path
import logging

router = APIRouter(prefix="/loaders", tags=["loaders"])
logger = logging.getLogger(__name__)

@router.post("/{loader_id}/execute")
async def execute_loader_service(loader_id: int, db: AsyncSession = Depends(get_db)):
    """
    Execute a Loader Service:
    1. Fetch Loader -> Mapper -> Extractor & Template
    2. Extract data from Source
    3. Apply Mappings (Renames)
    4. Apply Template Logic (Splits, Casts, Rules)
    5. Load into Target Entity
    """
    try:
        # Load joined data
        result = await db.execute(
            select(LoaderService)
            .options(
                joinedload(LoaderService.mapper_service)
                .joinedload(MapperService.extractor)
                .joinedload(ExtractorService.source),
                joinedload(LoaderService.mapper_service)
                .joinedload(MapperService.template)
                .joinedload(TransformTemplate.target_source)
            )
            .filter(LoaderService.id == loader_id)
        )
        loader = result.scalar_one_or_none()

        if not loader:
            raise HTTPException(status_code=404, detail="Loader Service not found")

        mapper = loader.mapper_service
        extractor = mapper.extractor
        template = mapper.template
        source_ds = extractor.source
        target_ds = template.target_source or source_ds # Fallback to source if no target defined

        # 1. Extraction Details
        file_path = source_ds.connection_details.get("Source File Path")
        file_type = source_ds.connection_details.get("Source File Type", "csv")
        file_name = source_ds.connection_details.get("Source File Name")
        
        if not file_path or not file_name:
            raise HTTPException(status_code=400, detail="Source file details missing in Extractor Source")
        
        full_path = Path(file_path) / file_name
        
        # Add extension if missing
        if not full_path.suffix and file_type:
            ext = f".{file_type.lower()}"
            if not file_name.lower().endswith(ext):
                full_path = full_path.with_suffix(ext)
        
        # 2. Target Details
        table_name = loader.target_entity_name or template.target_entity_name or f"load_{loader_id}"
        table_name = TableCreator._sanitize_table_name(table_name)
        
        logger.info(f"Starting Loader {loader.name} (ID: {loader_id})")
        logger.info(f"Source: {full_path} -> Target Table: {table_name}")

        # 3. Execution (Chunked)
        chunks = FileReader.get_iterator(str(full_path), file_type, chunk_size=10000)
        
        total_rows = 0
        first_chunk = True
        columns = []

        for df in chunks:
            # A) Apply Column Mappings (Renames) from Mapper
            mapping_list = mapper.mapping_config.get("mappings", []) if mapper.mapping_config else []
            df = ETLEngine.apply_column_mappings(df, mapping_list)

            # B) Apply Transformations/Rules from Template
            df = ETLEngine.apply_template_config(df, template.config or {})

            if first_chunk:
                # C) Build Schema and Create Table
                # For simplicity, we'll infer from the transformed DF
                schema = FileReader._infer_schema(df)
                columns = list(schema.keys())
                
                # Check for types in template config to override inferred types
                for col_cfg in (template.config or {}).get("columns", []):
                    c_name = col_cfg.get("name")
                    c_type = (col_cfg.get("constraints") or {}).get("pg_type")
                    if c_name in schema and c_type:
                        # Auto-promote INTEGER to BIGINT for safety with large datasets
                        if c_type == "INTEGER":
                            c_type = "BIGINT"
                        schema[c_name] = c_type

                await TableCreator.create_table(
                    db=db,
                    table_name=table_name,
                    schema=schema,
                    drop_if_exists=True # Using drop_if_exists for adhoc loads as requested
                )
                first_chunk = False

            # D) Insert Data
            data_list = df.to_dict('records')
            insert_result = await TableCreator.insert_data(
                db=db,
                table_name=table_name,
                data=data_list
            )
            total_rows += insert_result["inserted_rows"]

        # Update loader status (optional enhancement)
        loader.status = "completed"
        await db.commit()

        return {
            "success": True,
            "message": f"Successfully loaded {total_rows} rows into {table_name}",
            "rows_inserted": total_rows,
            "table_name": table_name,
            "columns": columns
        }

    except Exception as e:
        logger.error(f"Loader execution failed: {str(e)}")
        if loader:
            loader.status = "failed"
            await db.commit()
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.post("/", response_model=LoaderServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_loader_service(loader: LoaderServiceCreate, db: AsyncSession = Depends(get_db)):
    """Register a new Loader Service that uses a specific Mapper Service"""
    # Verify mapper service exists
    result = await db.execute(select(MapperService).filter(MapperService.id == loader.mapper_service_id))
    mapper = result.scalar_one_or_none()
    if not mapper:
        raise HTTPException(status_code=404, detail="Mapper Service not found")

    new_loader = LoaderService(**loader.dict())
    db.add(new_loader)
    await db.commit()
    await db.refresh(new_loader)
    return new_loader

@router.get("/", response_model=List[LoaderServiceResponse])
async def list_loader_services(db: AsyncSession = Depends(get_db)):
    """List all registered Loader Services"""
    result = await db.execute(select(LoaderService))
    return result.scalars().all()

@router.get("/{loader_id}", response_model=LoaderServiceResponse)
async def get_loader_service(loader_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific Loader Service"""
    result = await db.execute(select(LoaderService).filter(LoaderService.id == loader_id))
    loader = result.scalar_one_or_none()
    if not loader:
        raise HTTPException(status_code=404, detail="Loader Service not found")
    return loader

@router.delete("/{loader_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loader_service(loader_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a Loader Service"""
    result = await db.execute(select(LoaderService).filter(LoaderService.id == loader_id))
    loader = result.scalar_one_or_none()
    if not loader:
        raise HTTPException(status_code=404, detail="Loader Service not found")
    
    await db.delete(loader)
    await db.commit()
    return None
