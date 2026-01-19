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

from pydantic import BaseModel

class RulesGenerationRequest(BaseModel):
    text: str

@router.post("/generate_rules")
async def generate_business_rules(request: RulesGenerationRequest):
    """
    Mock AI endpoint to convert English natural language into structured JSON business rules.
    """
    text = request.text.lower()
    rules = []
    
    # Simple heuristic parsing (Mock AI)
    # 1. Split logic: "Split review/helpfulness into review and helpfulness"
    if "split" in text:
        parts = text.split("split")[-1].split("into")
        if len(parts) == 2:
            source = parts[0].strip().replace("/", "") # simplistic cleanup
            targets = [t.strip().replace(" and ", "").replace(".", "") for t in parts[1].split(",")]
            # Handle "and" in the last part
            final_targets = []
            for t in targets:
                if " and " in t:
                    final_targets.extend(t.split(" and "))
                else:
                    final_targets.append(t)
            
            # Clean up targets further
            final_targets = [t.strip().split(" ")[0] for t in final_targets] # take first word if multiple
            
            rules.append({
                "type": "split",
                "source_column": source,
                "delimiter": "/", # Default assumption or need more parsing
                "outputs": [{"name": t, "index": i} for i, t in enumerate(final_targets)]
            })

    # 2. Key logic: "Make business_id primary key"
    if "primary key" in text:
        words = text.split(" ")
        try:
            # excessive simplistic: find word before 'primary' or 'is primary'
            pk_idx = words.index("primary")
            if pk_idx > 0:
                col = words[pk_idx - 1]
                if col in ["is", "make"]: # "business_id is primary..."
                    col = words[pk_idx - 2]
                rules.append({
                    "type": "constraint",
                    "column": col,
                    "constraint": "primary_key",
                    "value": True
                })
        except:
            pass
            
    # 3. Cast logic: "Cast helpfulness to integer"
    if "cast" in text:
        try:
            parts = text.split("cast")[-1].split("to")
            col = parts[0].strip()
            dtype = parts[1].strip().replace(".", "")
            rules.append({
                "type": "cast",
                "column": col,
                "target_type": dtype
            })
        except:
            pass

    # 4. Standard business rules mentioned in prompt example
    # "Split review/helpfulness into review and helpfulness. Make business_id primary key and not null. Cast helpfulness to integer."
    
    # If no rules matched via simple heuristics, return a dummy template so the user sees something
    if not rules:
        rules.append({
            "type": "unknown",
            "description": "Could not parse rule: " + request.text,
            "suggestion": "Try format: 'Split [col] into [a, b]', 'Cast [col] to [type]'"
        })
        
    return rules
