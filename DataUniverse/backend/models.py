from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

try:
    from .database import Base
except ImportError:
    from database import Base

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    source_type = Column(String)  # RDBMS, NO SQL, Flat Files, Datalake/Lakehouse, API, Websites Scrap, External File Format, External_Sources
    type = Column(String)  # Backward compatibility: postgres, mysql, csv, etc.
    connection_details = Column(JSON) # Structured config based on source_type
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ETLJob(Base):
    __tablename__ = "etl_jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    target_id = Column(Integer, ForeignKey("data_sources.id"))
    mapping_config = Column(JSON) # The schema mapping definition
    yaml_config = Column(Text) # Declarative YAML config
    status = Column(String, default="pending") # pending, running, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("DataSource", foreign_keys=[source_id])
    target = relationship("DataSource", foreign_keys=[target_id])

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    content = Column(Text)
    embedding = Column(Vector(1536)) # Assuming OpenAI Ada-002 size, adjustable
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TransformTemplate(Base):
    __tablename__ = "transform_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    description = Column(String, nullable=True)
    target_type = Column(String, nullable=True)
    target_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    target_entity_type = Column(String, nullable=True) # single_table, multi_table, api, adhoc
    target_entity_name = Column(String, nullable=True)
    # config stores columns, types, quality rules, and business rules
    # Format: { "columns": [{ "name": "id", "type": "number", "quality_rules": {...}, "business_rules": [...] }] }
    config = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    target_source = relationship("DataSource", foreign_keys=[target_source_id])


class ExtractorService(Base):
    __tablename__ = "extractor_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    status = Column(String, default="active")
    last_run = Column(DateTime(timezone=True), nullable=True)
    data_volume = Column(String, nullable=True)
    records_count = Column(Integer, default=0)
    schema_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("DataSource")

class MapperService(Base):
    __tablename__ = "mapper_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    extractor_id = Column(Integer, ForeignKey("extractor_services.id"))
    template_id = Column(Integer, ForeignKey("transform_templates.id"))
    mapping_config = Column(JSON) # Detailed column level mappings
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    extractor = relationship("ExtractorService")
    template = relationship("TransformTemplate")

class LoaderService(Base):
    __tablename__ = "loader_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    mapper_service_id = Column(Integer, ForeignKey("mapper_services.id"))
    target_entity_name = Column(String, nullable=True)
    status = Column(String, default="active")
    load_type = Column(String, default="batch") # batch, streaming
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mapper_service = relationship("MapperService")
