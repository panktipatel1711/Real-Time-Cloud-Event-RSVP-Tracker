import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine, Base, AsyncSessionLocal
from app.models import User, Event, RSVP
from app.auth import hash_password, create_access_token

@pytest.fixture(autouse=True)
async def prepare_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_concurrent_final_seat_allocation():
    """
    CONCURRENCY VALIDATION:
    Scenario: Capacity is 1. Two attendees concurrently RSVP 'GOING' at the same millisecond.
    Result: Exactly ONE attendee gets 'GOING', and the other is allocated 'WAITLISTED'.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as db:
        # 1. Create Organizer and Event with Capacity = 1
        organizer = User(email="org@cloud.edu", password_hash=hash_password("pass"), full_name="Organizer", role="ORGANIZER")
        user1 = User(email="u1@cloud.edu", password_hash=hash_password("pass"), full_name="Attendee 1", role="ATTENDEE")
        user2 = User(email="u2@cloud.edu", password_hash=hash_password("pass"), full_name="Attendee 2", role="ATTENDEE")
        db.add_all([organizer, user1, user2])
        await db.commit()

        event = Event(
            organizer_id=organizer.user_id,
            title="High Concurrency Cloud Lab",
            event_date="2026-11-01 10:00:00",
            venue="Hall 101",
            max_capacity=1,
            registration_deadline="2026-10-31 23:59:59"
        )
        db.add(event)
        await db.commit()
        event_id = event.event_id
        t1 = create_access_token({"sub": user1.user_id, "role": "ATTENDEE"})
        t2 = create_access_token({"sub": user2.user_id, "role": "ATTENDEE"})

    # 2. Fire simultaneous asynchronous RSVP requests
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        req1 = client.post(
            f"/api/events/{event_id}/rsvp",
            json={"status": "GOING", "guests": 0},
            headers={"Authorization": f"Bearer {t1}"}
        )
        req2 = client.post(
            f"/api/events/{event_id}/rsvp",
            json={"status": "GOING", "guests": 0},
            headers={"Authorization": f"Bearer {t2}"}
        )
        responses = await asyncio.gather(req1, req2)

    statuses = [r.json()["status"] for r in responses]
    assert responses[0].status_code == 200
    assert responses[1].status_code == 200
    assert "GOING" in statuses
    assert "WAITLISTED" in statuses
    assert statuses.count("GOING") == 1
    assert statuses.count("WAITLISTED") == 1