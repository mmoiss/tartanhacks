from fastapi import APIRouter, Depends

from api.utils.auth import get_current_user

router = APIRouter()


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {
        "id": user.id,
        "github_id": user.github_id,
        "username": user.username,
        "avatar_url": user.avatar_url,
    }
