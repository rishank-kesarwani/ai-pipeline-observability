'use client';

import React from 'react';
import Image from 'next/image';
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
  LogOut,
  Lock,
  Globe,
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
  publicAccessEnabled: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
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
  publicAccessEnabled,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-lg sm:rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-[#0B0F17] p-0.5 sm:p-1 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="AI Pipeline Observability"
                  width={40}
                  height={40}
                  unoptimized
                  priority
                  className="h-full w-full object-cover rounded-md sm:rounded-lg"
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent truncate">
                  AI Pipeline Observability
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  v1.2.0
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-gray-400 font-mono tracking-tight truncate">
                Trace Forensics • Error Clustering • Durable Checkpoints
              </p>
            </div>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Project Filter */}
            <div className="relative">
              <select
                aria-label="Filter by project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-[#111827] border border-white/10 text-gray-200 text-xs rounded-lg px-2 sm:px-3 py-1.5 font-medium focus:outline-none focus:border-blue-500/50 cursor-pointer max-w-[95px] xs:max-w-[125px] sm:max-w-none truncate"
              >
                <option value="">All Projects (4)</option>
                <option value="support-core">support-core</option>
                <option value="healthcare-ai">healthcare-ai</option>
                <option value="developer-tools">developer-tools</option>
                <option value="fintech-core">fintech-core</option>
              </select>
            </div>

            {/* Access Mode Pill */}
            {user ? (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{user.roles?.includes('operator') || user.roles?.includes('admin') ? 'Operator Active' : 'Authenticated'}</span>
              </div>
            ) : publicAccessEnabled ? (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-mono">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Demo (Read-Only)</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Private Mode</span>
              </div>
            )}

            {/* Simulate Run Button */}
            <button
              onClick={onSimulateRun}
              disabled={isSimulating}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 shrink-0"
              title="Simulate workflow execution"
            >
              <Play className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSimulating ? 'Simulating...' : 'Simulate'}</span>
              <span className="hidden sm:inline">{isSimulating ? '' : ' Run'}</span>
            </button>

            {/* Re-seed Button */}
            <button
              onClick={onSeedDemo}
              title="Reset and re-seed demo scenarios"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1F2937] border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            {/* Auth / User Control */}
            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="hidden xs:flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs font-medium">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="max-w-[70px] sm:max-w-[100px] truncate">{user.name || user.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all shadow-sm shadow-emerald-500/10 shrink-0"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Operator Sign In</span>
                <span className="sm:hidden text-[11px]">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-white/5 py-1.5 sm:py-2 overflow-x-auto no-scrollbar">
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
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
