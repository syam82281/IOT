from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class TelemetryIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None
    firmware: Optional[str] = None
    metrics: Dict[str, float]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    device_id: Optional[str] = None
    history: List[ChatMessage] = []
