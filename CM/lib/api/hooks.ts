/**
 * React Query hooks for CircuMetal API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  apiClient, 
  InventoryData, 
  RunRequest, 
  RunStatus, 
  RunResult 
} from './client';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  health: ['health'] as const,
  inventories: {
    all: ['inventories'] as const,
    byProject: (projectId: string) => ['inventories', 'project', projectId] as const,
    detail: (id: string) => ['inventories', 'detail', id] as const,
  },
  runs: {
    all: ['runs'] as const,
    recent: (limit?: number) => ['runs', 'recent', limit] as const,
    byProject: (projectId: string) => ['runs', 'project', projectId] as const,
    status: (id: string) => ['runs', 'status', id] as const,
    result: (id: string) => ['runs', 'result', id] as const,
    report: (id: string) => ['runs', 'report', id] as const,
  },
  referenceData: {
    emissionFactors: ['referenceData', 'emissionFactors'] as const,
    circularityBenchmarks: ['referenceData', 'circularityBenchmarks'] as const,
    materialProperties: ['referenceData', 'materialProperties'] as const,
    processTemplates: ['referenceData', 'processTemplates'] as const,
  },
};

// ============================================================================
// Health Check
// ============================================================================

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.health(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });
}

// ============================================================================
// Inventory Hooks
// ============================================================================

export function useInventory(inventoryId: string) {
  return useQuery({
    queryKey: queryKeys.inventories.detail(inventoryId),
    queryFn: () => apiClient.getInventory(inventoryId),
    enabled: !!inventoryId,
  });
}

export function useProjectInventories(projectId: string) {
  return useQuery({
    queryKey: queryKeys.inventories.byProject(projectId),
    queryFn: () => apiClient.getProjectInventories(projectId),
    enabled: !!projectId,
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: InventoryData) => apiClient.createInventory(data),
    onSuccess: (result: { success: boolean; inventory_id: string; inventory: Record<string, unknown> }) => {
      // Invalidate project inventories
      const projectId = result.inventory?.project_id as string | undefined;
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventories.byProject(projectId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventories.all,
      });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ inventoryId, data }: { inventoryId: string; data: InventoryData }) =>
      apiClient.updateInventory(inventoryId, data),
    onSuccess: (_result: unknown, variables: { inventoryId: string; data: InventoryData }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventories.detail(variables.inventoryId),
      });
    },
  });
}

export function useDeleteInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (inventoryId: string) => apiClient.deleteInventory(inventoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventories.all,
      });
    },
  });
}

// ============================================================================
// Run Hooks
// ============================================================================

export function useStartRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: RunRequest) => apiClient.startRun(request),
    onSuccess: (_result: unknown, variables: RunRequest) => {
      // Invalidate runs list
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs.all,
      });
      if (variables.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.runs.byProject(variables.project_id),
        });
      }
    },
  });
}

export function useRunStatus(runId: string, options?: { pollingInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.runs.status(runId),
    queryFn: () => apiClient.getRunStatus(runId),
    enabled: !!runId,
    refetchInterval: (query) => {
      // Poll while running
      const data = query.state.data as RunStatus | undefined;
      if (data?.status === 'pending' || data?.status === 'running') {
        return options?.pollingInterval || 2000;
      }
      return false;
    },
  });
}

export function useRunResult(runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.result(runId),
    queryFn: () => apiClient.getRunResult(runId),
    enabled: !!runId,
  });
}

export function useRunReport(runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.report(runId),
    queryFn: () => apiClient.getRunReport(runId),
    enabled: !!runId,
  });
}

export function useRecentRuns(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.runs.recent(limit),
    queryFn: () => apiClient.getRecentRuns(limit),
  });
}

export function useProjectRuns(projectId: string) {
  return useQuery({
    queryKey: queryKeys.runs.byProject(projectId),
    queryFn: () => apiClient.getProjectRuns(projectId),
    enabled: !!projectId,
  });
}

// ============================================================================
// Reference Data Hooks
// ============================================================================

export function useEmissionFactors() {
  return useQuery({
    queryKey: queryKeys.referenceData.emissionFactors,
    queryFn: () => apiClient.getEmissionFactors(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useCircularityBenchmarks() {
  return useQuery({
    queryKey: queryKeys.referenceData.circularityBenchmarks,
    queryFn: () => apiClient.getCircularityBenchmarks(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMaterialProperties() {
  return useQuery({
    queryKey: queryKeys.referenceData.materialProperties,
    queryFn: () => apiClient.getMaterialProperties(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useProcessTemplates() {
  return useQuery({
    queryKey: queryKeys.referenceData.processTemplates,
    queryFn: () => apiClient.getProcessTemplates(),
    staleTime: 1000 * 60 * 60,
  });
}

// ============================================================================
// Estimation Hooks
// ============================================================================

export function useEstimateParameters() {
  return useMutation({
    mutationFn: (request: {
      material: string;
      process_type: string;
      region: string;
      parameters_needed?: string[];
    }) => apiClient.estimateParameters(request),
  });
}

export function useEstimateCircularity() {
  return useMutation({
    mutationFn: (request: {
      material: string;
      recycled_content: number;
      process_efficiency: number;
      eol_recycling_rate: number;
    }) => apiClient.estimateCircularity(request),
  });
}
