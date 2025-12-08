import sys
import os
import json
import re
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class CircuMetalLogFilter(logging.Filter):
    """Filter to replace Gemini model names with CircuMetal branding in logs."""
    
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


# Configure logging with CircuMetal branding BEFORE any imports
logging.basicConfig(level=logging.INFO, format='%(asctime)s - CircuMetal - %(levelname)s - %(message)s')
cm_filter = CircuMetalLogFilter()
for handler in logging.root.handlers:
    handler.addFilter(cm_filter)


# Add project root to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from circu_metal.orchestrator.orchestrator import Orchestrator
from circu_metal.utils.io import save_json, write_report_markdown

def main():
    print("\n=== CircuMetal: AI-Powered LCA & Circularity Analysis ===")
    
    if "--defaults" in sys.argv:
        print("Using default values (Non-interactive mode)...")
        process_description = "Recycling of aluminium scrap to produce secondary aluminium ingots."
        input_amount = "1 ton"
        material = "Aluminium Scrap"
        energy_source = "Grid Electricity"
        location = "Europe"
    else:
        print("Please enter the process details below.")
        print("(Press Enter to use the default value shown in brackets)\n")

        process_description = input("Process Description [Recycling of aluminium scrap...]: ").strip() or "Recycling of aluminium scrap to produce secondary aluminium ingots."
        input_amount = input("Input Amount [1 ton]: ").strip() or "1 ton"
        material = input("Material [Aluminium Scrap]: ").strip() or "Aluminium Scrap"
        energy_source = input("Energy Source [Grid Electricity]: ").strip() or "Grid Electricity"
        location = input("Location [Europe]: ").strip() or "Europe"

    user_input = {
        "process_description": process_description,
        "input_amount": input_amount,
        "material": material,
        "energy_source": energy_source,
        "location": location
    }

    print("\nInitializing CircuMetal Orchestrator...")
    orchestrator = Orchestrator()

    print("Starting analysis...")
    result = orchestrator.run(user_input)

    # Save full result
    save_json(result, "output/circumetal_result.json")
    print("Full result saved to output/circumetal_result.json")

    # Extract and save report
    if 'explain_agent' in result:
        explain_data = result['explain_agent'].get('data', {})
        report_md = explain_data.get('report_markdown', "")
        if report_md:
            write_report_markdown(report_md, "output/circumetal_report.md")
            print("Report saved to output/circumetal_report.md")
        else:
            print("No markdown report found in ExplainAgent output.")
    
    # Generate Sankey Diagram
    if 'visualization_agent' in result:
        vis_data = result['visualization_agent'].get('data', {})
        sankey_code = vis_data.get('sankey_python_code', "")
        if sankey_code:
            print("Generating Sankey Diagram...")
            try:
                # Execute the generated code to create the diagram
                # Warning: Executing generated code is risky in production.
                # Here we assume the agent is trusted or sandboxed.
                exec(sankey_code, {'__name__': '__main__'})
                print("Sankey diagram generated (check output/sankey_diagram.html).")
            except Exception as e:
                print(f"Failed to generate Sankey diagram: {e}")
                # Save the code for manual inspection
                with open("output/generate_sankey.py", "w") as f:
                    f.write(sankey_code)
                print("Saved failed Sankey code to output/generate_sankey.py")
        
        # Generate Pathway Comparison Chart
        pathway_code = vis_data.get('pathway_comparison_code', "")
        if pathway_code:
            print("Generating Pathway Comparison Chart...")
            try:
                exec(pathway_code, {'__name__': '__main__'})
                print("Pathway comparison chart generated (check output/pathway_comparison.html).")
            except Exception as e:
                print(f"Failed to generate Pathway Comparison chart: {e}")
                with open("output/generate_pathway_comparison.py", "w") as f:
                    f.write(pathway_code)
                print("Saved failed Pathway Comparison code to output/generate_pathway_comparison.py")

    # Print summary
    print("\nAnalysis Complete.")

if __name__ == "__main__":
    main()
