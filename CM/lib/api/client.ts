/**
 * CircuMetal API Client
 * 
 * Communicates with the Python FastAPI backend for LCA analysis
 */

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface InventoryItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  source?: 'primary' | 'secondary' | 'recycled';
  recycled_content?: number;
  origin?: string;
  metadata?: Record<string, any>;
}

export interface InventoryData {
  name: string;
  project_id?: string;
  description?: string;
  items: InventoryItem[];
  metadata?: Record<string, any>;
}

export interface ScenarioConfig {
  recycled_content_target?: number;
  energy_source?: string;
  transport_mode?: string;
  eol_strategy?: string;
  custom_parameters?: Record<string, any>;
}

export interface RunRequest {
  inventory_id: string;
  project_id?: string;
  name?: string;
  scenario_config?: ScenarioConfig;
  metadata?: Record<string, any>;
}

export interface RunStatus {
  run_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_agent?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
  logs?: Array<{
    timestamp: string;
    agent: string;
    level: string;
    message: string;
  }>;
}

export interface ImpactScores {
  gwp: number;
  ap?: number;
  ep?: number;
  energy_use: number;
  water_use?: number;
  unit: string;
}

export interface CircularityMetrics {
  mci: number;
  recycled_content: number;
  recyclability_rate: number;
  waste_reduction?: number;
  resource_efficiency?: number;
}

export interface RunResult {
  run_id: string;
  status: string;
  impact_scores: ImpactScores;
  circularity_metrics: CircularityMetrics;
  lifecycle_breakdown?: Record<string, any>;
  scenarios?: Array<Record<string, any>>;
  recommendations?: string[];
  visualizations?: {
    sankey_data?: any;
    impact_breakdown?: any;
    scenario_comparison?: any;
  };
  compliance?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ============================================================================
// API Client
// ============================================================================

class CircuMetalApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = PYTHON_API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{ status: string; agents: string[] }> {
    return this.request('/health');
  }

  // ========================================================================
  // Inventory Endpoints
  // ========================================================================

  async createInventory(data: InventoryData): Promise<{
    success: boolean;
    message: string;
    inventory_id: string;
    inventory: any;
  }> {
    return this.request('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInventory(inventoryId: string): Promise<any> {
    return this.request(`/api/inventory/${inventoryId}`);
  }

  async getProjectInventories(projectId: string): Promise<{ inventories: any[] }> {
    return this.request(`/api/inventory/project/${projectId}`);
  }

  async updateInventory(inventoryId: string, data: InventoryData): Promise<any> {
    return this.request(`/api/inventory/${inventoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInventory(inventoryId: string): Promise<{ success: boolean }> {
    return this.request(`/api/inventory/${inventoryId}`, {
      method: 'DELETE',
    });
  }

  // ========================================================================
  // Run Endpoints
  // ========================================================================

  async startRun(request: RunRequest): Promise<{
    success: boolean;
    message: string;
    run_id: string;
    status: string;
    estimated_time: number;
  }> {
    return this.request('/api/run', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRunStatus(runId: string): Promise<RunStatus> {
    return this.request(`/api/run/${runId}`);
  }

  async getRunResult(runId: string): Promise<RunResult> {
    return this.request(`/api/run/${runId}/result`);
  }

  async getRunReport(runId: string): Promise<{
    run_id: string;
    report_markdown: string;
    generated_at: string;
  }> {
    return this.request(`/api/run/${runId}/report`);
  }

  async getRecentRuns(limit: number = 10): Promise<{ runs: any[] }> {
    return this.request(`/api/runs/recent?limit=${limit}`);
  }

  async getProjectRuns(projectId: string): Promise<{ runs: any[] }> {
    return this.request(`/api/runs/project/${projectId}`);
  }

  // ========================================================================
  // Reference Data Endpoints
  // ========================================================================

  async getEmissionFactors(): Promise<Record<string, any>> {
    return this.request('/api/data/emission-factors');
  }

  async getCircularityBenchmarks(): Promise<Record<string, any>> {
    return this.request('/api/data/circularity-benchmarks');
  }

  async getMaterialProperties(): Promise<Record<string, any>> {
    return this.request('/api/data/material-properties');
  }

  async getProcessTemplates(): Promise<Record<string, any>> {
    return this.request('/api/data/process-templates');
  }

  // ========================================================================
  // Quick Estimate Endpoints
  // ========================================================================

  async estimateParameters(request: {
    material: string;
    process_type: string;
    region: string;
    parameters_needed?: string[];
  }): Promise<any> {
    return this.request('/api/estimate/parameters', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async estimateCircularity(request: {
    material: string;
    recycled_content: number;
    process_efficiency: number;
    eol_recycling_rate: number;
  }): Promise<any> {
    return this.request('/api/estimate/circularity', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Export singleton instance
export const apiClient = new CircuMetalApiClient();

// Export class for custom instances
export { CircuMetalApiClient };
