'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Globe, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ExecutionsView } from '../components/ExecutionsView';
import { ExecutionDetailView } from '../components/ExecutionDetailView';
import { StepInspectorModal } from '../components/StepInspectorModal';
import { OperatorApprovalModal } from '../components/OperatorApprovalModal';
import { FailureClustersView } from '../components/FailureClustersView';
import { ComparisonDiffView } from '../components/ComparisonDiffView';
import { AuditTrailView } from '../components/AuditTrailView';
import { AuthModal } from '../components/AuthModal';
import { api } from '../lib/api';
import { Execution, TraceStep, Checkpoint, RecoveryAction, FailureCluster } from '../lib/types';

export default function ObservabilityDashboard() {
  const [activeTab, setActiveTab] = useState('executions');
  const [selectedProject, setSelectedProject] = useState('');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [clusters, setClusters] = useState<FailureCluster[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Selected execution detail payload
  const [detailData, setDetailData] = useState<{
    execution: Execution;
    steps: TraceStep[];
    checkpoints: Checkpoint[];
    recoveries: RecoveryAction[];
    cluster: FailureCluster | null;
  } | null>(null);

  // Modals
  const [inspectedStep, setInspectedStep] = useState<TraceStep | null>(null);
  const [pendingApprovalRecoveryId, setPendingApprovalRecoveryId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Public Access Mode
  const [publicAccessEnabled, setPublicAccessEnabled] = useState<boolean>(() => {
    return process.env.NEXT_PUBLIC_ACCESS_ENABLED !== 'false';
  });

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedProject, user, publicAccessEnabled]);

  useEffect(() => {
    if (selectedExecutionId) {
      loadExecutionDetails(selectedExecutionId);
    } else {
      setDetailData(null);
    }
  }, [selectedExecutionId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [execRes, clustersRes] = await Promise.all([
        api.getExecutions({ project: selectedProject || undefined }),
        api.getClusters(),
      ]);
      setExecutions(execRes.items || []);
      setClusters(clustersRes || []);
    } catch (err: any) {
      console.error('Failed to load observability data', err);
      if (err?.response?.status === 401 && !user) {
        // Backend denied anonymous access (PUBLIC_ACCESS_ENABLED=false)
        setPublicAccessEnabled(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutionDetails = async (id: string) => {
    try {
      const data = await api.getExecutionDetails(id);
      setDetailData(data);
    } catch (err: any) {
      console.error(`Failed to load details for ${id}`, err);
    }
  };

  const checkAuth = async () => {
    try {
      const [userRes, configRes] = await Promise.allSettled([
        api.getMe(),
        api.getConfig(),
      ]);
      if (userRes.status === 'fulfilled' && userRes.value?.userId) {
        setUser(userRes.value);
      }
      if (configRes.status === 'fulfilled' && typeof configRes.value?.publicAccessEnabled === 'boolean') {
        setPublicAccessEnabled(configRes.value.publicAccessEnabled);
      }
    } catch {
      // Anonymous visitor mode is fine
    }
  };

  const showBanner = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    showBanner('Signed out successfully. Switched to guest session.', 'info');
  };

  const handleSimulateRun = async () => {
    try {
      setIsSimulating(true);
      const res = await api.simulateRun('customer-support-agent', true);
      showBanner(`Simulated AI execution '${res.execution.executionId}' ingested with failure forensics!`, 'info');
      await loadData();
      setSelectedExecutionId(res.execution.executionId);
    } catch (err: any) {
      showBanner('Failed to simulate run: ' + (err?.response?.data?.message || err.message), 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.seedDemo();
      showBanner('Demo workflows, failure scenarios, and checkpoints successfully re-seeded!', 'success');
      await loadData();
    } catch (err: any) {
      showBanner('Failed to seed demo: ' + (err?.response?.data?.message || err.message), 'error');
    }
  };

  const handleInitiateRecovery = async (checkpointId?: string) => {
    if (!user) {
      showBanner('Operator authentication required to initiate workflow recovery.', 'error');
      setShowAuthModal(true);
      return;
    }
    if (!detailData) return;
    try {
      const action = await api.initiateRecovery({
        executionId: detailData.execution.executionId,
        checkpointId,
        actionType: 'RESUME_FROM_CHECKPOINT',
      });

      if (action.status === 'PENDING_OPERATOR_APPROVAL') {
        setPendingApprovalRecoveryId(action.recoveryId);
        showBanner(
          `Recovery initiated for '${action.targetStepKey}'. Non-idempotent operation requires operator approval.`,
          'info',
        );
      } else {
        showBanner(`Workflow successfully resumed! New run spawned: ${action.resumedExecutionId}`, 'success');
        await loadData();
        if (action.resumedExecutionId) {
          setSelectedExecutionId(action.resumedExecutionId);
        }
      }
    } catch (err: any) {
      showBanner('Recovery initiation failed: ' + (err?.response?.data?.message || err.message), 'error');
    }
  };

  const handleApprovedRecovery = async () => {
    setPendingApprovalRecoveryId(null);
    showBanner('Operator sign-off verified! Workflow safely resumed without replaying completed steps.', 'success');
    await loadData();
    if (selectedExecutionId) {
      await loadExecutionDetails(selectedExecutionId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-gray-100">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedExecutionId(null);
        }}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        onSimulateRun={handleSimulateRun}
        onSeedDemo={handleSeedDemo}
        isSimulating={isSimulating}
        user={user}
        publicAccessEnabled={publicAccessEnabled}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Alert / Toast Banner */}
      {bannerMessage && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full mt-3 sm:mt-4 animate-in slide-in-from-top duration-200">
          <div
            className={`p-3 sm:p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-lg ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : bannerMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <span className="truncate pr-2">{bannerMessage.text}</span>
            <button
              onClick={() => setBannerMessage(null)}
              className="ml-2 text-gray-400 hover:text-white shrink-0 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
        {/* If private mode and unauthenticated: Lockout Screen */}
        {!user && !publicAccessEnabled ? (
          <div className="glass-panel rounded-2xl p-6 sm:p-10 max-w-lg mx-auto my-8 sm:my-12 border border-white/10 text-center shadow-2xl bg-white/[0.02]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              Private Pipeline Deployment
            </h2>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Public demo access is disabled (<code className="text-amber-400 font-mono">PUBLIC_ACCESS_ENABLED=false</code>). 
              An authenticated operator session is required to inspect execution traces, failure clusters, and recovery checkpoints.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 mx-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In with Operator Credentials</span>
            </button>
          </div>
        ) : (
          <>
            {/* Honest Public Demo Banner */}
            {!user && publicAccessEnabled && (
              <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center space-x-2.5 text-cyan-200">
                  <span className="p-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5 sm:mt-0">
                    <Globe className="w-4 h-4" />
                  </span>
                  <span className="leading-relaxed">
                    <strong>Public Demo Mode (Read-Only):</strong> You are inspecting sample telemetry. Initiating recovery replays, modifying workflows, or viewing audit ledgers requires operator sign-in.
                  </span>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto text-center px-3.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold rounded-lg transition-all shrink-0"
                >
                  Operator Sign In
                </button>
              </div>
            )}

            {/* If an execution is selected, show detail view */}
            {selectedExecutionId && detailData ? (
              <ExecutionDetailView
                execution={detailData.execution}
                steps={detailData.steps}
                checkpoints={detailData.checkpoints}
                recoveries={detailData.recoveries}
                cluster={detailData.cluster}
                onBack={() => setSelectedExecutionId(null)}
                onOpenStepInspector={(step) => setInspectedStep(step)}
                onInitiateRecovery={handleInitiateRecovery}
                onApproveRecovery={(recId) => {
                  if (!user) {
                    showBanner('Operator authentication required to review and approve side-effects.', 'error');
                    setShowAuthModal(true);
                    return;
                  }
                  setPendingApprovalRecoveryId(recId);
                }}
              />
            ) : (
              <>
                {activeTab === 'executions' && (
                  <ExecutionsView
                    executions={executions}
                    onSelectExecution={(id) => setSelectedExecutionId(id)}
                    selectedExecutionId={selectedExecutionId || undefined}
                    isLoading={isLoading}
                    onRefresh={loadData}
                  />
                )}

                {activeTab === 'clusters' && (
                  <FailureClustersView
                    clusters={clusters}
                    onSelectExecution={(id) => setSelectedExecutionId(id)}
                    isLoading={isLoading}
                  />
                )}

                {activeTab === 'compare' && (
                  <ComparisonDiffView
                    executions={executions}
                    onSelectExecution={(id) => setSelectedExecutionId(id)}
                  />
                )}

                {activeTab === 'audit' && (
                  <AuditTrailView
                    onSelectExecution={(id) => setSelectedExecutionId(id)}
                    user={user}
                    onOpenAuth={() => setShowAuthModal(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-500 font-mono flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="w-5 h-5 rounded object-cover shadow" />
          <span className="font-semibold text-gray-400">AI Pipeline Observability &amp; Recovery Platform</span>
        </div>
        <p className="text-[11px] text-gray-600">Enterprise LLMOps SRE Suite • Automated Forensics &amp; Resilient Recovery</p>
      </footer>

      {/* Modals */}
      {inspectedStep && (
        <StepInspectorModal
          step={inspectedStep}
          onClose={() => setInspectedStep(null)}
        />
      )}

      {pendingApprovalRecoveryId && (
        <OperatorApprovalModal
          recoveryId={pendingApprovalRecoveryId}
          targetStepKey="execute_stripe_refund"
          sideEffectDescription="Dispatches customer credit card refund to Stripe payment gateway ($75.00 USD)"
          onClose={() => setPendingApprovalRecoveryId(null)}
          onApproved={handleApprovedRecovery}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => {
            setUser(u);
            showBanner(`Authenticated as operator ${u.name}!`, 'success');
          }}
        />
      )}
    </div>
  );
}
