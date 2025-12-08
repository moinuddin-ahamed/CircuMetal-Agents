"""
CircuMetal Agents Package

Enhanced multi-agent system for Life Cycle Assessment of metals.

This package provides:
- BaseCircuMetalAgent: Base class with service integration
- Domain-specific agents for LCA, compliance, estimation, etc.
- Agent registry for management
"""

# Base agent and utilities
from circu_metal.agents.base_agent import (
    BaseCircuMetalAgent,
    AgentResponse,
    ServiceConfig,
    AgentRegistry
)

# Enhanced agents (v2)
from circu_metal.agents.estimation_agent_v2 import EstimationAgentV2
from circu_metal.agents.lca_agent_v2 import LCAAgentV2
from circu_metal.agents.compliance_agent_v2 import ComplianceAgentV2
from circu_metal.agents.circularity_agent_v2 import CircularityAgentV2
from circu_metal.agents.scenario_agent_v2 import ScenarioAgentV2
from circu_metal.agents.data_agent_v2 import DataAgentV2
from circu_metal.agents.explain_agent_v2 import ExplainAgentV2
from circu_metal.agents.critique_agent_v2 import CritiqueAgentV2

# Visualization Agent (merged - no longer a separate v2)
from circu_metal.agents.visualization_agent import VisualizationAgent

# Legacy agents (for backward compatibility)
from circu_metal.agents.estimation_agent import EstimationAgent as LegacyEstimationAgent
from circu_metal.agents.lca_agent import LCAAgent as LegacyLCAAgent
from circu_metal.agents.compliance_agent import ComplianceAgent as LegacyComplianceAgent
from circu_metal.agents.circularity_agent import CircularityAgent as LegacyCircularityAgent
from circu_metal.agents.scenario_agent import ScenarioAgent as LegacyScenarioAgent
from circu_metal.agents.data_agent import DataAgent as LegacyDataAgent
from circu_metal.agents.explain_agent import ExplainAgent as LegacyExplainAgent
from circu_metal.agents.critique_agent import CritiqueAgent as LegacyCritiqueAgent

# Aliases - use v2 agents by default (VisualizationAgent is already the enhanced version)
EstimationAgent = EstimationAgentV2
LCAAgent = LCAAgentV2
ComplianceAgent = ComplianceAgentV2
CircularityAgent = CircularityAgentV2
ScenarioAgent = ScenarioAgentV2
DataAgent = DataAgentV2
ExplainAgent = ExplainAgentV2
CritiqueAgent = CritiqueAgentV2
# VisualizationAgent is already imported directly above

# All agent classes
ALL_AGENTS = [
    EstimationAgent,
    LCAAgent,
    ComplianceAgent,
    CircularityAgent,
    ScenarioAgent,
    DataAgent,
    ExplainAgent,
    CritiqueAgent,
    VisualizationAgent
]

# Agent name to class mapping
AGENT_MAP = {
    "estimation_agent": EstimationAgent,
    "lca_agent": LCAAgent,
    "compliance_agent": ComplianceAgent,
    "circularity_agent": CircularityAgent,
    "scenario_agent": ScenarioAgent,
    "data_agent": DataAgent,
    "explain_agent": ExplainAgent,
    "critique_agent": CritiqueAgent,
    "visualization_agent": VisualizationAgent
}


def create_agent(
    agent_name: str,
    model_name: str = "gemini-2.0-flash-001",
    service_config: ServiceConfig = None
) -> BaseCircuMetalAgent:
    """
    Factory function to create an agent by name.
    
    Args:
        agent_name: Name of the agent to create
        model_name: LLM model to use
        service_config: Configuration for microservices
        
    Returns:
        Agent instance
        
    Raises:
        ValueError: If agent name is not recognized
    """
    agent_class = AGENT_MAP.get(agent_name)
    if not agent_class:
        raise ValueError(f"Unknown agent: {agent_name}. Available: {list(AGENT_MAP.keys())}")
    
    return agent_class(model_name=model_name, service_config=service_config)


def create_all_agents(
    model_name: str = "gemini-2.0-flash-001",
    service_config: ServiceConfig = None,
    register: bool = True
) -> dict:
    """
    Create instances of all agents.
    
    Args:
        model_name: LLM model to use
        service_config: Configuration for microservices
        register: Whether to register agents in AgentRegistry
        
    Returns:
        Dictionary of agent instances
    """
    agents = {}
    
    for name, agent_class in AGENT_MAP.items():
        agent = agent_class(model_name=model_name, service_config=service_config)
        agents[name] = agent
        
        if register:
            AgentRegistry.register(agent)
    
    return agents


__all__ = [
    # Base
    "BaseCircuMetalAgent",
    "AgentResponse",
    "ServiceConfig",
    "AgentRegistry",
    
    # Agents
    "EstimationAgent",
    "LCAAgent",
    "ComplianceAgent",
    "CircularityAgent",
    "ScenarioAgent",
    "DataAgent",
    "ExplainAgent",
    "CritiqueAgent",
    "VisualizationAgent",
    
    # V2 explicit
    "EstimationAgentV2",
    "LCAAgentV2",
    "ComplianceAgentV2",
    "CircularityAgentV2",
    "ScenarioAgentV2",
    "DataAgentV2",
    "ExplainAgentV2",
    "CritiqueAgentV2",
    "VisualizationAgentV2",
    
    # Factory
    "create_agent",
    "create_all_agents",
    "AGENT_MAP",
    "ALL_AGENTS"
]
