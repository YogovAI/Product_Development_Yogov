from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
import yaml
from ..database import get_db
from ..models import TransformTemplate
from ..schemas import TransformTemplateCreate, TransformTemplateResponse

router = APIRouter(prefix="/transform", tags=["transform"])


def _build_schema_from_columns(columns: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build a JSON-serializable schema description from template columns.
    This is then also rendered to YAML for mapper / ETL services.
    """
    schema_cols = []
    for col in columns or []:
        if not col:
            continue
        name = col.get("name")
        if not name:
            continue
        constraints = (col.get("constraints") or {})
        schema_cols.append(
            {
                "name": name,
                "data_type": col.get("data_type"),
                "pg_type": constraints.get("pg_type"),
                "primary_key": bool(
                    constraints.get("primary_key")
                    or (col.get("quality_rules") or {}).get("primary_key")
                ),
                "not_null": bool(
                    constraints.get("not_null")
                    or (col.get("quality_rules") or {}).get("not_null")
                ),
            }
        )
    return {"columns": schema_cols}


def _augment_config_with_schema(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Take existing template.config, derive a normalized JSON schema + YAML,
    and store as config['schema_json'] and config['schema_yaml'].

    Works for both:
    - single_table: columns came from DB
    - adhoc: columns came from extractor services
    """
    cfg = dict(config or {})
    columns = (cfg.get("columns") or [])
    schema_json = _build_schema_from_columns(columns)
    schema_yaml = yaml.safe_dump(schema_json, sort_keys=False)
    cfg["schema_json"] = schema_json
    cfg["schema_yaml"] = schema_yaml
    return cfg

@router.post("/templates", response_model=TransformTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(template: TransformTemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new transformation template"""
    data = template.dict()
    data["config"] = _augment_config_with_schema(data.get("config") or {})
    new_template = TransformTemplate(**data)
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template

@router.get("/templates", response_model=List[TransformTemplateResponse])
async def get_templates(db: AsyncSession = Depends(get_db)):
    """Get all transformation templates"""
    result = await db.execute(select(TransformTemplate))
    return result.scalars().all()

@router.get("/templates/{template_id}", response_model=TransformTemplateResponse)
async def get_template_by_id(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific transformation template by ID"""
    result = await db.execute(select(TransformTemplate).filter(TransformTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/templates/source/{source_id}", response_model=List[TransformTemplateResponse])
async def get_templates_by_source(source_id: int, db: AsyncSession = Depends(get_db)):
    """Get transformation templates for a specific target data source"""
    result = await db.execute(select(TransformTemplate).filter(TransformTemplate.target_source_id == source_id))
    return result.scalars().all()

@router.put("/templates/{template_id}", response_model=TransformTemplateResponse)
async def update_template(template_id: int, template: TransformTemplateCreate, db: AsyncSession = Depends(get_db)):
    """Update an existing transformation template"""
    result = await db.execute(select(TransformTemplate).filter(TransformTemplate.id == template_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update fields
    data = template.dict()
    data["config"] = _augment_config_with_schema(data.get("config") or {})
    for k, v in data.items():
        setattr(existing, k, v)

    await db.commit()
    await db.refresh(existing)
    return existing

@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a transformation template"""
    result = await db.execute(select(TransformTemplate).filter(TransformTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.commit()
    return None

import os
import json
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

class RulesGenerationRequest(BaseModel):
    text: str

@router.post("/generate_rules")
async def generate_business_rules(request: RulesGenerationRequest):
    """
    Real AI endpoint using OpenAI to convert English natural language into structured JSON business rules.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return [{"type": "error", "params": {"message": "OPENAI_API_KEY not configured in backend environment."}}]

    client = OpenAI(api_key=api_key)

    system_prompt = """
    You are a Data Engineering AI assistant. Your task is to convert English descriptions of data transformation rules into a list of structured JSON objects.
    
    Supported Rule Types and Formats:
    1. Rename column: {"type": "Rename column", "params": {"column": "old_name", "new_name": "new_name"}}
    2. Cast datatype: {"type": "Cast datatype", "params": {"column": "col", "target_type": "INTEGER|TEXT|DOUBLE PRECISION|TIMESTAMP|BOOLEAN"}}
    3. String Ops: {"type": "Trim / Lowercase / Uppercase", "params": {"column": "col", "operation": "trim|lowercase|uppercase"}}
    4. Replace: {"type": "Replace values", "params": {"column": "col", "find": "val", "replace": "new_val"}}
    5. Conditional: {"type": "Conditional rule (if/else)", "params": {"column": "col", "condition": "logic", "true_val": "x", "false_val": "y"}}
    6. Lookup: {"type": "Lookup rule (join with master table)", "params": {"column": "source_key", "master_table": "tbl", "master_key": "m_key", "fetch_col": "target"}}
    7. Derived: {"type": "Derived column", "params": {"column": "new_col", "expression": "sql_like_expression"}}
    8. Drop: {"type": "Dropping columns", "params": {"column": "col_to_drop"}}

    Return ONLY a valid JSON list of these objects. No markdown, no explanations.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o", # or gpt-3.5-turbo
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transform these requirements into JSON rules: {request.text}"}
            ],
            response_format={ "type": "json_object" } if "gpt-4o" in "gpt-4o" else None
        )
        
        content = response.choices[0].message.content
        # OpenAI might return a wrapper object if response_format is used
        parsed = json.loads(content)
        if isinstance(parsed, dict) and "rules" in parsed:
            return parsed["rules"]
        if isinstance(parsed, dict) and not isinstance(parsed, list):
            # If AI returns a single object instead of list, wrap it
            return [parsed]
        return parsed
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return [{"type": "error", "params": {"message": str(e)}}]
