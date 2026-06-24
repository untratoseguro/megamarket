from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ChatIn(BaseModel):
    session_id: Optional[UUID] = None
    message: str = Field(min_length=1, max_length=4000)


class ChatOut(BaseModel):
    session_id: UUID
    message: str
