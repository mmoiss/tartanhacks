from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session as DBSession

from api.database import get_db
from api.models.user import Session, User


async def get_current_user(
    authorization: str = Header(...),
    db: DBSession = Depends(get_db),
) -> User:
    token = authorization.removeprefix("Bearer ").strip()
    session = db.query(Session).filter(Session.session_token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session.user
