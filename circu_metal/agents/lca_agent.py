import os
import json
import asyncio
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import uuid
from circu_metal.utils.retry import run_with_retry

class LCAAgent(Agent):
    def __init__(self, model_name: str = None):
        if model_name is None:
            model_name = os.getenv("MODEL", "gemini-2.0-flash")
        prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'lca_agent.md')
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r') as f:
                instruction = f.read()
        else:
            instruction = "You are the LCAAgent."

        super().__init__(
            model=model_name,
            name='lca_agent',
            instruction=instruction
        )

    def handle(self, input: dict) -> dict:
        input_str = json.dumps(input)
        session_service = InMemorySessionService()
        
        async def run_agent():
            session_id = str(uuid.uuid4())
            await session_service.create_session(app_name="agents", user_id="user", session_id=session_id)
            runner = Runner(agent=self, app_name="agents", session_service=session_service)
            content = types.Content(role='user', parts=[types.Part(text=input_str)])
            
            final_text = ""
            async for event in runner.run_async(user_id="user", session_id=session_id, new_message=content):
                if hasattr(event, 'content') and event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            final_text += part.text
            return final_text

        try:
            result_text = asyncio.run(run_with_retry(run_agent))
            clean_text = result_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            return json.loads(clean_text.strip())
        except Exception as e:
            return {
                "status": "failure",
                "data": {},
                "log": f"Error in LCAAgent: {str(e)}",
                "confidence": 0.0
            }
