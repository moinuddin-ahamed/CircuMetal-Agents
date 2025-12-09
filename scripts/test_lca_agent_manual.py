import sys
import os
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print(f"GOOGLE_API_KEY present: {'GOOGLE_API_KEY' in os.environ}")
if 'GOOGLE_API_KEY' in os.environ:
    print(f"GOOGLE_API_KEY length: {len(os.environ['GOOGLE_API_KEY'])}")

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from circu_metal.agents.life_cycle_explorer_agent import LifeCycleExplorerAgent
    print("Successfully imported LifeCycleExplorerAgent")
except ImportError as e:
    print(f"Failed to import LifeCycleExplorerAgent: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error during import: {e}")
    sys.exit(1)

async def test_agent():
    print("Initializing agent...")
    try:
        agent = LifeCycleExplorerAgent()
        print("Agent initialized.")
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        return

    input_data = {
        "metal": "Lithium",
        "ore_name": "Spodumene",
        "ore_grade": "1.2%"
    }
    
    print(f"Running agent with input: {input_data}")
    try:
        # The handle method is synchronous wrapper around async code in the agent implementation I wrote
        # Let's check the implementation of handle in life_cycle_explorer_agent.py
        # It uses asyncio.run(run_with_retry(run_agent)) inside handle.
        # So we can call it synchronously.
        result = agent.handle(input_data)
        print("Agent execution completed.")
        print("Result type:", type(result))
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Agent execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Since agent.handle calls asyncio.run, we shouldn't call it from within an async function 
    # if we were already in an event loop, but here we are in main.
    # However, test_agent is async defined but I'm calling it... wait.
    # agent.handle is synchronous.
    
    # Let's just run the body of test_agent synchronously.
    print("Initializing agent...")
    try:
        agent = LifeCycleExplorerAgent()
        print("Agent initialized.")
        
        input_data = {
            "metal": "Lithium",
            "ore_name": "Spodumene",
            "ore_grade": "1.2%"
        }
        
        print(f"Running agent with input: {input_data}")
        result = agent.handle(input_data)
        print("Agent execution completed.")
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
