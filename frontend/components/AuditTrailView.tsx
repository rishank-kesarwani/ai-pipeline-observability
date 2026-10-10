'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, ShieldAlert, ArrowRight, Clock, User } from 'lucide-react';
import { api } from '../lib/api';

interface AuditTrailViewProps {
  onSelectExecution: (id: string) => void;
  user?: any;
  onOpenAuth?: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  onSelectExecution,
  user,
  onOpenAuth,
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [auditData, recData] = await Promise.all([
        api.getAuditLogs({ limit: 50 }),
        api.getExecutionDetails('exec-support-failed-001').then((d) => d.recoveries).catch(() => []),
      ]);
      setLogs(auditData);
      setRecoveries(recData);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-8 border border-amber-500/30 text-center max-w-xl mx-auto my-12 bg-amber-500/5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">
            Privileged Operator Authorization Required
          </h2>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            The Audit Trail records sensitive operator signatures, recovery replay authorisations, and policy modifications. Anonymous demo access is restricted from viewing privileged audit history.
          </p>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-600/20"
            >
              Sign In as Operator
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="glass-panel rounded-xl p-5 border-l-4 border-l-emerald-500">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Audit Trail &amp; Safe Recovery Records
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Immutable ledger of operator approvals, checkpoint resumes, policy modifications, and
              recovery actions enforcing zero unapproved side-effects.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log Stream Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Audit Ledger ({logs.length} Events)
          </h3>
          <button
            onClick={loadData}
            className="text-[11px] font-mono text-blue-400 hover:text-blue-300"
          >
            Refresh Ledger
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">
            Loading audit events...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No audit records captured yet. Recoveries and approvals will appear here.
          </div>
        ) : (
          <div className="divide-y divide-white/5 font-mono text-xs">
            {logs.map((entry) => {
              const isApproval = entry.action === 'OPERATOR_APPROVAL_GRANTED';
              return (
                <div key={entry.auditId || entry._id} className="p-4 hover:bg-white/[0.02] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {isApproval ? (
                        <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <History className="w-3.5 h-3.5" />
                        </span>
                      )}

                      <span className="font-bold text-white font-sans text-xs">
                        {entry.action}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        on {entry.resourceType} [{entry.resourceId}]
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-gray-500">
                      <span>Operator: {entry.performedBy}</span>
                      <span>•</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {entry.details && (
                    <div className="mt-2 p-2.5 rounded bg-[#0B0F17] border border-white/5 text-[11px] text-gray-300">
                      <pre className="whitespace-pre-wrap overflow-x-auto text-gray-400">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
