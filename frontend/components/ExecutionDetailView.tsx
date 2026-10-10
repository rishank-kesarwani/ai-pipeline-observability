'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  GitBranch,
  Layers,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Execution,
  TraceStep,
  Checkpoint,
  RecoveryAction,
  FailureCluster,
} from '../lib/types';

interface ExecutionDetailViewProps {
  execution: Execution;
  steps: TraceStep[];
  checkpoints: Checkpoint[];
  recoveries: RecoveryAction[];
  cluster: FailureCluster | null;
  onBack: () => void;
  onOpenStepInspector: (step: TraceStep) => void;
  onInitiateRecovery: (checkpointId?: string) => void;
  onApproveRecovery: (recoveryId: string) => void;
}

export const ExecutionDetailView: React.FC<ExecutionDetailViewProps> = ({
  execution,
  steps,
  checkpoints,
  recoveries,
  cluster,
  onBack,
  onOpenStepInspector,
  onInitiateRecovery,
  onApproveRecovery,
}) => {
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | undefined>(
    execution.lastValidCheckpointId,
  );

  const maxStepDuration = Math.max(...steps.map((s) => s.durationMs || 100), 1000);

  const pendingApproval = recoveries.find(
    (r) => r.status === 'PENDING_OPERATOR_APPROVAL',
  );

  return (
    <div className="space-y-6">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Executions</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Execution:</span>
          <span className="text-xs font-mono text-blue-400 font-semibold">
            {execution.executionId}
          </span>
        </div>
      </div>

      {/* Main Execution Summary Header */}
      <div className="glass-panel rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {execution.workflowName}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  execution.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : execution.status === 'FAILED'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                    : execution.status === 'RECOVERED'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                }`}
              >
                {execution.status}
              </span>
              {execution.isRecovered && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  Recovered Run
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="font-mono text-gray-300">
                Workflow: {execution.workflowId}
              </span>
              <span>•</span>
              <span className="font-mono text-blue-400 font-medium">
                Project: {execution.project}
              </span>
              <span>•</span>
              <span>Started: {new Date(execution.startTime).toLocaleTimeString()}</span>
              {execution.initiatedBy && (
                <>
                  <span>•</span>
                  <span>Triggered by: {execution.initiatedBy}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
            <div className="text-right">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Duration</div>
              <div className="text-base font-bold font-mono text-white">
                {execution.durationMs}ms
              </div>
            </div>
            <div className="text-right border-l border-white/10 pl-4">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Total Tokens</div>
              <div className="text-base font-bold font-mono text-cyan-400">
                {execution.totalTokens.toLocaleString()}
              </div>
            </div>
            <div className="text-right border-l border-white/10 pl-4">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Est. Cost</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                ${execution.estimatedCostUsd?.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        {/* If Execution is Failed: Primary Recovery CTA */}
        {execution.status === 'FAILED' && (
          <div className="mt-4 pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/5 -mx-5 -mb-5 px-5 py-3">
            <div className="flex items-center space-x-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                Workflow halted due to{' '}
                <strong className="font-mono">{execution.failureCategory}</strong>. Durable
                checkpoints are available to safely resume.
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onInitiateRecovery(selectedCheckpointId)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume from Last Valid Checkpoint</span>
              </button>
            </div>
          </div>
        )}

        {/* Pending Operator Approval Banner */}
        {pendingApproval && (
          <div className="mt-4 pt-4 border-t border-amber-500/30 bg-amber-500/10 -mx-5 -mb-5 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Action Required:</strong> A recovery replay contains non-idempotent
                external side-effects ({pendingApproval.targetStepKey}). Human operator approval
                is required before execution.
              </span>
            </div>

            <button
              onClick={() => onApproveRecovery(pendingApproval.recoveryId)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-xs rounded-lg transition-all"
            >
              Review & Approve
            </button>
          </div>
        )}
      </div>

      {/* Grid: Left Column = Flamegraph Step Tree; Right Column = Forensics & Checkpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Step Timeline & Flamegraph */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Execution Trace Timeline & Flamegraph ({steps.length} Steps)
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Click step to inspect inputs, outputs & payloads
              </span>
            </div>

            {/* Steps Flamegraph List */}
            <div className="p-4 space-y-2">
              {steps.map((step, idx) => {
                const widthPercent = Math.max(
                  Math.min(Math.round(((step.durationMs || 100) / maxStepDuration) * 100), 100),
                  12,
                );

                const isFailed = step.status === 'FAILED';
                const isSkipped = step.status === 'SKIPPED';
                const isCompleted = step.status === 'COMPLETED';

                return (
                  <div
                    key={step.stepId}
                    onClick={() => onOpenStepInspector(step)}
                    className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                      isFailed
                        ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60'
                        : isSkipped
                        ? 'bg-gray-800/40 border-white/5 opacity-50'
                        : 'bg-[#111827]/90 border-white/5 hover:border-blue-500/30 hover:bg-[#1F2937]'
                    }`}
                    style={{ marginLeft: `${(step.depth || 0) * 16}px` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Step Title & Type */}
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {isFailed && (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                        )}
                        {isSkipped && (
                          <span className="w-4 h-4 rounded-full border border-gray-600 inline-block shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {step.name || step.stepKey}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.2 rounded bg-white/5">
                              {step.type}
                            </span>
                            {step.model && (
                              <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
                                {step.model}
                              </span>
                            )}
                            {!step.isIdempotent && (
                              <span
                                className="text-[10px] font-mono text-amber-300 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20"
                                title={step.sideEffectDescription}
                              >
                                Non-Idempotent
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                            Key: {step.stepKey} {step.parentStepKey && `• Parent: ${step.parentStepKey}`}
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-semibold text-gray-200">
                          {step.durationMs}ms
                        </div>
                        {step.totalTokens > 0 && (
                          <div className="text-[10px] font-mono text-gray-400">
                            {step.totalTokens} tok • ${step.estimatedCostUsd?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proportional Duration Bar (Flamegraph visual) */}
                    <div className="mt-2.5 h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFailed
                            ? 'bg-rose-500'
                            : isSkipped
                            ? 'bg-gray-600'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>

                    {/* Error Banner preview if failed */}
                    {isFailed && step.errorDetails && (
                      <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-500/20 text-[11px] font-mono text-rose-300 truncate">
                        {step.errorDetails.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Forensics, Root-Cause & Checkpoints */}
        <div className="space-y-6">
          {/* Forensics Card (if failed or has cluster) */}
          {execution.failureCategory && cluster && (
            <div className="glass-panel rounded-xl p-5 border-rose-500/30 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400">
                <Flame className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Failure Forensics & Root-Cause
                </h3>
              </div>

              {/* Typed Failure Category */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Error Signature
                </div>
                <div className="mt-1 p-2 rounded bg-[#0B0F17] border border-white/10 text-xs font-mono text-rose-300 break-words">
                  {cluster.normalizedSignature}
                </div>
                <div className="mt-1 text-[10px] font-mono text-gray-500">
                  Signature Hash: {cluster.signatureHash} • Frequency: {cluster.frequency}x
                </div>
              </div>

              {/* AI Root-Cause Hypothesis with Cited Evidence */}
              {cluster.rootCauseHypothesis && (
                <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span>Root-Cause Hypothesis</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                      Confidence: {Math.round(cluster.rootCauseHypothesis.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-gray-200 leading-relaxed">
                    {cluster.rootCauseHypothesis.statement}
                  </p>

                  {/* Explicit Trace Evidence Citations */}
                  <div className="mt-2 pt-2 border-t border-blue-500/10">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Cited Trace Evidence:
                    </div>
                    {cluster.rootCauseHypothesis.evidence?.map((ev, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-mono text-gray-300 bg-black/30 p-1.5 rounded border border-white/5 space-y-0.5"
                      >
                        <div className="text-blue-400 font-bold">
                          Step: {ev.stepKey} [{ev.culpritType}]
                        </div>
                        <div className="text-gray-400 truncate">{ev.observation}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1 text-[11px] text-gray-400">
                    <strong className="text-gray-300">Mitigation: </strong>
                    {cluster.rootCauseHypothesis.mitigation}
                  </div>
                </div>
              )}

              {/* Recovery Recommendation */}
              {cluster.recoveryRecommendation && (
                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Recovery Recommendation</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {cluster.recoveryRecommendation.actionType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {cluster.recoveryRecommendation.explanation}
                  </p>
                  {cluster.recoveryRecommendation.requiresOperatorApproval && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 flex items-start space-x-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Requires human operator sign-off before replaying non-idempotent tool.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Durable Checkpoints Section */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  Durable Checkpoints ({checkpoints.length})
                </h3>
              </div>
            </div>

            {checkpoints.length === 0 ? (
              <p className="text-xs text-gray-500">
                No checkpoints saved for this execution yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {checkpoints.map((cp) => {
                  const isSelected = cp.checkpointId === selectedCheckpointId;
                  return (
                    <div
                      key={cp.checkpointId}
                      onClick={() => setSelectedCheckpointId(cp.checkpointId)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                          : 'bg-[#111827] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white">
                          {cp.checkpointId}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          Step: {cp.stepKey}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400 font-mono truncate">
                        Completed: {cp.completedStepKeys?.join(', ')}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        Snapshot saved: {new Date(cp.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
