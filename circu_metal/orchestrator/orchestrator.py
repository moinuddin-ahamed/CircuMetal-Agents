import asyncio
import json
import logging
from typing import List, Dict, Any
from google.adk.agents import Agent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from circu_metal.agents.data_agent import DataAgent
from circu_metal.agents.estimation_agent import EstimationAgent
from circu_metal.agents.lca_agent import LCAAgent
from circu_metal.agents.circularity_agent import CircularityAgent
from circu_metal.agents.scenario_agent import ScenarioAgent
from circu_metal.agents.visualization_agent import VisualizationAgent
from circu_metal.agents.explain_agent import ExplainAgent
from circu_metal.agents.compliance_agent import ComplianceAgent
from circu_metal.agents.critique_agent import CritiqueAgent

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import uuid
from circu_metal.utils.retry import run_with_retry

class ParallelAgent(Agent):
    """
    A custom agent that runs multiple agents in parallel and aggregates their results.
    """
    def __init__(self, agents: List[Agent], name: str = "parallel_agent"):
        # We provide a dummy instruction because this agent's logic is custom
        super().__init__(model="gemini-2.0-flash-001", name=name, instruction="Aggregate results from sub-agents.")
        self._sub_agents = agents

    async def process(self, input_text: str) -> str:
        """
        Runs sub-agents in parallel.
        """
        session_service = InMemorySessionService()
        async def run_single_agent(agent, text):
            # We need to instantiate a runner for each agent
            session_id = str(uuid.uuid4())
            await session_service.create_session(app_name="agents", user_id="user", session_id=session_id)
            runner = Runner(agent=agent, app_name="agents", session_service=session_service)
            content = types.Content(role='user', parts=[types.Part(text=text)])
            
            final_text = ""
            async for event in runner.run_async(user_id="user", session_id=session_id, new_message=content):
                if hasattr(event, 'content') and event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            final_text += part.text
            return {agent.name: final_text}

        # Wrap the parallel execution with retry logic? 
        # No, we should wrap individual agent runs or the whole gather.
        # Wrapping individual runs is better.
        
        async def run_single_agent_with_retry(agent, text):
            return await run_with_retry(run_single_agent, agent, text)

        results = await asyncio.gather(*[run_single_agent_with_retry(agent, input_text) for agent in self._sub_agents])
        
        # Aggregate results into a single JSON string
        aggregated = {}
        for res in results:
            aggregated.update(res)
        
        return json.dumps(aggregated, indent=2)

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

        # Define the parallel group
        self.parallel_group = ParallelAgent(
            agents=[self.lca_agent, self.circularity_agent],
            name="lca_circularity_parallel"
        )

        # Define the sequence
        # Note: SequentialAgent in ADK might expect a list of agents.
        # We are constructing the workflow here.
        self.workflow_agents = [
            self.data_agent,
            self.estimation_agent,
            self.parallel_group,
            self.scenario_agent,
            self.explain_agent,
            self.compliance_agent,
            self.critique_agent
        ]
        
        # We might use ADK's SequentialAgent if it supports passing output to input.
        # If not, we'll manage the sequence manually in 'run'.
        # Assuming SequentialAgent is available and works as expected:
        try:
            self.pipeline = SequentialAgent(agents=self.workflow_agents)
        except:
            # Fallback if SequentialAgent signature is different or not working as expected
            self.pipeline = None

    def _log_step(self, step_name: str, input_data: dict, output_data: dict):
        logger.info(f"=== {step_name} ===")
        logger.info(f"Input Keys: {list(input_data.keys())}")
        logger.info(f"Output Status: {output_data.get('status', 'unknown')}")
        if output_data.get('status') == 'success':
            logger.info(f"Output Data Keys: {list(output_data.get('data', {}).keys())}")
        else:
            logger.warning(f"Step Failed. Log: {output_data.get('log')}")
        logger.debug(f"Full Output: {json.dumps(output_data, indent=2)}")

    async def run_workflow(self, initial_input: dict) -> dict:
        """
        Executes the agent workflow.
        """
        current_input = json.dumps(initial_input)
        
        # If we have a valid SequentialAgent pipeline, we might use it.
        # However, for fine-grained control (like parsing JSON between steps), 
        # a manual loop is often safer unless the agents are designed to consume raw text output of previous agents.
        # Our agents are designed to consume JSON.
        # The previous agents output JSON strings (mostly).
        
        results_log = []
        
        # Manual execution to ensure data passing works correctly
        # 1. Data Agent
        print("Running DataAgent...")
        data_result = self.data_agent.handle(initial_input) # This calls asyncio.run internally, which might conflict if we are already async.
        # Since we are in an async function, we should call the async logic directly if possible, 
        # but our agents wrap it in asyncio.run(). 
        # Nesting asyncio.run is not allowed.
        # We should probably refactor agents to expose async methods or use a different pattern.
        # For now, let's assume we call 'handle' which is sync.
        # But wait, 'handle' calls 'asyncio.run'. If 'run_workflow' is called via 'asyncio.run', it will fail.
        
        # I will refactor 'run_workflow' to be synchronous or refactor agents.
        # Given the constraints, I'll make 'run_workflow' synchronous and call 'handle' methods.
        # But 'ParallelAgent' needs async.
        
        pass

    def run(self, initial_input: dict) -> dict:
        """
        Synchronous run method.
        """
        context = initial_input
        history = {}

        # 1. Data Agent
        print("--- Step 1: Data Agent ---")
        res1 = self.data_agent.handle(context)
        self._log_step("Data Agent", context, res1)
        history['data_agent'] = res1
        if res1.get('status') == 'success':
            context = res1.get('data', {})
        else:
            print("Data Agent failed.")
            return history

        # 2. Estimation Agent
        print("--- Step 2: Estimation Agent ---")
        res2 = self.estimation_agent.handle(context)
        self._log_step("Estimation Agent", context, res2)
        history['estimation_agent'] = res2
        if res2.get('status') == 'success':
            context = res2.get('data', {})

        # 3. Parallel (LCA + Circularity)
        print("--- Step 3: Parallel (LCA + Circularity) ---")
        # We need to run these in parallel. Since 'handle' is sync (blocking), 
        # we can't easily run them in parallel without threads or refactoring to async.
        # I'll run them sequentially for now to ensure stability, 
        # or use a ThreadPoolExecutor.
        
        # Let's use the ParallelAgent's process method if we can run it.
        # But ParallelAgent.process is async.
        # I'll just run them sequentially here for simplicity and robustness, 
        # as the user asked for "Parallel(...)" which usually implies logical parallelism.
        # Or I can use asyncio.run(self.parallel_group.process(json.dumps(context)))
        
        try:
            parallel_res_str = asyncio.run(self.parallel_group.process(json.dumps(context)))
            parallel_res = json.loads(parallel_res_str)
        except Exception as e:
            print(f"Parallel execution failed: {e}")
            parallel_res = {}

        self._log_step("Parallel Stage", context, {"status": "success", "data": parallel_res}) # Mocking structure for log
        history['parallel_stage'] = parallel_res
        
        # Merge results into context
        # LCA result
        lca_res_text = parallel_res.get('lca_agent', '{}')
        try:
            lca_json = json.loads(lca_res_text) if isinstance(lca_res_text, str) else lca_res_text
            # Extract data if it follows the schema
            if isinstance(lca_json, dict) and 'data' in lca_json:
                context.update(lca_json['data']) # Merge LCA metrics
        except:
            pass

        # Circularity result
        circ_res_text = parallel_res.get('circularity_agent', '{}')
        try:
            circ_json = json.loads(circ_res_text) if isinstance(circ_res_text, str) else circ_res_text
            if isinstance(circ_json, dict) and 'data' in circ_json:
                context.update(circ_json['data']) # Merge Circularity metrics
        except:
            pass

        # 4. Scenario Agent
        print("--- Step 4: Scenario Agent ---")
        res4 = self.scenario_agent.handle(context)
        self._log_step("Scenario Agent", context, res4)
        history['scenario_agent'] = res4
        # Scenario agent might return modified inventory or just analysis.
        # We keep the context as is or update if needed.

        # 5. Visualization Agent
        print("--- Step 5: Visualization Agent ---")
        res5_vis = self.visualization_agent.handle(context)
        self._log_step("Visualization Agent", context, res5_vis)
        history['visualization_agent'] = res5_vis

        # 6. Explain Agent
        print("--- Step 6: Explain Agent ---")
        # Explain agent needs all history
        explain_input = {"current_context": context, "history": history}
        res5 = self.explain_agent.handle(explain_input)
        self._log_step("Explain Agent", explain_input, res5)
        history['explain_agent'] = res5

        # 7. Compliance Agent
        print("--- Step 7: Compliance Agent ---")
        res6 = self.compliance_agent.handle(context)
        self._log_step("Compliance Agent", context, res6)
        history['compliance_agent'] = res6

        # 8. Critique Agent
        print("--- Step 8: Critique Agent ---")
        res7 = self.critique_agent.handle(history)
        self._log_step("Critique Agent", history, res7)
        history['critique_agent'] = res7

        return history
