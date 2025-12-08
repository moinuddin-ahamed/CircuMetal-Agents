import json
import time
import asyncio
import logging
import re
from typing import Dict, Any

from circu_metal.agents.data_agent import DataAgent
from circu_metal.agents.estimation_agent import EstimationAgent
from circu_metal.agents.lca_agent import LCAAgent
from circu_metal.agents.circularity_agent import CircularityAgent
from circu_metal.agents.scenario_agent import ScenarioAgent
from circu_metal.agents.visualization_agent import VisualizationAgent
from circu_metal.agents.explain_agent import ExplainAgent
from circu_metal.agents.compliance_agent import ComplianceAgent
from circu_metal.agents.critique_agent import CritiqueAgent


class CircuMetalLogFilter(logging.Filter):
    """Filter to replace Gemini model names with CircuMetal branding in logs."""
    
    # Pattern to match various Gemini model names
    GEMINI_PATTERN = re.compile(r'gemini-[\w\.\-]+', re.IGNORECASE)
    
    def filter(self, record):
        if record.msg:
            record.msg = self.GEMINI_PATTERN.sub('CircuMetal', str(record.msg))
        if record.args:
            record.args = tuple(
                self.GEMINI_PATTERN.sub('CircuMetal', str(arg)) if isinstance(arg, str) else arg
                for arg in record.args
            )
        return True


# Configure logging with CircuMetal branding
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Apply the filter to the root logger to catch all logs
for handler in logging.root.handlers:
    handler.addFilter(CircuMetalLogFilter())

# Also apply to commonly used loggers from Google ADK
for logger_name in ['google', 'google.adk', 'httpx', 'httpcore', 'urllib3']:
    _logger = logging.getLogger(logger_name)
    _logger.addFilter(CircuMetalLogFilter())

logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self):
        self.data_agent = DataAgent()
        self.estimation_agent = EstimationAgent()
        self.lca_agent = LCAAgent()
        self.circularity_agent = CircularityAgent()
        self.scenario_agent = ScenarioAgent()
        self.visualization_agent = VisualizationAgent()
        self.explain_agent = ExplainAgent()
        self.compliance_agent = ComplianceAgent()
        self.critique_agent = CritiqueAgent()

    def _log_step(self, step_name: str, input_data: dict, output_data: dict):
        logger.info(f"=== {step_name} ===")
        logger.info(f"Input Keys: {list(input_data.keys())}")
        logger.info(f"Output Status: {output_data.get('status', 'unknown')}")
        if output_data.get('status') == 'success':
            logger.info(f"Output Data Keys: {list(output_data.get('data', {}).keys())}")
        else:
            logger.warning(f"Step Failed. Log: {output_data.get('log')}")
        logger.debug(f"Full Output: {json.dumps(output_data, indent=2)}")



    async def run(self, initial_input: dict) -> dict:
        """
        Pure sequential execution - one agent at a time with delays.
        """
        context = initial_input.copy()
        history = {}
        loop = asyncio.get_running_loop()

        # Helper to run agents - handles both sync (legacy) and async agents
        async def run_agent(agent, input_data):
            import inspect
            handle_method = agent.handle
            # Check if handle is a coroutine function (async)
            if inspect.iscoroutinefunction(handle_method):
                # Async agent - await directly
                return await handle_method(input_data)
            else:
                # Sync agent - run in thread pool
                return await loop.run_in_executor(None, handle_method, input_data)

        # 1. Data Agent
        print("--- Step 1: Data Agent ---")
        res1 = await run_agent(self.data_agent, context)
        self._log_step("Data Agent", context, res1)
        history['data_agent'] = res1
        if res1.get('status') == 'success':
            context = res1.get('data', {})
        else:
            print("Data Agent failed.")
            return history
        await asyncio.sleep(8)

        # 2. Estimation Agent
        print("--- Step 2: Estimation Agent ---")
        res2 = await run_agent(self.estimation_agent, context)
        self._log_step("Estimation Agent", context, res2)
        history['estimation_agent'] = res2
        if res2.get('status') == 'success':
            context = res2.get('data', {})
        await asyncio.sleep(8)

        # 3. LCA Agent
        print("--- Step 3: LCA Agent ---")
        res3 = await run_agent(self.lca_agent, context)
        self._log_step("LCA Agent", context, res3)
        history['lca_agent'] = res3
        if res3.get('status') == 'success' and 'data' in res3:
            context.update(res3['data'])
        await asyncio.sleep(8)

        # 4. Circularity Agent
        print("--- Step 4: Circularity Agent ---")
        res4 = await run_agent(self.circularity_agent, context)
        self._log_step("Circularity Agent", context, res4)
        history['circularity_agent'] = res4
        if res4.get('status') == 'success' and 'data' in res4:
            context.update(res4['data'])
        await asyncio.sleep(8)

        # 5. Scenario Agent
        print("--- Step 5: Scenario Agent ---")
        res5 = await run_agent(self.scenario_agent, context)
        self._log_step("Scenario Agent", context, res5)
        history['scenario_agent'] = res5
        await asyncio.sleep(8)

        # 6. Visualization Agent (now using unified run_agent helper)
        print("--- Step 6: Visualization Agent ---")
        # Prepare input
        viz_input = context.copy()
        # Ensure lca_results is present
        if "lca_results" not in viz_input and res3 and res3.get("data"):
             viz_input["lca_results"] = res3.get("data")
        
        viz_input["action"] = "generate"
        
        # Pass project_id explicitly if available
        if "project_id" in initial_input:
            viz_input["project_id"] = initial_input["project_id"]
            viz_input["project_name"] = initial_input.get("project_name", "Unknown Project")

        res6 = await run_agent(self.visualization_agent, viz_input)
        self._log_step("Visualization Agent", viz_input, res6)
        history['visualization_agent'] = res6
        await asyncio.sleep(8)

        # 7. Explain Agent
        print("--- Step 7: Explain Agent ---")
        explain_input = {"current_context": context, "history": history}
        res7 = await run_agent(self.explain_agent, explain_input)
        self._log_step("Explain Agent", explain_input, res7)
        history['explain_agent'] = res7
        await asyncio.sleep(8)

        # 8. Compliance Agent
        print("--- Step 8: Compliance Agent ---")
        res8 = await run_agent(self.compliance_agent, context)
        self._log_step("Compliance Agent", context, res8)
        history['compliance_agent'] = res8
        await asyncio.sleep(8)

        # 9. Critique Agent
        print("--- Step 9: Critique Agent ---")
        res9 = await run_agent(self.critique_agent, history)
        self._log_step("Critique Agent", history, res9)
        history['critique_agent'] = res9

        return history
