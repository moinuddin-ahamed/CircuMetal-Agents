"""
Minimal test - just one API call to verify the key works.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Print key info
key = os.getenv("GOOGLE_API_KEY")
model = os.getenv("MODEL", "gemini-2.0-flash")
print(f"API Key: {key[:8]}...{key[-4:]}" if key else "NO KEY!")
print(f"Model: {model}")

# Test 1: Using google.generativeai directly
print("\n=== Test 1: Direct google.generativeai ===")
import google.generativeai as genai
genai.configure(api_key=key)

try:
    model_instance = genai.GenerativeModel(model)
    response = model_instance.generate_content("Say 'Hello'")
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")

# Test 2: Using ADK
print("\n=== Test 2: Google ADK ===")
try:
    from google.adk.agents import Agent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    import asyncio
    import uuid
    
    agent = Agent(model=model, name="test", instruction="Say hello")
    
    async def run_test():
        session_service = InMemorySessionService()
        session_id = str(uuid.uuid4())
        await session_service.create_session(app_name="test", user_id="user", session_id=session_id)
        runner = Runner(agent=agent, app_name="test", session_service=session_service)
        content = types.Content(role='user', parts=[types.Part(text="Say hello")])
        
        result = ""
        async for event in runner.run_async(user_id="user", session_id=session_id, new_message=content):
            if hasattr(event, 'content') and event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        result += part.text
        return result
    
    result = asyncio.run(run_test())
    print(f"SUCCESS: {result[:100]}")
except Exception as e:
    print(f"FAILED: {e}")
