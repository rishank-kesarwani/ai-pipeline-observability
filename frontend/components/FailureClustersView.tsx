'use client';

import React, { useState } from 'react';
import {
  Flame,
  ShieldAlert,
  ArrowRight,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Layers,
  Calendar,
} from 'lucide-react';
import { FailureCluster, FailureCategory } from '../lib/types';

interface FailureClustersViewProps {
  clusters: FailureCluster[];
  onSelectExecution: (id: string) => void;
  isLoading: boolean;
}

export const FailureClustersView: React.FC<FailureClustersViewProps> = ({
  clusters,
  onSelectExecution,
  isLoading,
}) => {
  const [selectedHash, setSelectedHash] = useState<string | null>(
    clusters[0]?.signatureHash || null,
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="glass-panel rounded-xl p-5 border-l-4 border-l-rose-500">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Failure Signature Clustering &amp; Forensics
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Normalized error signatures group recurring failure patterns across all workflows,
              isolating common root causes and providing actionable recovery policies.
            </p>
          </div>
        </div>
      </div>

      {/* Clusters List & Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clusters List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Active Failure Clusters ({clusters.length})
          </div>

          <div className="space-y-2.5">
            {clusters.map((cluster) => {
              const isSelected = cluster.signatureHash === selectedHash;
              return (
                <div
                  key={cluster.signatureHash}
                  onClick={() => setSelectedHash(cluster.signatureHash)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : 'glass-panel hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {cluster.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">
                      {cluster.frequency} occurrences
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-mono text-gray-200 line-clamp-2 leading-relaxed">
                    {cluster.normalizedSignature}
                  </p>

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>Hash: {cluster.signatureHash}</span>
                    <span>{cluster.affectedWorkflows?.length || 1} workflows</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Cluster Deep-Dive */}
        <div className="lg:col-span-2">
          {(() => {
            const active = clusters.find((c) => c.signatureHash === selectedHash) || clusters[0];
            if (!active) {
              return (
                <div className="glass-panel rounded-xl p-12 text-center text-gray-400 text-xs">
                  No failure clusters detected. All workflows executing nominally!
                </div>
              );
            }

            return (
              <div className="glass-panel rounded-xl p-6 space-y-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      Cluster Signature
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      [{active.signatureHash}]
                    </span>
                  </div>
                  <h3 className="mt-2 p-3 rounded-lg bg-[#0B0F17] border border-white/10 text-sm font-mono text-rose-300 break-words">
                    {active.normalizedSignature}
                  </h3>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                      Total Frequency
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {active.frequency}x
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                      First Observed
                    </div>
                    <div className="text-xs font-mono text-gray-300 mt-1">
                      {new Date(active.firstSeenAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                      Last Observed
                    </div>
                    <div className="text-xs font-mono text-gray-300 mt-1">
                      {new Date(active.lastSeenAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Root Cause Hypothesis Card */}
                {active.rootCauseHypothesis && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <Zap className="w-4 h-4" />
                        <span>Root-Cause Hypothesis</span>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        Confidence: {Math.round(active.rootCauseHypothesis.confidence * 100)}%
                      </span>
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed">
                      {active.rootCauseHypothesis.statement}
                    </p>

                    {/* Cited Evidence */}
                    <div className="pt-2 border-t border-blue-500/10 space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Cited Trace Evidence:
                      </div>
                      {active.rootCauseHypothesis.evidence?.map((ev, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-black/40 border border-white/5 text-xs font-mono text-gray-300"
                        >
                          <span className="text-blue-400 font-bold">Step &quot;{ev.stepKey}&quot;: </span>
                          <span>{ev.observation}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-gray-300">
                      <strong className="text-blue-300">Recommended Fix: </strong>
                      {active.rootCauseHypothesis.mitigation}
                    </div>
                  </div>
                )}

                {/* Recovery Recommendation */}
                {active.recoveryRecommendation && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Recovery Recommendation</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">
                      {active.recoveryRecommendation.explanation}
                    </p>
                  </div>
                )}

                {/* Sample Executions */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Sample Executions in Cluster:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {active.sampleExecutionIds?.map((id) => (
                      <button
                        key={id}
                        onClick={() => onSelectExecution(id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 text-xs font-mono text-blue-300 transition-all flex items-center space-x-1"
                      >
                        <span>{id}</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
