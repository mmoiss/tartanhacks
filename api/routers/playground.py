from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.models.user import User
from api.utils.auth import get_current_user
from api.services.dedalus_service import run_dedalus_agent

router = APIRouter()


class PlaygroundRequest(BaseModel):
    prompt: str


@router.post("/playground")
async def playground_run(
    body: PlaygroundRequest,
    user: User = Depends(get_current_user),
):
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        result = await run_dedalus_agent(user.access_token, body.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
