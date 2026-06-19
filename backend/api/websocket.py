import asyncio
import json
import logging
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect, APIRouter

logger = logging.getLogger(__name__)

router = APIRouter()


class WSConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_personal(self, message: Dict[str, Any], client_id: str):
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for client_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(client_id)
        for cid in disconnected:
            self.disconnect(cid)


manager = WSConnectionManager()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action", "")
                if action == "subscribe":
                    ticker = msg.get("ticker", "").upper()
                    from main import data_service
                    await data_service.start_streaming(ticker)
                    await manager.send_personal({
                        "type": "subscribed",
                        "ticker": ticker,
                        "message": f"Subscribed to {ticker}",
                    }, client_id)
                elif action == "unsubscribe":
                    ticker = msg.get("ticker", "").upper()
                    from main import data_service
                    await data_service.stop_streaming(ticker)
                    await manager.send_personal({
                        "type": "unsubscribed",
                        "ticker": ticker,
                    }, client_id)
                elif action == "ping":
                    await manager.send_personal({"type": "pong"}, client_id)
            except json.JSONDecodeError:
                await manager.send_personal({
                    "type": "error",
                    "message": "Invalid JSON",
                }, client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)
