'use client';

import React, { useState, useEffect } from 'react';
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

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadData();
    checkAuth();
  }, [selectedProject]);

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
      const res = await api.getMe();
      if (res && res.userId) setUser(res);
    } catch {
      // Anonymous visitor mode is fine
    }
  };

  const showBanner = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const handleSimulateRun = async () => {
    try {
      setIsSimulating(true);
      const res = await api.simulateRun('customer-support-agent', true);
      showBanner(`Simulated AI execution '${res.execution.executionId}' ingested with failure forensics!`, 'info');
      await loadData();
      setSelectedExecutionId(res.execution.executionId);
    } catch (err: any) {
      showBanner('Failed to simulate run: ' + err.message, 'error');
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
      showBanner('Failed to seed demo: ' + err.message, 'error');
    }
  };

  const handleInitiateRecovery = async (checkpointId?: string) => {
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
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Alert / Toast Banner */}
      {bannerMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 animate-in slide-in-from-top duration-200">
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-lg ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : bannerMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <span>{bannerMessage.text}</span>
            <button
              onClick={() => setBannerMessage(null)}
              className="ml-4 text-gray-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
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
            onApproveRecovery={(recId) => setPendingApprovalRecoveryId(recId)}
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
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-gray-500 font-mono">
        AI Pipeline Observability &amp; Recovery Platform • Enterprise LLMOps SRE Suite
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
