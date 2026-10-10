'use client';

import React from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User,
  SlidersHorizontal,
  Flame,
  GitCompare,
  History,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  onSimulateRun: () => void;
  onSeedDemo: () => void;
  isSimulating: boolean;
  user: any;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedProject,
  setSelectedProject,
  onSimulateRun,
  onSeedDemo,
  isSimulating,
  user,
  onOpenAuth,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-[#0B0F17] rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  AI Pipeline Observability
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v1.2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono tracking-tight">
                Trace Forensics • Error Clustering • Durable Checkpoints
              </p>
            </div>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center space-x-3">
            {/* Project Filter */}
            <div className="relative">
              <select
                aria-label="Filter by project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-[#111827] border border-white/10 text-gray-200 text-xs rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:border-blue-500/50 cursor-pointer"
              >
                <option value="">All Projects (4)</option>
                <option value="support-core">support-core</option>
                <option value="healthcare-ai">healthcare-ai</option>
                <option value="developer-tools">developer-tools</option>
                <option value="fintech-core">fintech-core</option>
              </select>
            </div>

            {/* Simulate Run Button */}
            <button
              onClick={onSimulateRun}
              disabled={isSimulating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating...' : 'Simulate Run'}</span>
            </button>

            {/* Re-seed Button */}
            <button
              onClick={onSeedDemo}
              title="Reset and re-seed demo scenarios"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1F2937] border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Scenarios</span>
            </button>

            {/* Operator Auth Button */}
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{user ? user.name : 'Operator Access'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-white/5 py-2 overflow-x-auto">
          {[
            { id: 'executions', label: 'Live Executions & Traces', icon: Activity },
            { id: 'clusters', label: 'Failure Clusters', icon: Flame },
            { id: 'compare', label: 'Run Comparison Diff', icon: GitCompare },
            { id: 'audit', label: 'Audit Trail & Recoveries', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
