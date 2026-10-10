'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';

interface OperatorApprovalModalProps {
  recoveryId: string;
  targetStepKey?: string;
  sideEffectDescription?: string;
  onClose: () => void;
  onApproved: () => void;
}

export const OperatorApprovalModal: React.FC<OperatorApprovalModalProps> = ({
  recoveryId,
  targetStepKey,
  sideEffectDescription,
  onClose,
  onApproved,
}) => {
  const [operatorName, setOperatorName] = useState('Sarah Senior SRE');
  const [rationale, setRationale] = useState(
    'Verified payment merchant pool replenished. Customer verified via support ticket #88219. Safe to retry one-time refund.',
  );
  const [riskAssessment, setRiskAssessment] = useState(
    'Low risk: Idempotency key confirmed on Stripe dashboard to avoid duplicate charges.',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale || rationale.trim().length < 5) {
      setError('Please provide a meaningful operational rationale.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.approveRecovery(recoveryId, {
        approvedBy: operatorName,
        rationale: rationale.trim(),
        riskAssessment: riskAssessment.trim(),
      });
      onApproved();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Operator Approval Guard
              </h3>
              <p className="text-xs text-amber-200/90 font-mono">
                Recovery ID: {recoveryId}
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

        {/* Warning Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Non-Idempotent External Action Detected</span>
            </div>
            <p className="leading-relaxed">
              Step <strong className="font-mono text-white">{targetStepKey || 'target_step'}</strong> has
              external side effects ({sideEffectDescription || 'external write / financial transaction'}).
            </p>
            <p className="text-[11px] text-amber-300/80 font-mono">
              Policy Rule: Replaying non-idempotent actions without operator confirmation is blocked to prevent duplicate mutations.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">
                Operator Name &amp; Role:
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">
                Approval Rationale (Required):
              </label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                placeholder="Explain why it is safe to replay this non-idempotent operation..."
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">
                Risk Assessment &amp; Safeguards:
              </label>
              <input
                type="text"
                value={riskAssessment}
                onChange={(e) => setRiskAssessment(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing Off...' : 'Grant Sign-Off & Execute Resume'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
