import traceback

from dedalus_labs import AsyncDedalus, DedalusRunner

from api.tools.github import make_github_tools


async def run_dedalus_agent(github_token: str, prompt: str) -> dict:
    """Run the Dedalus agent with the given prompt and GitHub tools."""
    client = AsyncDedalus()
    runner = DedalusRunner(client=client, verbose=True)
    tools = make_github_tools(github_token)

    try:
        result = await runner.run(
            input=prompt,
            model="anthropic/claude-sonnet-4-20250514",
            tools=tools,
        )
    except Exception as e:
        print(f"[Dedalus Error] {type(e).__name__}: {e}")
        print(f"[Dedalus Error] Traceback:\n{traceback.format_exc()}")
        raise

    return {
        "success": True,
        "agent_output": result.final_output or str(result),
    }
