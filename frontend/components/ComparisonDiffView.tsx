'use client';

import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { Execution, RunComparisonResult } from '../lib/types';

interface ComparisonDiffViewProps {
  executions: Execution[];
  onSelectExecution: (id: string) => void;
}

export const ComparisonDiffView: React.FC<ComparisonDiffViewProps> = ({
  executions,
  onSelectExecution,
}) => {
  const successRuns = executions.filter(
    (e) => e.status === 'COMPLETED' || e.status === 'RECOVERED',
  );
  const failedRuns = executions.filter((e) => e.status === 'FAILED');

  const [baseRunId, setBaseRunId] = useState<string>(
    successRuns[0]?.executionId || executions[0]?.executionId || '',
  );
  const [targetRunId, setTargetRunId] = useState<string>(
    failedRuns[0]?.executionId || executions[1]?.executionId || '',
  );
  const [comparison, setComparison] = useState<RunComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (baseRunId && targetRunId && baseRunId !== targetRunId) {
      loadComparison(baseRunId, targetRunId);
    }
  }, [baseRunId, targetRunId]);

  const loadComparison = async (base: string, target: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.compareRuns(base, target);
      setComparison(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner & Run Pickers */}
      <div className="glass-panel rounded-xl p-5 border-l-4 border-l-blue-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Execution Comparison &amp; Divergence Analysis
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Side-by-side behavioral diff between two executions. Pinpoint exact divergence points,
              input drift, latency anomalies, and failure onset.
            </p>
          </div>

          {/* Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">
                Base Run (Baseline / Success):
              </label>
              <select
                aria-label="Select base execution run"
                value={baseRunId}
                onChange={(e) => setBaseRunId(e.target.value)}
                className="w-full bg-[#0B0F17] border border-white/10 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/50 truncate"
              >
                {executions.map((e) => (
                  <option key={e.executionId} value={e.executionId}>
                    {e.executionId} ({e.status}) - {e.workflowName}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-gray-500 font-bold self-center sm:self-end sm:pb-2 text-xs">vs</div>

            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">
                Target Run (Failed / Candidate):
              </label>
              <select
                aria-label="Select target execution run"
                value={targetRunId}
                onChange={(e) => setTargetRunId(e.target.value)}
                className="w-full bg-[#0B0F17] border border-white/10 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/50 truncate"
              >
                {executions.map((e) => (
                  <option key={e.executionId} value={e.executionId}>
                    {e.executionId} ({e.status}) - {e.workflowName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-panel rounded-xl p-12 text-center text-gray-400 text-xs">
          Computing run diff and aligning step execution trees...
        </div>
      )}

      {error && (
        <div className="glass-panel rounded-xl p-4 bg-rose-500/10 border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {comparison && !loading && (
        <div className="space-y-6">
          {/* Divergence Point Banner */}
          {comparison.divergencePoint && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Divergence Point Detected: Step &quot;{comparison.divergencePoint.stepKey}&quot;
                </div>
                <p className="text-xs text-amber-200 mt-1 leading-relaxed">
                  {comparison.divergencePoint.reason}
                </p>
              </div>
            </div>
          )}

          {/* Metrics Delta Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                Duration Delta
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-white flex items-center space-x-1">
                <span>
                  {comparison.metricsDelta.durationDeltaMs > 0 ? '+' : ''}
                  {comparison.metricsDelta.durationDeltaMs}ms
                </span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                Token Usage Delta
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-cyan-400">
                {comparison.metricsDelta.tokenDelta > 0 ? '+' : ''}
                {comparison.metricsDelta.tokenDelta.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                Cost Delta (USD)
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-emerald-400">
                {comparison.metricsDelta.costDeltaUsd > 0 ? '+' : ''}$
                {comparison.metricsDelta.costDeltaUsd.toFixed(4)}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                Status Delta
              </span>
              <div className="mt-1 text-xs font-mono font-bold flex items-center space-x-2">
                <span className="text-emerald-400">{comparison.baseExecution.status}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span className="text-rose-400">{comparison.targetExecution.status}</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Alignment Table */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Step-by-Step Behavioral Alignment ({comparison.stepComparisons.length} steps)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F17] text-gray-400 font-mono text-[11px] border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Step Key &amp; Name</th>
                    <th className="py-3 px-4">Base Status</th>
                    <th className="py-3 px-4">Target Status</th>
                    <th className="py-3 px-4">Duration Delta</th>
                    <th className="py-3 px-4">Token Delta</th>
                    <th className="py-3 px-4">Input Drift</th>
                    <th className="py-3 px-4">Diagnostic Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {comparison.stepComparisons.map((step) => {
                    return (
                      <tr
                        key={step.stepKey}
                        className={`transition-all ${
                          step.isDivergencePoint
                            ? 'bg-amber-500/10 font-bold border-l-4 border-l-amber-500'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="text-white font-semibold font-sans">{step.name}</div>
                          <div className="text-[10px] text-gray-500">{step.stepKey}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              step.baseStatus === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {step.baseStatus || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              step.targetStatus === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 font-bold'
                                : step.targetStatus === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {step.targetStatus || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-300">
                          {step.durationDeltaMs !== undefined ? (
                            <span>
                              {step.durationDeltaMs > 0 ? '+' : ''}
                              {step.durationDeltaMs}ms
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>

                        <td className="py-3 px-4 text-cyan-400">
                          {step.tokenDelta !== undefined ? (
                            <span>
                              {step.tokenDelta > 0 ? '+' : ''}
                              {step.tokenDelta} tok
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {step.inputDriftDetected ? (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Drift Detected
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">Identical</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-400 font-sans text-xs max-w-xs truncate">
                          {step.isDivergencePoint ? (
                            <span className="text-amber-300 font-semibold font-mono">
                              ⭐ Initial point of failure divergence
                            </span>
                          ) : step.targetError ? (
                            <span className="text-rose-400 truncate">{step.targetError}</span>
                          ) : (
                            'Nominal execution'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
