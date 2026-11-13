import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS: Allows your frontend to talk to this backend.
# We will update these URLs later when you deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",  # Local testing (VS Code Live Server)
        "http://127.0.0.1:5500",
        "https://YOUR-USERNAME.github.io", # We will change this later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/game")
async def game_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for a spin result from one player
            data = await websocket.receive_text()
            # Send it to both players
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/livekit-token")
async def get_livekit_token(room_name: str, participant_name: str):
    # Generate a secure token so the user can join the video room
    token = (
        api.AccessToken()
        .with_identity(participant_name)
        .with_name(participant_name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        ).to_jwt()
    )
    
    # Fallback URL if you haven't set up your .env yet
    livekit_url = os.environ.get("LIVEKIT_URL", "wss://your-project.livekit.cloud")
    
    return {"token": token, "url": livekit_url}