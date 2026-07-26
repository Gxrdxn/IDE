import React, { useState } from 'react';
import { ArrowRight, ShieldAlert, Cpu, Terminal, Lock, HardDrive, Key, CheckCircle2, Zap } from 'lucide-react';

interface ArchitectureTabProps {
  activeStage?: number;
  onStageChange?: (stage: number) => void;
}

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({
  activeStage = 0,
  onStageChange,
}) => {
  const handleStageSelect = (idx: number) => {
    if (onStageChange) {
      onStageChange(idx);
    }
  };

  const ipcSequence = [
    {
      step: 1,
      sender: 'Sandboxed IDE Extension (Non-Root User)',
      receiver: 'Privileged Recovery Daemon (Root / Sudo)',
      action: 'JSON-RPC Request over Unix Socket',
      details: 'Sends "recovery/extractBlob" method with target file hash & backup root URI.',
      payload: `{"jsonrpc": "2.0", "id": 101, "method": "recovery/extractBlob", "params": {"target_hash": "2b2bca6e...", "backup_root": "/var/MobileDevice/Backups/3d0d..."}}`
    },
    {
      step: 2,
      sender: 'Privileged Recovery Daemon',
      receiver: 'Kernel File System & Security Policy',
      action: 'Path Evaluation & Privilege Boundary Check',
      details: 'Validates target canonical path using filepath.EvalSymlinks. Verifies caller ucred UID/GID.',
      payload: `[DAEMON] Path verified: /var/MobileDevice/Backups/3d0d.../2b/2b2bca6e... (UID: 501, GID: 20)`
    },
    {
      step: 3,
      sender: 'Privileged Recovery Daemon',
      receiver: 'iOS Backup Storage Stream',
      action: 'Shared Lock Acquisition & Stream Open',
      details: 'Executes syscall.OpenFile(path, O_RDONLY|O_NOFOLLOW) and acquires syscall.Flock(fd, LOCK_SH).',
      payload: `[DAEMON] Acquire LOCK_SH on FD 7. Read-only stream established. Zero write risk.`
    },
    {
      step: 4,
      sender: 'Privileged Recovery Daemon',
      receiver: 'Sandboxed IDE Extension',
      action: 'JSON-RPC Response with SHA-256 Verification',
      details: 'Streams chunked bytes, computes SHA-256 fingerprint, and returns structured result.',
      payload: `{"jsonrpc": "2.0", "id": 101, "result": {"status": "VERIFIED_EXTRACTED", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "bytes": 4194304}}`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>Privilege-Separated System Architecture</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Sandboxed UI to Escalated Sudo Daemon IPC Bridge</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              An isolated, zero-trust architecture separating the sandboxed editor frontend from host-level forensic operations. 
              The elevated daemon executes minimal required root capabilities (`CAP_DAC_READ_SEARCH`) while enforcing immutable read-only locks.
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/50 px-4 py-2 rounded-lg text-xs font-mono text-indigo-300 whitespace-nowrap">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>IPC Domain: /var/run/ios-recovery-daemon.sock</span>
          </div>
        </div>
      </div>

      {/* System Topology Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component 1: IDE Extension Frontend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Sandboxed IDE Shell</h3>
              <p className="text-xs text-slate-400">Non-Privileged User Context (UID 501)</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Executes inside editor extension process sandbox</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Sends JSON-RPC 2.0 requests over Unix socket</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Renders active AST line & column recovery markers</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Zero direct access to OS root backup files</span>
            </li>
          </ul>
        </div>

        {/* Component 2: IPC Security Bridge */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden bg-gradient-to-b from-slate-900 to-indigo-950/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-200">UNIX Socket Security Boundary</h3>
              <p className="text-xs text-indigo-400">Mode 0600 / Peer Credential Verification</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Framed JSON-RPC over Unix Domain Socket</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>SO_PEERCRED authentication validates caller PID/UID</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>NOPASSWD restricted sudoers configuration policy</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Prevents shell environment pollution via `env_reset`</span>
            </li>
          </ul>
        </div>

        {/* Component 3: Privileged Recovery Daemon */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Sudo Recovery Daemon</h3>
              <p className="text-xs text-amber-400">Elevated Context (CAP_DAC_READ_SEARCH)</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Safe traversal of restricted iOS backup directories</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Enforces `O_RDONLY | O_NOFOLLOW` open semantics</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Acquires `syscall.Flock(LOCK_SH)` read locks</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Streams SHA-256 fingerprinted raw artifact blobs</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive IPC Sequence Flow Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-1">Interactive IPC Message Sequence Simulator</h3>
        <p className="text-xs text-slate-400 mb-4">
          Click through the steps below to inspect the real-time execution flow across the security boundary.
        </p>

        {/* Stage Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
          {ipcSequence.map((item, idx) => (
            <button
              key={item.step}
              onClick={() => handleStageSelect(idx)}
              className={`p-3 rounded-lg border text-left transition-all ${
                activeStage === idx
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold">Step 0{item.step}</span>
                {activeStage === idx && <Zap className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-xs font-semibold truncate">{item.action}</p>
            </button>
          ))}
        </div>

        {/* Selected Step Display */}
        {ipcSequence[activeStage] && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Source Context</span>
                <span className="text-indigo-400 font-semibold">{ipcSequence[activeStage].sender}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Destination Context</span>
                <span className="text-amber-400 font-semibold">{ipcSequence[activeStage].receiver}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Action Description</span>
              <p className="text-slate-300 font-sans">{ipcSequence[activeStage].details}</p>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">IPC Wire Payload / Syscall Log</span>
              <pre className="bg-slate-900 border border-slate-800 rounded p-3 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                {ipcSequence[activeStage].payload}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Threat Model & Mitigations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Security Threat Model & Architectural Mitigations</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
              <span>Threat Vector: Symlink Traversal Attack</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An attacker creates a malicious symlink inside the iOS backup folder pointing to `/etc/shadow` or root keys, attempting to read unauthorized system files.
            </p>
            <div className="pt-2 border-t border-slate-800 text-xs text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Mitigation: Open files with `O_NOFOLLOW` & verify path via `filepath.EvalSymlinks`.</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
              <span>Threat Vector: Unauthorized Socket IPC Hijacking</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An unprivileged local malware process connects to the Unix socket to send arbitrary extraction commands to the elevated daemon.
            </p>
            <div className="pt-2 border-t border-slate-800 text-xs text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Mitigation: Socket permissions set to `0600` and `SO_PEERCRED` checks verify exact caller UID.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
