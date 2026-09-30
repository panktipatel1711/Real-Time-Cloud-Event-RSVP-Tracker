from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: Optional[str] = "ATTENDEE"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: datetime
    venue: str
    online_link: Optional[str] = None
    max_capacity: int = Field(..., gt=0)
    registration_deadline: datetime

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    venue: Optional[str] = None
    online_link: Optional[str] = None
    max_capacity: Optional[int] = Field(None, gt=0)
    registration_deadline: Optional[datetime] = None
    status: Optional[str] = None

class EventResponse(BaseModel):
    event_id: str
    organizer_id: str
    title: str
    description: Optional[str]
    event_date: datetime
    venue: str
    online_link: Optional[str]
    max_capacity: int
    registration_deadline: datetime
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class RSVPCreate(BaseModel):
    status: str = Field(..., pattern="^(GOING|MAYBE|NOT_GOING)$")
    guests: int = Field(0, ge=0, le=5)

class RSVPResponse(BaseModel):
    rsvp_id: str
    event_id: str
    user_id: str
    status: str
    guests: int
    updated_at: datetime
    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    event_id: str
    max_capacity: int
    going_count: int
    maybe_count: int
    not_going_count: int
    waitlist_count: int
    total_responses: int
    capacity_utilization_pct: float
    is_full: bool

class AnnouncementCreate(BaseModel):
    title: str
    message: str

class AnnouncementResponse(BaseModel):
    announcement_id: str
    event_id: str
    title: str
    message: str
    created_at: datetime
    class Config:
        from_attributes = True