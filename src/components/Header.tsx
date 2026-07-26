import React from 'react';
import { ShieldCheck, Cpu, Terminal, Database, Lock, Server, FileCode } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'arch', label: 'Architecture & IPC Topology', icon: Server },
    { id: 'carver', label: 'SQLite & Manifest Carver', icon: Database },
    { id: 'specs', label: 'Daemon & Code Specifications', icon: FileCode },
    { id: 'lsp', label: 'LSP / JSON-RPC 2.0 Validator', icon: Terminal },
    { id: 'guardrails', label: 'Integrity & Write-Blockers', icon: ShieldCheck },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">SyntaxForge-LSP</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  v2.4 Privileged Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                iOS Artifact Data Recovery Architecture & IDE Extension
              </p>
            </div>
          </div>

          {/* Security Status Badge */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-md">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-mono">Privilege:</span>
              <span className="text-amber-400 font-semibold font-mono">CAP_DAC_READ_SEARCH</span>
            </div>
            <div className="flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-mono">Write-Blocker:</span>
              <span className="text-emerald-400 font-semibold font-mono">ENFORCED (LOCK_SH)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
