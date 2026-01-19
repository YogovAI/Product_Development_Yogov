from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime

class DataSourceBase(BaseModel):
    name: str
    source_type: Optional[str] = None  # RDBMS, NO SQL, Flat Files, etc.
    type: str # 'file', 'database', 'datalake' - backward compatibility
    connection_details: Dict[str, Any]

class DataSourceCreate(DataSourceBase):
    pass

class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ETLJobBase(BaseModel):
    name: str
    source_id: int
    target_id: int
    mapping_config: Dict[str, Any]
    yaml_config: Optional[str] = None

class ETLJobCreate(ETLJobBase):
    pass

class ETLJobResponse(ETLJobBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    response: str

class TransformTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    description: Optional[str] = None
    target_type: Optional[str] = None
    target_source_id: Optional[int] = None
    target_entity_type: Optional[str] = None
    target_entity_name: Optional[str] = None
    config: Dict[str, Any]

class TransformTemplateCreate(TransformTemplateBase):
    pass

class TransformTemplateResponse(TransformTemplateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExtractorServiceBase(BaseModel):
    name: str
    source_id: int
    status: Optional[str] = "active"
    data_volume: Optional[str] = None
    records_count: Optional[int] = 0
    schema_info: Optional[Any] = None

class ExtractorServiceCreate(ExtractorServiceBase):
    pass

class ExtractorServiceResponse(ExtractorServiceBase):
    id: int
    created_at: datetime
    last_run: Optional[datetime] = None

    class Config:
        from_attributes = True

class MapperServiceBase(BaseModel):
    name: str
    extractor_id: int
    template_id: int
    mapping_config: Dict[str, Any]

class MapperServiceCreate(MapperServiceBase):
    pass

class MapperServiceResponse(MapperServiceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class LoaderServiceBase(BaseModel):
    name: str
    mapper_service_id: int
    target_entity_name: Optional[str] = None
    load_type: Optional[str] = "batch"
    status: Optional[str] = "active"

class LoaderServiceCreate(LoaderServiceBase):
    pass

class LoaderServiceResponse(LoaderServiceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
