from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession

from api.config import settings
from api.database import get_db
from api.models.user import User, Session
from api.services.github_service import exchange_code_for_token, get_github_user

router = APIRouter()


@router.get("/auth/github/callback")
async def github_callback(code: str, state: str | None = None, db: DBSession = Depends(get_db)):
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to obtain access token from GitHub")

    github_user = await get_github_user(access_token)

    user = db.query(User).filter(User.github_id == github_user["id"]).first()
    if user:
        user.username = github_user["login"]
        user.avatar_url = github_user.get("avatar_url")
        user.access_token = access_token
    else:
        user = User(
            github_id=github_user["id"],
            username=github_user["login"],
            avatar_url=github_user.get("avatar_url"),
            access_token=access_token,
        )
        db.add(user)
    db.commit()
    db.refresh(user)

    session = Session(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)

    return RedirectResponse(url=f"{settings.frontend_url}?session={session.token}")
