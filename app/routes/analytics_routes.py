from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models import Event, RSVP
from app.schemas import AnalyticsResponse

router = APIRouter(prefix="/api/events", tags=["Analytics"])

@router.get("/{event_id}/analytics", response_model=AnalyticsResponse)
async def get_event_analytics(event_id: str, db: AsyncSession = Depends(get_db)):
    event = (await db.execute(select(Event).where(Event.event_id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    going = (await db.execute(select(func.sum(RSVP.guests + 1)).where(RSVP.event_id == event_id, RSVP.status == "GOING"))).scalar() or 0
    maybe = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "MAYBE"))).scalar() or 0
    not_going = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "NOT_GOING"))).scalar() or 0
    waitlist = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "WAITLISTED"))).scalar() or 0

    total = going + maybe + not_going + waitlist
    utilization = round((going / event.max_capacity) * 100, 2) if event.max_capacity > 0 else 0.0

    return AnalyticsResponse(
        event_id=event_id,
        max_capacity=event.max_capacity,
        going_count=going,
        maybe_count=maybe,
        not_going_count=not_going,
        waitlist_count=waitlist,
        total_responses=total,
        capacity_utilization_pct=min(utilization, 100.0),
        is_full=going >= event.max_capacity
    )