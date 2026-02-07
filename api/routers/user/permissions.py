from fastapi import APIRouter, Depends

from api.models.user import User
from api.services.github_service import get_installation_repos, get_user_installations
from api.utils.auth import get_current_user

router = APIRouter()


@router.get("/me/permissions")
async def me_permissions(user: User = Depends(get_current_user)):
    data = await get_user_installations(user.access_token)
    installations = data.get("installations", [])
    if not installations:
        return {"repositories": [], "repository_selection": "none", "installation_url": None}

    installation = installations[0]
    permissions = installation.get("permissions", {})
    events = installation.get("events", [])
    repository_selection = installation.get("repository_selection", "selected")
    account_login = installation.get("account", {}).get("login", "")

    if installation.get("target_type") == "Organization":
        installation_url = f"https://github.com/organizations/{account_login}/settings/installations"
    else:
        installation_url = f"https://github.com/settings/installations/{installation['id']}"

    repo_data = await get_installation_repos(user.access_token, installation["id"])
    repositories = [
        {
            "name": repo["full_name"],
            "private": repo["private"],
            "url": repo["html_url"],
            "permissions": permissions,
            "events": events,
        }
        for repo in repo_data.get("repositories", [])
    ]
    return {
        "repositories": repositories,
        "repository_selection": repository_selection,
        "installation_url": installation_url,
    }
