"""Vercel webhook handler for deployment events.

This router handles incoming webhooks from Vercel, specifically
`deployment.error` events, to trigger automatic fix attempts.
"""

import hashlib
import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from api.config import settings
from api.database import SessionLocal
from api.models.app import App
from api.models.user import User
from api.services.autofix_service import handle_deployment_failure

router = APIRouter()


def _verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify the Vercel webhook signature."""
    if not secret:
        # If no secret configured, skip verification (not recommended for production)
        return True

    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha1,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/vercel")
async def vercel_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_vercel_signature: str = Header(None),
):
    """Handle incoming Vercel webhook events."""
    payload = await request.body()

    # Verify signature if secret is configured
    secret = getattr(settings, "vercel_webhook_secret", None)
    if secret and x_vercel_signature:
        if not _verify_signature(payload, x_vercel_signature, secret):
            raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()

    event_type = data.get("type")
    deployment = data.get("payload", {})

    # Only process deployment.error events
    if event_type != "deployment.error":
        return {"status": "ignored", "event_type": event_type}

    deployment_id = deployment.get("id") or deployment.get("deployment", {}).get("id")
    project_name = deployment.get("name") or deployment.get("project", {}).get("name")
    deployment_url = deployment.get("url") or ""

    if not deployment_id or not project_name:
        return {"status": "ignored", "reason": "missing deployment info"}

    # Find the app in our database by project name
    db = SessionLocal()
    try:
        app = db.query(App).filter(App.vercel_project_id == project_name).first()
        if not app:
            return {"status": "ignored", "reason": "app not found"}

        # Get the user's GitHub token
        user = db.query(User).filter(User.id == app.user_id).first()
        if not user or not user.access_token:
            return {"status": "ignored", "reason": "no github token"}

        github_token = user.access_token
        app_id = app.id

    finally:
        db.close()

    # Trigger the autofix in the background
    background_tasks.add_task(
        handle_deployment_failure,
        app_id=app_id,
        deployment_id=deployment_id,
        deployment_url=deployment_url,
        github_token=github_token,
    )

    return {"status": "processing", "deployment_id": deployment_id}
