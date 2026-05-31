"""User profile REST API."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.models.user_profile import UserProfile
from app.schemas.profile import ProfileCreate, ProfileUpdate, NameUpdate, ProfileResponse

router = APIRouter()


@router.get("", response_model=ProfileResponse | None)
async def get_profile(db: AsyncSession = Depends(get_db)):
    """Get the current user profile (single-user app — first row)."""
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalars().first()
    if not profile:
        return None
    return ProfileResponse.model_validate(profile)


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(data: ProfileCreate, db: AsyncSession = Depends(get_db)):
    """Create or update the user profile."""
    result = await db.execute(select(UserProfile).limit(1))
    existing = result.scalars().first()

    if existing:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        await db.flush()
        await db.refresh(existing)
        return ProfileResponse.model_validate(existing)

    profile = UserProfile(**data.model_dump())
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return ProfileResponse.model_validate(profile)


@router.patch("", response_model=ProfileResponse)
async def update_profile(data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    """Update the user profile."""
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found. Create one first.")

    for key, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(profile, key, value)
    await db.flush()
    await db.refresh(profile)
    return ProfileResponse.model_validate(profile)


@router.put("/name")
async def update_name(data: NameUpdate, db: AsyncSession = Depends(get_db)):
    """Update just the display name."""
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found.")
    profile.display_name = data.name
    await db.flush()
    return {"name": data.name}
