'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
  Layers,
  FileCode,
} from 'lucide-react';
import { TraceStep } from '../lib/types';

interface StepInspectorModalProps {
  step: TraceStep | null;
  onClose: () => void;
}

export const StepInspectorModal: React.FC<StepInspectorModalProps> = ({
  step,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'error' | 'raw'>('input');

  if (!step) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {step.name || step.stepKey}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                  {step.type}
                </span>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    step.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : step.status === 'FAILED'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {step.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Key: {step.stepKey} • ID: {step.stepId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="px-5 py-3 border-b border-white/5 bg-[#0B0F17]/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-gray-300">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Duration:</span>
              <strong className="text-white font-mono">{step.durationMs}ms</strong>
            </span>
            {step.model && (
              <span className="flex items-center space-x-1 text-gray-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model:</span>
                <strong className="text-cyan-400 font-mono">{step.model}</strong>
              </span>
            )}
            {step.totalTokens > 0 && (
              <span className="flex items-center space-x-1 text-gray-300">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tokens:</span>
                <strong className="text-emerald-400 font-mono">
                  {step.totalTokens} (${step.estimatedCostUsd?.toFixed(4)})
                </strong>
              </span>
            )}
          </div>

          {/* Idempotency badge */}
          <div>
            {step.isIdempotent ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Safe & Idempotent Replay
              </span>
            ) : (
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                title={step.sideEffectDescription}
              >
                ⚠️ Non-Idempotent (Side-Effecting)
              </span>
            )}
          </div>
        </div>

        {/* Side-Effect Warning Banner if applicable */}
        {!step.isIdempotent && step.sideEffectDescription && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Side-Effect Warning: </strong>
              {step.sideEffectDescription}
            </span>
          </div>
        )}

        {/* Inspector Navigation Tabs */}
        <div className="flex border-b border-white/10 px-5 pt-2 bg-[#0B0F17]/30 space-x-2">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'input'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Sanitized Input Payload
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'output'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Output Payload
          </button>
          {step.errorDetails && (
            <button
              onClick={() => setActiveTab('error')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'error'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-rose-400/70 hover:text-rose-300'
              }`}
            >
              Error & Stack Forensics
            </button>
          )}
          <button
            onClick={() => setActiveTab('raw')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw Step Telemetry
          </button>
        </div>

        {/* Content Viewer */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-gray-200 bg-[#070A0F]">
          {activeTab === 'input' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] text-gray-500 font-sans">
                <span>PII, API keys & passwords automatically redacted before storage</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(step.inputPayload || {}, null, 2))}
                  className="flex items-center space-x-1 text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap overflow-x-auto text-cyan-300/90 leading-relaxed">
                {JSON.stringify(step.inputPayload || {}, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'output' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] text-gray-500 font-sans">
                <span>Output metadata and model response</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(step.outputPayload || {}, null, 2))}
                  className="flex items-center space-x-1 text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap overflow-x-auto text-emerald-300/90 leading-relaxed">
                {JSON.stringify(step.outputPayload || {}, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'error' && step.errorDetails && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 font-sans">
                  Failure Message:
                </div>
                <div className="text-rose-200 text-sm font-bold">
                  {step.errorDetails.message}
                </div>
                {step.errorDetails.statusCode && (
                  <div className="text-[11px] text-rose-400/80 mt-1">
                    HTTP Status Code: {step.errorDetails.statusCode} • Error Code: {step.errorDetails.code || 'UNKNOWN'}
                  </div>
                )}
              </div>

              {step.errorDetails.stack && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">
                    Stack Trace:
                  </div>
                  <pre className="p-3 rounded-lg bg-black/60 border border-white/5 text-rose-300/80 text-[11px] whitespace-pre-wrap overflow-x-auto">
                    {step.errorDetails.stack}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <pre className="whitespace-pre-wrap overflow-x-auto text-gray-300 leading-relaxed">
              {JSON.stringify(step, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
