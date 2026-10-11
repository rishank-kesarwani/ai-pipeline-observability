'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Filter,
  Search,
  Zap,
  ArrowRight,
  Flame,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { Execution, ExecutionStatus, FailureCategory } from '../lib/types';

interface ExecutionsViewProps {
  executions: Execution[];
  onSelectExecution: (id: string) => void;
  selectedExecutionId?: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export const ExecutionsView: React.FC<ExecutionsViewProps> = ({
  executions,
  onSelectExecution,
  selectedExecutionId,
  isLoading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Filter executions
  const filtered = executions.filter((exec) => {
    if (statusFilter !== 'ALL' && exec.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && exec.failureCategory !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = exec.workflowName?.toLowerCase().includes(q);
      const matchId = exec.executionId?.toLowerCase().includes(q);
      const matchProj = exec.project?.toLowerCase().includes(q);
      const matchErr = exec.errorSignature?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchProj && !matchErr) return false;
    }
    return true;
  });

  // Calculate high-level KPIs
  const totalCount = executions.length;
  const failedCount = executions.filter((e) => e.status === 'FAILED').length;
  const failureRate = totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0;
  const totalCost = executions.reduce((acc, e) => acc + (e.estimatedCostUsd || 0), 0);
  const avgLatency =
    totalCount > 0
      ? Math.round(executions.reduce((acc, e) => acc + (e.durationMs || 0), 0) / totalCount)
      : 0;

  const getStatusBadge = (status: ExecutionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            FAILED
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3 h-3 mr-1" />
            RECOVERED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-3 h-3 mr-1 animate-spin" />
            RUNNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category?: FailureCategory) => {
    if (!category) return null;
    const colors: Record<string, string> = {
      TIMEOUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      TOOL_FAILURE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      SCHEMA_FAILURE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      POLICY_DENIAL: 'bg-red-500/10 text-red-400 border-red-500/20',
      RETRIEVAL_FAILURE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      MODEL_FAILURE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
          colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }`}
      >
        <ShieldAlert className="w-2.5 h-2.5 mr-1" />
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Executions */}
        <div className="glass-panel rounded-xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Runs
            </span>
            <Activity className="h-4 w-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white truncate">{totalCount}</div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 flex items-center space-x-1">
            <span className="text-emerald-400 font-medium">100% monitored</span>
          </div>
        </div>

        {/* Failure Rate */}
        <div className="glass-panel rounded-xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
              Failure Rate
            </span>
            <Flame className="h-4 w-4 text-rose-400 shrink-0" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-rose-400 truncate">
            {failureRate}%
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 truncate">
            {failedCount} of {totalCount} runs halted
          </div>
        </div>

        {/* Mean Latency */}
        <div className="glass-panel rounded-xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
              Avg Latency
            </span>
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2 text-lg xs:text-xl sm:text-2xl font-bold font-mono text-white truncate">
            {avgLatency} <span className="text-xs text-gray-400 font-sans font-normal">ms</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 truncate">Step execution average</div>
        </div>

        {/* Total Cost */}
        <div className="glass-panel rounded-xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
              Cost (USD)
            </span>
            <Coins className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 text-lg xs:text-xl sm:text-2xl font-bold font-mono text-emerald-400 truncate">
            ${totalCost.toFixed(4)}
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 truncate">Estimated token pricing</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search execution ID, workflow, error..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              aria-label="Filter by execution status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#0B0F17] border border-white/10 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="FAILED">FAILED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="RECOVERED">RECOVERED</option>
              <option value="RUNNING">RUNNING</option>
            </select>
          </div>

          {/* Failure Category Filter */}
          <select
            aria-label="Filter by failure category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-initial bg-[#0B0F17] border border-white/10 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="ALL">All Error Classes</option>
            <option value="TIMEOUT">TIMEOUT</option>
            <option value="TOOL_FAILURE">TOOL_FAILURE</option>
            <option value="SCHEMA_FAILURE">SCHEMA_FAILURE</option>
            <option value="POLICY_DENIAL">POLICY_DENIAL</option>
            <option value="RETRIEVAL_FAILURE">RETRIEVAL_FAILURE</option>
            <option value="MODEL_FAILURE">MODEL_FAILURE</option>
          </select>

          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-[#0B0F17] border border-white/10 hover:border-white/20 rounded-lg text-xs text-gray-300 hover:text-white transition-all shrink-0 ml-auto sm:ml-0"
            title="Refresh feed"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Execution List / Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider shrink-0">
            Execution Traces ({filtered.length})
          </h2>
          <span className="hidden sm:inline text-[11px] text-gray-500 font-mono">
            Click any execution to inspect flamegraph & checkpoints
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No execution traces match your filters.</p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search criteria or click &quot;Simulate Run&quot; above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((exec) => {
              const isSelected = exec.executionId === selectedExecutionId;
              return (
                <div
                  key={exec.executionId}
                  onClick={() => onSelectExecution(exec.executionId)}
                  className={`p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600/10 border-l-4 border-l-blue-500'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Left: Status & Workflow info */}
                  <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <div className="pt-0.5 shrink-0">{getStatusBadge(exec.status)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-none">
                          {exec.workflowName}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {exec.executionId}
                        </span>
                        {exec.isRecovered && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Resumed
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-400">
                        <span className="text-blue-400 font-medium font-mono text-[11px]">
                          {exec.project}
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{exec.durationMs}ms</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Cpu className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{exec.totalTokens.toLocaleString()} tokens</span>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          ${exec.estimatedCostUsd?.toFixed(4)}
                        </span>
                        {exec.lastValidCheckpointId && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400 font-mono text-[11px]">
                              📍 Checkpoint saved
                            </span>
                          </>
                        )}
                      </div>

                      {/* Error snippet if failed */}
                      {exec.failureCategory && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {getCategoryBadge(exec.failureCategory)}
                          <span className="text-[11px] text-rose-300/90 font-mono truncate max-w-full">
                            {exec.errorSignature || 'Execution failure detected'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action button */}
                  <div className="flex items-center space-x-2 shrink-0 self-start md:self-center pt-1 md:pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectExecution(exec.executionId);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 text-gray-300 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 text-xs font-medium transition-all"
                    >
                      <span>Inspect Forensics</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
