import axios from 'axios';
import {
  Execution,
  TraceStep,
  Checkpoint,
  RecoveryAction,
  FailureCluster,
  RunComparisonResult,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Executions
  getExecutions: async (params?: Record<string, any>): Promise<{ items: Execution[]; total: number }> => {
    const res = await apiClient.get('/executions', { params });
    return res.data;
  },

  getExecutionDetails: async (
    id: string,
  ): Promise<{
    execution: Execution;
    steps: TraceStep[];
    checkpoints: Checkpoint[];
    recoveries: RecoveryAction[];
    cluster: FailureCluster | null;
  }> => {
    const res = await apiClient.get(`/executions/${id}`);
    return res.data;
  },

  getTimeline: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/executions/${id}/timeline`);
    return res.data;
  },

  // Clusters
  getClusters: async (params?: Record<string, any>): Promise<FailureCluster[]> => {
    const res = await apiClient.get('/failures/clusters', { params });
    return res.data;
  },

  // Comparisons
  compareRuns: async (baseRunId: string, targetRunId: string): Promise<RunComparisonResult> => {
    const res = await apiClient.get('/comparisons', {
      params: { baseRunId, targetRunId },
    });
    return res.data;
  },

  // Checkpoints & Recovery
  initiateRecovery: async (data: {
    executionId: string;
    checkpointId?: string;
    actionType: string;
    notes?: string;
  }): Promise<RecoveryAction> => {
    const res = await apiClient.post('/recoveries/initiate', data);
    return res.data;
  },

  approveRecovery: async (
    recoveryId: string,
    data: {
      approvedBy: string;
      rationale: string;
      riskAssessment?: string;
    },
  ): Promise<RecoveryAction> => {
    const res = await apiClient.post(`/recoveries/${recoveryId}/approve`, data);
    return res.data;
  },

  // Audit
  getAuditLogs: async (params?: Record<string, any>): Promise<any[]> => {
    const res = await apiClient.get('/audit', { params });
    return res.data;
  },

  // Demo Sandbox & Simulation
  seedDemo: async (): Promise<any> => {
    const res = await apiClient.post('/demo/seed');
    return res.data;
  },

  simulateRun: async (workflowId?: string, failStep = false): Promise<any> => {
    const res = await apiClient.post('/demo/simulate-run', null, {
      params: { workflowId, failStep },
    });
    return res.data;
  },

  // Auth
  login: async (email: string, password: string): Promise<any> => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, name: string): Promise<any> => {
    const res = await apiClient.post('/auth/register', { email, password, name });
    return res.data;
  },

  getMe: async (): Promise<any> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  getConfig: async (): Promise<any> => {
    const res = await apiClient.get('/auth/config');
    return res.data;
  },
};
