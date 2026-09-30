from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Event, User, Announcement
from app.schemas import EventCreate, EventUpdate, EventResponse, AnnouncementCreate, AnnouncementResponse
from app.auth import get_current_user, require_role
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    current_user: User = Depends(require_role("ORGANIZER")),
    db: AsyncSession = Depends(get_db)
):
    if event_in.registration_deadline >= event_in.event_date:
        raise HTTPException(status_code=400, detail="Registration deadline must precede the event date.")

    event = Event(
        organizer_id=current_user.user_id,
        title=event_in.title,
        description=event_in.description,
        event_date=event_in.event_date,
        venue=event_in.venue,
        online_link=event_in.online_link,
        max_capacity=event_in.max_capacity,
        registration_deadline=event_in.registration_deadline
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@router.get("/", response_model=List[EventResponse])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.event_date.asc()))
    return result.scalars().all()

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(require_role("ORGANIZER")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Event).where(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify this event.")

    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    
    # Notify clients in real time of event change
    await ws_manager.broadcast(event_id, {
        "event_type": "EVENT_UPDATED",
        "title": event.title,
        "venue": event.venue,
        "status": event.status
    })
    return event

@router.post("/{event_id}/announcements", response_model=AnnouncementResponse)
async def post_announcement(
    event_id: str,
    announcement_in: AnnouncementCreate,
    current_user: User = Depends(require_role("ORGANIZER")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Event).where(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized")

    announcement = Announcement(
        event_id=event_id,
        title=announcement_in.title,
        message=announcement_in.message
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    await ws_manager.broadcast(event_id, {
        "event_type": "NEW_ANNOUNCEMENT",
        "title": announcement.title,
        "message": announcement.message,
        "created_at": announcement.created_at.isoformat()
    })
    return announcement