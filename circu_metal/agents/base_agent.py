"""
Base Agent for CircuMetal Multi-Agent System.

Provides common functionality for all agents including:
- Provenance tracking
- Audit logging
- Service integration
- Retry mechanisms
- Structured response handling
"""

import os
import json
import asyncio
import hashlib
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
import uuid
import httpx

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from circu_metal.utils.retry import run_with_retry

logger = logging.getLogger(__name__)


@dataclass
class AgentResponse:
    """Standardized agent response."""
    status: str  # success, failure, partial
    data: Dict[str, Any]
    log: str
    confidence: float
    provenance: List[Dict[str, Any]] = field(default_factory=list)
    execution_time_ms: Optional[int] = None
    agent_id: Optional[str] = None
    run_id: Optional[str] = None


@dataclass
class ServiceConfig:
    """Configuration for microservice integration."""
    estimation_url: str = "http://localhost:8001"
    lca_url: str = "http://localhost:8002"
    compliance_url: str = "http://localhost:8003"
    timeout: float = 30.0


class BaseCircuMetalAgent(Agent):
    """
    Enhanced base agent with provenance tracking and service integration.
    
    Features:
    - Automatic provenance tracking
    - Audit log generation
    - Microservice integration
    - Structured response handling
    - Error recovery
    """
    
    # Allow extra fields for Pydantic model
    model_config = {"extra": "allow"}
    
    def __init__(
        self,
        name: str,
        model_name: str = None,
        prompt_file: Optional[str] = None,
        service_config: Optional[ServiceConfig] = None
    ):
        """
        Initialize the agent.
        
        Args:
            name: Agent name
            model_name: LLM model to use (defaults to MODEL env var or gemini-2.0-flash)
            prompt_file: Path to prompt file (relative to prompts/)
            service_config: Configuration for microservices
        """
        # Use MODEL from env, fallback to gemini-2.0-flash
        if model_name is None:
            model_name = os.getenv("MODEL", "gemini-2.0-flash")
        
        # Load prompt
        if prompt_file:
            prompt_path = os.path.join(
                os.path.dirname(__file__), '..', 'prompts', prompt_file
            )
        else:
            prompt_path = os.path.join(
                os.path.dirname(__file__), '..', 'prompts', f'{name}.md'
            )
        
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r', encoding='utf-8') as f:
                instruction = f.read()
        else:
            instruction = f"You are the {name} agent for CircuMetal LCA platform."
            logger.warning(f"Prompt file not found: {prompt_path}")
        
        # Debug: Log API Key usage
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            masked_key = f"{api_key[:4]}...{api_key[-4:]}"
            logger.info(f"Initializing CircuMetal agent '{name}' (API Key: {masked_key})")
            
            # Explicitly configure google.genai if needed, though ADK usually handles it.
            # We set the env var to be sure, in case it was missing from os.environ
            if "GOOGLE_API_KEY" not in os.environ:
                os.environ["GOOGLE_API_KEY"] = api_key
        else:
            logger.error(f"CircuMetal agent {name} initialized without GOOGLE_API_KEY!")
            raise ValueError("GOOGLE_API_KEY environment variable is not set.")

        super().__init__(
            model=model_name,
            name=name,
            instruction=instruction
        )
        
        self.service_config = service_config or ServiceConfig()
        self.agent_id = str(uuid.uuid4())
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client for service calls."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=self.service_config.timeout
            )
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    def _hash_data(self, data: Any) -> str:
        """Generate SHA256 hash of data for audit trail."""
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()

    def _create_provenance(
        self,
        source: str,
        citation: Optional[str] = None,
        quality_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """Create a provenance record."""
        return {
            "source": source,
            "citation": citation,
            "date": datetime.utcnow().isoformat(),
            "agent_id": self.agent_id,
            "quality_score": quality_score
        }

    def _create_audit_entry(
        self,
        run_id: str,
        action: str,
        inputs: Optional[Dict] = None,
        outputs: Optional[Dict] = None,
        details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create an audit log entry."""
        return {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "run_id": run_id,
            "action": action,
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "inputs_hash": self._hash_data(inputs) if inputs else None,
            "outputs_hash": self._hash_data(outputs) if outputs else None,
            "details": details or {}
        }

    async def call_service(
        self,
        service: str,
        endpoint: str,
        method: str = "POST",
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Call a microservice endpoint.
        
        Args:
            service: Service name ('estimation', 'lca', 'compliance')
            endpoint: API endpoint path
            method: HTTP method
            data: Request body for POST
            params: Query parameters
            
        Returns:
            Service response as dictionary
        """
        service_urls = {
            "estimation": self.service_config.estimation_url,
            "lca": self.service_config.lca_url,
            "compliance": self.service_config.compliance_url
        }
        
        base_url = service_urls.get(service)
        if not base_url:
            raise ValueError(f"Unknown service: {service}")
        
        url = f"{base_url}{endpoint}"
        client = await self._get_http_client()
        
        try:
            if method.upper() == "GET":
                response = await client.get(url, params=params)
            elif method.upper() == "POST":
                response = await client.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Service call failed: {service}{endpoint} - {e}")
            return {"error": str(e), "status": "service_error"}
        except Exception as e:
            logger.error(f"Unexpected error calling {service}: {e}")
            return {"error": str(e), "status": "error"}

    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response, handling markdown code blocks."""
        clean_text = response_text.strip()
        
        # Handle various markdown code block formats
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        clean_text = clean_text.strip()
        
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            # Try to extract JSON from the text
            import re
            json_match = re.search(r'\{[\s\S]*\}', clean_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            return {
                "status": "parse_error",
                "raw_response": response_text[:1000],
                "error": str(e)
            }

    async def run_llm(self, input_data: Dict[str, Any]) -> str:
        """
        Run the LLM with the given input.
        
        Args:
            input_data: Input dictionary to send to LLM
            
        Returns:
            Raw LLM response text
        """
        input_str = json.dumps(input_data, default=str)
        session_service = InMemorySessionService()
        
        session_id = str(uuid.uuid4())
        await session_service.create_session(
            app_name="agents",
            user_id="user",
            session_id=session_id
        )
        
        runner = Runner(
            agent=self,
            app_name="agents",
            session_service=session_service
        )
        
        content = types.Content(
            role='user',
            parts=[types.Part(text=input_str)]
        )
        
        final_text = ""
        async for event in runner.run_async(
            user_id="user",
            session_id=session_id,
            new_message=content
        ):
            if hasattr(event, 'content') and event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        final_text += part.text
        
        return final_text

    async def run_llm_raw(self, prompt: str, system_instruction: str = None) -> str:
        """
        Run the LLM with a raw prompt, optionally with a custom system instruction.
        This bypasses the agent's configured instruction.
        
        Args:
            prompt: The prompt to send to the LLM
            system_instruction: Optional custom system instruction
            
        Returns:
            Raw LLM response text
        """
        import google.generativeai as genai
        
        # Configure with API key from environment
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not set")
        
        genai.configure(api_key=api_key)
        
        # Use the same model as the agent
        model_name = self.model if hasattr(self, 'model') else "gemini-2.0-flash-001"
        
        generation_config = {
            "temperature": 0.7,
            "max_output_tokens": 8192,
        }
        
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_instruction
        )
        
        response = model.generate_content(prompt)
        return response.text

    async def handle(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle input and return structured response.
        
        This is the main entry point called by the orchestrator.
        Override _process() in subclasses for custom logic.
        
        Args:
            input_data: Input dictionary
            
        Returns:
            Structured response dictionary
        """
        run_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        try:
            # Run the processing
            result = await run_with_retry(
                lambda: self._async_handle(input_data, run_id)
            )
            
            # Calculate execution time
            execution_time_ms = int(
                (datetime.utcnow() - start_time).total_seconds() * 1000
            )
            
            # Add metadata if not present
            if isinstance(result, dict):
                result.setdefault("execution_time_ms", execution_time_ms)
                result.setdefault("agent_id", self.agent_id)
                result.setdefault("run_id", run_id)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in {self.name}: {e}")
            return {
                "status": "failure",
                "data": {},
                "log": f"Error in {self.name}: {str(e)}",
                "confidence": 0.0,
                "agent_id": self.agent_id,
                "run_id": run_id
            }

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Async handler - override in subclasses for custom logic.
        
        Default implementation runs LLM and parses response.
        """
        # Run LLM
        response_text = await self.run_llm(input_data)
        
        # Parse response
        result = self._parse_llm_response(response_text)
        
        # Ensure standard fields
        result.setdefault("status", "success")
        result.setdefault("data", {})
        result.setdefault("log", "")
        result.setdefault("confidence", 0.8)
        
        return result

    async def _process(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process input data. Override in subclasses for custom logic.
        
        This method can combine LLM reasoning with service calls.
        """
        return await self._async_handle(input_data, run_id)


class AgentRegistry:
    """Registry for managing agent instances."""
    
    _agents: Dict[str, BaseCircuMetalAgent] = {}
    
    @classmethod
    def register(cls, agent: BaseCircuMetalAgent):
        """Register an agent."""
        cls._agents[agent.name] = agent
    
    @classmethod
    def get(cls, name: str) -> Optional[BaseCircuMetalAgent]:
        """Get an agent by name."""
        return cls._agents.get(name)
    
    @classmethod
    def list_agents(cls) -> List[str]:
        """List all registered agent names."""
        return list(cls._agents.keys())
    
    @classmethod
    async def cleanup(cls):
        """Close all agent HTTP clients."""
        for agent in cls._agents.values():
            await agent.close()
