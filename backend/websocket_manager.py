"""
HBS Sentinel — WebSocket Connection Manager
Manages real-time connections for both admin and student clients.
"""

import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Admin connections: websocket -> user_id
        self.admin_connections: Dict[WebSocket, str] = {}
        # Student connections: websocket -> student_id
        self.student_connections: Dict[WebSocket, str] = {}

    async def connect_admin(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.admin_connections[websocket] = user_id
        logger.info(f"Admin {user_id} connected. Total admins: {len(self.admin_connections)}")

    async def connect_student(self, websocket: WebSocket, student_id: str):
        await websocket.accept()
        self.student_connections[websocket] = student_id
        logger.info(f"Student {student_id} connected. Total students: {len(self.student_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.admin_connections.pop(websocket, None)
        self.student_connections.pop(websocket, None)

    async def broadcast_to_admins(self, event_type: str, data: dict):
        """Send a message to all connected admin clients."""
        message = json.dumps({"type": event_type, "data": data})
        dead = []
        for ws in list(self.admin_connections.keys()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.admin_connections.pop(ws, None)

    async def send_to_student(self, student_id: str, event_type: str, data: dict):
        """Send a message to a specific student."""
        message = json.dumps({"type": event_type, "data": data})
        dead = []
        for ws, sid in list(self.student_connections.items()):
            if sid == student_id:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
        for ws in dead:
            self.student_connections.pop(ws, None)

    async def broadcast_to_all_students(self, event_type: str, data: dict):
        """Send a message to all connected students."""
        message = json.dumps({"type": event_type, "data": data})
        dead = []
        for ws in list(self.student_connections.keys()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.student_connections.pop(ws, None)

    async def broadcast_to_affected_students(
        self, student_ids: List[str], event_type: str, data: dict
    ):
        """Send personalized alerts to specific students."""
        for student_id in student_ids:
            await self.send_to_student(student_id, event_type, data)

    def get_online_student_ids(self) -> Set[str]:
        return set(self.student_connections.values())

    def get_admin_count(self) -> int:
        return len(self.admin_connections)

    def get_student_count(self) -> int:
        return len(self.student_connections)


# Global singleton
ws_manager = ConnectionManager()
