from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from ..models import DataSource
from ..schemas import DataSourceCreate, DataSourceResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["sources"])

@router.post("/", response_model=DataSourceResponse)
async def create_data_source(source: DataSourceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new data source with source_type and connection details"""
    try:
        logger.info(f"Creating data source: {source.dict()}")
        new_source = DataSource(**source.dict())
        db.add(new_source)
        await db.commit()
        await db.refresh(new_source)
        logger.info(f"Successfully created data source with ID: {new_source.id}")
        return new_source
    except Exception as e:
        logger.error(f"Error creating data source: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{source_id}", response_model=DataSourceResponse)
async def update_data_source(source_id: int, source_update: DataSourceCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    for key, value in source_update.dict().items():
        setattr(source, key, value)
    
    await db.commit()
    await db.refresh(source)
    return source

@router.get("/", response_model=List[DataSourceResponse])
async def list_data_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource))
    return result.scalars().all()

@router.get("/{source_id}", response_model=DataSourceResponse)
async def get_data_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return source

@router.delete("/{source_id}")
async def delete_data_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    await db.delete(source)
    await db.commit()
    return {"message": "Data source deleted successfully"}

@router.post("/{source_id}/test-connection")
async def test_connection(source_id: int, db: AsyncSession = Depends(get_db)):
    """Test connectivity to the data source"""
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Real implementation for Postgres or usage of 'database' type which defaults to postgres for now
    # In a real app, 'database' type should probably store subtype (e.g. engine=postgres) in connection_details
    if source.type == 'postgres' or source.type == 'database':
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text
            
            details = source.connection_details
            # Handle both UI field names and standard field names
            user = details.get('user') or details.get('User Name', 'postgres')
            password = details.get('password') or details.get('User Password', '')
            host = details.get('host') or details.get('Host or IP Address', 'localhost')
            port = details.get('port') or details.get('Port', 5432)
            dbname = details.get('dbname') or details.get('DB Name or Service Name', 'postgres')
            
            # Ensure port is an integer
            if isinstance(port, str):
                port = int(port)
            
            url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{dbname}"
            
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                
            return {"success": True, "message": f"Successfully connected to Source: {source.name}"}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}

    # Mock implementation for other types
    import asyncio
    await asyncio.sleep(1) # Simulate network delay
    
    return {"success": True, "message": f"Successfully connected to {source.name} (Simulated)"}

@router.get("/{source_id}/tables")
async def get_tables(source_id: int, db: AsyncSession = Depends(get_db)):
    """Get tables from the data source"""
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if source.type == 'postgres' or source.type == 'database':
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text
            
            details = source.connection_details
            # Handle both UI field names and standard field names
            user = details.get('user') or details.get('User Name', 'postgres')
            password = details.get('password') or details.get('User Password', '')
            host = details.get('host') or details.get('Host or IP Address', 'localhost')
            port = details.get('port') or details.get('Port', 5432)
            dbname = details.get('dbname') or details.get('DB Name or Service Name', 'postgres')
            
            # Ensure port is an integer
            if isinstance(port, str):
                port = int(port)
            
            url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{dbname}"
            
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                ))
                tables = [row[0] for row in result.fetchall()]
                return tables
        except Exception as e:
            logger.error(f"Failed to fetch tables from postgres: {e}")
            # Fallback to mock if connection fails or return empty list
            return []

    # Mock data for other types
    if source.type in ['mysql', 'mssql']:
        return ["users", "orders", "products", "inventory"]
    elif source.type == 'csv':
        return ["raw_data", "cleaned_data"]
    
    return ["table1", "table2", "table3"]

@router.get("/{source_id}/columns")
async def get_columns(source_id: int, table_name: str, db: AsyncSession = Depends(get_db)):
    """Get columns for a specific table from the data source"""
    result = await db.execute(select(DataSource).filter(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")

    if source.type == 'postgres' or source.type == 'database':
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text
            
            details = source.connection_details
            user = details.get('user', 'postgres')
            password = details.get('password', '')
            host = details.get('host', 'localhost')
            port = details.get('port', 5432)
            dbname = details.get('dbname', 'postgres')
            
            url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{dbname}"
            
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                # Safe parameter binding to avoid SQL injection
                result = await conn.execute(text(
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :table_name"
                ), {"table_name": table_name})
                
                columns = [
                    {
                        "name": row[0],
                        "data_type": row[1],
                        "quality_rules": {
                            "primary_key": False,
                            "not_null": False,
                            "format": ""
                        },
                        "business_rules": []
                    }
                    for row in result.fetchall()
                ]
                return columns
        except Exception as e:
            logger.error(f"Failed to fetch columns from postgres: {e}")
            return []

    # Mock data
    return [
        {"name": "id", "data_type": "integer", "quality_rules": {"primary_key": True, "not_null": True, "format": ""}, "business_rules": []},
        {"name": "created_at", "data_type": "timestamp", "quality_rules": {"primary_key": False, "not_null": True, "format": ""}, "business_rules": ["default=now()"]},
        {"name": "status", "data_type": "varchar", "quality_rules": {"primary_key": False, "not_null": False, "format": ""}, "business_rules": []}
    ]
