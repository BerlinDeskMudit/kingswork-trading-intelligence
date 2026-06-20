from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from auth.deps import get_current_user
from config import settings
from models.user import User

router = APIRouter(prefix="/llm-chat", tags=["llm-chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=24)

    @field_validator("messages")
    @classmethod
    def require_user_message(cls, messages: list[ChatMessage]) -> list[ChatMessage]:
        if not any(message.role == "user" for message in messages):
            raise ValueError("At least one user message is required.")
        return messages


SYSTEM_PROMPT = (
    "You are KingStop Chat, a helpful conversational assistant inside a trading intelligence app. "
    "You can discuss general topics, app usage, research workflows, and trading concepts. "
    "For investing or trading questions, be educational and practical, but do not present guesses as facts "
    "or claim to provide personalized financial advice."
)


@router.post("")
async def create_chat_completion(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq API key is not configured.",
        )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(
        {"role": message.role, "content": message.content.strip()}
        for message in payload.messages[-16:]
        if message.content.strip()
    )

    try:
        async with httpx.AsyncClient(timeout=settings.groq_timeout_seconds) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 900,
                },
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = "Groq chat request failed."
        try:
            error = exc.response.json().get("error", {})
            detail = error.get("message") or detail
        except ValueError:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Groq chat service.",
        ) from exc

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Groq returned an empty response.")

    return {
        "status": "ok",
        "model": data.get("model", settings.groq_model),
        "message": {"role": "assistant", "content": content},
        "user": current_user.email,
    }
