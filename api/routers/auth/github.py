import secrets

from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from api.config import settings

router = APIRouter()


@router.get("/auth/github")
async def github_login():
    state = secrets.token_urlsafe(16)
    params = (
        f"client_id={settings.github_app_client_id}"
        f"&state={state}"
        f"&scope=read:user"
    )
    return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{params}")
