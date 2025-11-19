import os
import json
import asyncio
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import uuid
from circu_metal.utils.retry import run_with_retry

class ExplainAgent(Agent):
    def __init__(self, model_name: str = "gemini-2.0-flash-001"):
        prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'explain_agent.md')
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r') as f:
                instruction = f.read()
        else:
            instruction = "You are the ExplainAgent."

        super().__init__(
            model=model_name,
            name='explain_agent',
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
            
            # Try parsing as JSON first
            try:
                json_text = clean_text
                if json_text.startswith("```json"):
                    json_text = json_text[7:]
                if json_text.endswith("```"):
                    json_text = json_text[:-3]
                
                # Attempt to load as JSON
                parsed = json.loads(json_text.strip())
                # If it's a list or dict, return it. If it's just a string, it might be the report itself.
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

            # Fallback: Treat the entire output as the Markdown report
            # Clean up markdown code fences if they exist wrapping the whole text
            report_content = clean_text
            if report_content.startswith("```markdown"):
                report_content = report_content[11:]
            elif report_content.startswith("```"):
                report_content = report_content[3:]
            
            if report_content.endswith("```"):
                report_content = report_content[:-3]

            return {
                "status": "success",
                "data": {
                    "report_markdown": report_content.strip(),
                    "key_takeaways": ["Report generated as raw Markdown."]
                },
                "log": "Output parsed as raw Markdown.",
                "confidence": 1.0
            }

        except Exception as e:
            return {
                "status": "failure",
                "data": {},
                "log": f"Error in ExplainAgent: {str(e)}",
                "confidence": 0.0
            }
