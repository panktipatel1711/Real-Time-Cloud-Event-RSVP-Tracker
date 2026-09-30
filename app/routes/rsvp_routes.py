from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime
from app.database import get_db
from app.models import Event, RSVP, User
from app.schemas import RSVPCreate, RSVPResponse
from app.auth import get_current_user
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api/events", tags=["RSVP"])

@router.post("/{event_id}/rsvp", response_model=RSVPResponse)
async def submit_or_update_rsvp(
    event_id: str,
    rsvp_in: RSVPCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Atomically lock event row to protect against race conditions
    async with db.begin():
        stmt = select(Event).where(Event.event_id == event_id).with_for_update()
        event_res = await db.execute(stmt)
        event = event_res.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        if event.status == "CANCELLED":
            raise HTTPException(status_code=400, detail="Cannot RSVP to a cancelled event.")

        # Check existing RSVP
        rsvp_stmt = select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == current_user.user_id)
        existing_rsvp = (await db.execute(rsvp_stmt)).scalar_one_or_none()

        final_status = rsvp_in.status
        if rsvp_in.status == "GOING":
            # Compute current headcounts atomically
            count_stmt = select(func.sum(RSVP.guests + 1)).where(
                RSVP.event_id == event_id,
                RSVP.status == "GOING"
            )
            if existing_rsvp and existing_rsvp.status == "GOING":
                count_stmt = count_stmt.where(RSVP.rsvp_id != existing_rsvp.rsvp_id)
                
            current_headcount = (await db.execute(count_stmt)).scalar() or 0
            required_seats = 1 + rsvp_in.guests

            if (current_headcount + required_seats) > event.max_capacity:
                final_status = "WAITLISTED"

        if existing_rsvp:
            existing_rsvp.status = final_status
            existing_rsvp.guests = rsvp_in.guests
            target_rsvp = existing_rsvp
        else:
            target_rsvp = RSVP(
                event_id=event_id,
                user_id=current_user.user_id,
                status=final_status,
                guests=rsvp_in.guests
            )
            db.add(target_rsvp)

        await db.flush()

    # Re-read counts for live socket dispatch
    counts = await calculate_metrics(event_id, db)
    await ws_manager.broadcast(event_id, {
        "event_type": "RSVP_UPDATED",
        "counts": counts
    })

    return target_rsvp

@router.delete("/{event_id}/rsvp", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_rsvp(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        stmt = select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == current_user.user_id)
        rsvp = (await db.execute(stmt)).scalar_one_or_none()
        if not rsvp:
            raise HTTPException(status_code=404, detail="No active RSVP found to cancel.")
        
        await db.delete(rsvp)
        await db.flush()

        # Check if a waitlisted attendee can be promoted
        promoted_stmt = select(RSVP).where(
            RSVP.event_id == event_id,
            RSVP.status == "WAITLISTED"
        ).order_by(RSVP.responded_at.asc()).limit(1)
        waitlisted = (await db.execute(promoted_stmt)).scalar_one_or_none()
        if waitlisted:
            waitlisted.status = "GOING"

    counts = await calculate_metrics(event_id, db)
    await ws_manager.broadcast(event_id, {
        "event_type": "RSVP_UPDATED",
        "counts": counts
    })

async def calculate_metrics(event_id: str, db: AsyncSession):
    going = (await db.execute(select(func.sum(RSVP.guests + 1)).where(RSVP.event_id == event_id, RSVP.status == "GOING"))).scalar() or 0
    maybe = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "MAYBE"))).scalar() or 0
    not_going = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "NOT_GOING"))).scalar() or 0
    waitlist = (await db.execute(select(func.count(RSVP.rsvp_id)).where(RSVP.event_id == event_id, RSVP.status == "WAITLISTED"))).scalar() or 0
    return {"going": going, "maybe": maybe, "not_going": not_going, "waitlist": waitlist}