from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth_routes, event_routes, rsvp_routes, analytics_routes
from app.websocket_manager import ws_manager

app = FastAPI(
    title="Real-Time Cloud Event RSVP Platform",
    description="Asynchronous cloud backend implementing capacity-safe RSVPs and real-time WebSocket telemetry.",
    version="1.0.0"
)

# Cross-Origin Resource Sharing (CORS) setup for cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Register route modules
app.include_router(auth_routes.router)
app.include_router(event_routes.router)
app.include_router(rsvp_routes.router)
app.include_router(analytics_routes.router)

@app.websocket("/ws/events/{event_id}")
async def event_websocket_endpoint(websocket: WebSocket, event_id: str):
    """Real-Time telemetry endpoint for active dashboard listeners."""
    await ws_manager.connect(event_id, websocket)
    try:
        while True:
            # Keep socket alive; organizers can also push ping messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(event_id, websocket)