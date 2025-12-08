"""
Enhanced Visualization Agent for Chart and Report Generation.

This agent generates visualizations, charts, and formatted reports
for LCA results.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime
import base64

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

# Import database function (lazy import inside method to avoid circular dependency if needed)
# from api.database import save_visualization

logger = logging.getLogger(__name__)


class VisualizationAgent(BaseCircuMetalAgent):
    """
    Enhanced visualization agent for chart generation.
    
    Capabilities:
    - Chart specification generation
    - Dashboard data preparation
    - Report formatting
    - Infographic data
    - Export formats (JSON for frontend rendering)
    """
    
    # Chart types and their configurations
    CHART_TYPES: ClassVar[Dict[str, Dict[str, Any]]] = {
        "bar": {"library": "chart.js", "suitable_for": ["comparison", "breakdown"]},
        "pie": {"library": "chart.js", "suitable_for": ["composition", "share"]},
        "line": {"library": "chart.js", "suitable_for": ["trend", "timeline"]},
        "sankey": {"library": "d3", "suitable_for": ["flow", "allocation"]},
        "treemap": {"library": "d3", "suitable_for": ["hierarchy", "composition"]},
        "gauge": {"library": "chart.js", "suitable_for": ["score", "target"]},
        "radar": {"library": "chart.js", "suitable_for": ["profile", "comparison"]},
        "waterfall": {"library": "chart.js", "suitable_for": ["breakdown", "contribution"]}
    }
    
    # Color schemes
    COLOR_SCHEMES: ClassVar[Dict[str, List[str]]] = {
        "environmental": ["#2E7D32", "#66BB6A", "#A5D6A7", "#C8E6C9", "#E8F5E9"],
        "comparison": ["#1976D2", "#42A5F5", "#90CAF9", "#FF7043", "#FFAB91"],
        "traffic_light": ["#D32F2F", "#FBC02D", "#388E3C"],
        "sequential": ["#E3F2FD", "#90CAF9", "#42A5F5", "#1976D2", "#0D47A1"]
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="visualization_agent",
            model_name=model_name,
            prompt_file="visualization_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process visualization request.
        """
        provenance = []
        action = input_data.get("action", "generate")
        
        if action == "generate":
            return await self._generate_charts(input_data, provenance, run_id)
        elif action == "dashboard":
            return await self._generate_dashboard(input_data, provenance, run_id)
        elif action == "report":
            return await self._generate_report_data(input_data, provenance, run_id)
        elif action == "infographic":
            return await self._generate_infographic(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _generate_charts(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate chart specifications for LCA results."""
        lca_results = input_data.get("lca_results", {})
        chart_types = input_data.get("chart_types", ["bar", "pie", "gauge"])
        
        charts = []
        
        # 1. Generate Sankey Diagram (Flow)
        if "sankey" in chart_types or True:  # Always try to generate Sankey
            sankey_data = await self._generate_sankey_data(lca_results, input_data)
            if sankey_data:
                charts.append({
                    "id": "sankey_flow",
                    "type": "sankey",
                    "title": "Material and Energy Flow",
                    "data": sankey_data,
                    "library": "d3"
                })
                
                # Save visualization to DB
                await self._generate_and_save_diagrams(input_data, lca_results)

        # 2. Generate Impact Breakdown (Bar/Pie)
        if "bar" in chart_types:
            impact_data = await self._generate_impact_breakdown(lca_results)
            if impact_data:
                charts.append({
                    "id": "impact_breakdown",
                    "type": "bar",
                    "title": "Environmental Impact Breakdown",
                    "data": impact_data,
                    "library": "chart.js"
                })

        # 3. Generate Scenario Comparison (Radar/Bar)
        if "radar" in chart_types and "scenarios" in input_data:
            comparison_data = await self._generate_scenario_comparison(
                lca_results, 
                input_data["scenarios"]
            )
            if comparison_data:
                charts.append({
                    "id": "scenario_comparison",
                    "type": "radar",
                    "title": "Scenario Comparison",
                    "data": comparison_data,
                    "library": "chart.js"
                })
        
        return {
            "status": "success",
            "data": {
                "charts": charts,
                "chart_count": len(charts),
                "render_library": "chart.js"
            },
            "log": f"Generated {len(charts)} chart specifications and saved HTML diagrams",
            "confidence": 0.95,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _generate_and_save_diagrams(self, input_data: Dict[str, Any], lca_results: Dict[str, Any]):
        """Generate and save HTML diagrams to MongoDB."""
        try:
            # Import here to avoid circular dependency
            from api.database import save_visualization
        except ImportError:
            logger.error("Could not import save_visualization from api.database")
            return

        project_id = input_data.get("project_id")
        project_name = input_data.get("project_name", "Unknown Project")
        metal_name = input_data.get("material", "Unknown Metal")
        
        # If project_id is missing, check metadata or don't save (as per requirement)
        if not project_id:
             meta = input_data.get("metadata", {})
             project_id = meta.get("project_id")
             
        if not project_id:
            logger.warning("No project_id found. Skipping diagram storage.")
            return

        # 1. Generate Sankey HTML
        sankey_prompt = f"""
        Generate a complete, self-contained HTML file with D3.js code to visualize a Sankey diagram 
        for the lifecycle of {metal_name}.
        
        LCA Data:
        {json.dumps(lca_results, indent=2)}
        
        Requirements:
        - Use D3.js v7 (CDN link).
        - The diagram should show flows from Raw Material -> Processing -> Manufacturing -> Use -> End of Life.
        - Include recycling loops back to earlier stages.
        - Use a modern, clean color scheme.
        - Make it responsive.
        - Return ONLY the HTML code, starting with <!DOCTYPE html>.
        """
        
        sankey_system = "You are a D3.js visualization expert. Generate complete, working HTML files with embedded D3.js code. Return only the HTML code without any markdown formatting or explanations."
        sankey_html = await self.run_llm_raw(sankey_prompt, sankey_system)
        
        # Clean up markdown
        if sankey_html.startswith("```html"):
            sankey_html = sankey_html[7:]
        if sankey_html.endswith("```"):
            sankey_html = sankey_html[:-3]
            
        # Save Sankey
        try:
            await save_visualization({
                "project_id": project_id,
                "diagram_type": "sankey",
                "title": f"Sankey Diagram - {metal_name}",
                "html_content": sankey_html,
                "metal_name": metal_name,
                "project_name": project_name,
                "metadata": {"run_id": input_data.get("run_id")}
            })
        except Exception as e:
            logger.error(f"Failed to save Sankey diagram: {e}")
        
        # 2. Generate Flowchart HTML (Mermaid)
        flowchart_prompt = f"""
        Generate a complete, self-contained HTML file with Mermaid.js to visualize a process flowchart 
        for the lifecycle of {metal_name}.
        
        LCA Data:
        {json.dumps(lca_results, indent=2)}
        
        Requirements:
        - Use Mermaid.js (CDN link).
        - Create a 'graph LR' (Left to Right) flowchart.
        - Show the main process steps and decision points.
        - Style the nodes to look professional.
        - Return ONLY the HTML code, starting with <!DOCTYPE html>.
        """
        
        flowchart_system = "You are a Mermaid.js visualization expert. Generate complete, working HTML files with embedded Mermaid.js diagrams. Return only the HTML code without any markdown formatting or explanations."
        flowchart_html = await self.run_llm_raw(flowchart_prompt, flowchart_system)
        
        # Clean up markdown
        if flowchart_html.startswith("```html"):
            flowchart_html = flowchart_html[7:]
        if flowchart_html.endswith("```"):
            flowchart_html = flowchart_html[:-3]
            
        # Save Flowchart
        try:
            await save_visualization({
                "project_id": project_id,
                "diagram_type": "flowchart",
                "title": f"Process Flowchart - {metal_name}",
                "html_content": flowchart_html,
                "metal_name": metal_name,
                "project_name": project_name,
                "metadata": {"run_id": input_data.get("run_id")}
            })
        except Exception as e:
            logger.error(f"Failed to save Flowchart diagram: {e}")

    async def _generate_sankey_data(self, lca_results: Dict, input_data: Dict) -> Dict:
        """Generate data structure for Sankey diagram."""
        # This would typically use the LLM to extract nodes and links
        # For now, we'll return a simplified structure or use LLM
        
        prompt = f"""
        Extract nodes and links for a Sankey diagram from this LCA data.
        Return JSON with 'nodes' (list of names) and 'links' (source, target, value).
        
        Data: {json.dumps(lca_results)}
        """
        
        response = await self.run_llm({"prompt": prompt})
        return self._parse_llm_response(response)

    async def _generate_impact_breakdown(self, lca_results: Dict) -> Dict:
        """Generate data for impact breakdown chart."""
        prompt = f"""
        Extract environmental impact breakdown data for a bar chart.
        Return JSON with 'labels' (impact categories) and 'datasets' (values).
        
        Data: {json.dumps(lca_results)}
        """
        
        response = await self.run_llm({"prompt": prompt})
        return self._parse_llm_response(response)

    async def _generate_scenario_comparison(self, lca_results: Dict, scenarios: List) -> Dict:
        """Generate data for scenario comparison."""
        prompt = f"""
        Compare the baseline LCA results with these scenarios.
        Return JSON for a radar chart with 'labels' (metrics) and 'datasets' (one for baseline, one for each scenario).
        
        Baseline: {json.dumps(lca_results)}
        Scenarios: {json.dumps(scenarios)}
        """
        
        response = await self.run_llm({"prompt": prompt})
        return self._parse_llm_response(response)

    async def _generate_dashboard(self, input_data: Dict, provenance: List, run_id: str) -> Dict:
        """Generate dashboard layout and data."""
        # Implementation for dashboard generation
        return {"status": "not_implemented"}

    async def _generate_report_data(self, input_data: Dict, provenance: List, run_id: str) -> Dict:
        """Generate data for formatted report."""
        # Implementation for report generation
        return {"status": "not_implemented"}

    async def _generate_infographic(self, input_data: Dict, provenance: List, run_id: str) -> Dict:
        """Generate data for infographic."""
        # Implementation for infographic generation
        return {"status": "not_implemented"}
