"""Auto-fix service for handling Vercel deployment failures.

When Vercel notifies us of a failed deployment, this service:
1. Fetches the build logs from the Vercel API
2. Constructs a prompt for the Dedalus agent
3. Triggers the agent to create a fix PR
"""

import traceback

import httpx

from api.config import settings
from api.database import SessionLocal
from api.models.app import App
from api.services.dedalus_service import run_dedalus_agent


async def handle_deployment_failure(
    app_id: int,
    deployment_id: str,
    deployment_url: str,
    github_token: str,
):
    """Handle a failed Vercel deployment by triggering the Dedalus agent."""
    db = SessionLocal()
    try:
        app = db.query(App).filter(App.id == app_id).first()
        if not app:
            print(f"[Autofix] App {app_id} not found")
            return

        # Mark app as fixing
        app.pipeline_step = "autofix_running"
        db.commit()

        # Fetch build logs from Vercel
        vercel_token = settings.vercel_token
        build_logs = await _fetch_vercel_logs(deployment_id, vercel_token)

        # Construct the prompt for Dedalus
        prompt = f"""You are an expert developer tasked with fixing a failed Vercel deployment.

Repository: {app.repo_owner}/{app.repo_name}
Deployment URL: {deployment_url}

The deployment failed with the following build logs:

```
{build_logs}
```

Your task:
1. Analyze the error in the build logs to understand what went wrong.
2. Use `get_file_content` to read the relevant source files that are causing the error.
3. Create a new branch called `sanos/autofix-{deployment_id[:8]}` from the default branch (try `main` first, if that fails try `master`).
4. Fix the code by creating or updating the necessary files.
5. Create a pull request with:
   - Title: "[SANOS] Auto-fix: <brief description of the fix>"
   - Body: Explain what was broken and how you fixed it.

IMPORTANT: After creating the PR, output the PR URL on its own line in this exact format:
SANOS_PR=https://github.com/{app.repo_owner}/{app.repo_name}/pull/NUMBER

Replace NUMBER with the ACTUAL PR number you just created (do NOT use a placeholder or example number).
"""

        try:
            result = await run_dedalus_agent(github_token, prompt)
            agent_output = result.get("agent_output", "")

            # Parse PR URL
            import re
            pr_match = re.search(
                r"https://github\.com/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+/pull/(\d+)",
                agent_output,
            )

            if pr_match:
                app.autofix_pr_url = pr_match.group(0)
                app.pipeline_step = "autofix_pr_created"
            else:
                print(f"[Autofix Warning] Could not parse PR URL from agent output: {agent_output[-500:]}")
                app.pipeline_step = "autofix_completed"

            db.commit()
        except Exception as e:
            print(f"[Autofix Error] {type(e).__name__}: {e}")
            print(traceback.format_exc())
            app.pipeline_step = "autofix_error"
            db.commit()

    finally:
        db.close()


async def _fetch_vercel_logs(deployment_id: str, vercel_token: str) -> str:
    """Fetch build logs from Vercel for a given deployment."""
    headers = {
        "Authorization": f"Bearer {vercel_token}",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Fetch deployment events (contains build output)
            response = await client.get(
                f"https://api.vercel.com/v2/deployments/{deployment_id}/events",
                headers=headers,
            )

            if response.status_code != 200:
                return f"Failed to fetch logs: {response.status_code} - {response.text}"

            events = response.json()

            # Extract log messages from events
            log_lines = []
            for event in events:
                if event.get("type") == "stdout" or event.get("type") == "stderr":
                    text = event.get("payload", {}).get("text", "")
                    if text:
                        log_lines.append(text)
                elif event.get("text"):
                    log_lines.append(event["text"])

            if not log_lines:
                return "No build logs available."

            # Limit to last 200 lines to avoid token limits
            return "\n".join(log_lines[-200:])

        except Exception as e:
            return f"Error fetching logs: {type(e).__name__}: {e}"
