from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from ..database import get_db
from ..models import TransformTemplate
from ..schemas import TransformTemplateCreate, TransformTemplateResponse

router = APIRouter(prefix="/transform", tags=["transform"])

@router.post("/templates", response_model=TransformTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(template: TransformTemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new transformation template"""
    new_template = TransformTemplate(**template.dict())
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
    """Get transformation templates for a specific data source"""
    result = await db.execute(select(TransformTemplate).filter(TransformTemplate.source_id == source_id))
    return result.scalars().all()

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
