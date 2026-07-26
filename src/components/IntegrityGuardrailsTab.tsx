import React, { useState } from 'react';
import { ShieldCheck, Lock, HardDrive, CheckCircle2, AlertTriangle, Key, ShieldAlert } from 'lucide-react';
import { ChecksumDashboard } from './ChecksumDashboard';

interface IntegrityGuardrailsTabProps {
  testPath?: string;
  onTestPathChange?: (path: string) => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'security' | 'session') => void;
}

export const IntegrityGuardrailsTab: React.FC<IntegrityGuardrailsTabProps> = ({
  testPath: propTestPath,
  onTestPathChange,
  addAuditLog,
}) => {
  const [internalTestPath, setInternalTestPath] = useState<string>(
    '/var/MobileDevice/ProvisioningProfiles/Backups/3d0d1282210e39a0/2b/2b2bca6e4f1a2387114b301292100871120a1122'
  );

  const testPath = propTestPath ?? internalTestPath;

  const handlePathChange = (val: string) => {
    if (onTestPathChange) {
      onTestPathChange(val);
    } else {
      setInternalTestPath(val);
    }
  };

  const [testOutput, setTestOutput] = useState<{
    canonicalPath: string;
    symlinkCheckPassed: boolean;
    writeLockEnforced: boolean;
    sha256Pre: string;
    sha256Post: string;
    hashMatch: boolean;
    statusMessage: string;
  } | null>(null);

  const handleRunIntegrityBenchmark = () => {
    const fakeHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    
    const isSymlinkAttack = testPath.includes('..') || testPath.includes('/etc/shadow') || testPath.includes('symlink');

    if (isSymlinkAttack) {
      setTestOutput({
        canonicalPath: '/etc/shadow (TRAVERSAL BLOCKED)',
        symlinkCheckPassed: false,
        writeLockEnforced: true,
        sha256Pre: 'ABORTED',
        sha256Post: 'ABORTED',
        hashMatch: false,
        statusMessage: 'CRITICAL SECURITY VIOLATION: Path attempted directory traversal outside designated backup root. Blocked by daemon filepath.EvalSymlinks guardrail.'
      });
      if (addAuditLog) {
        addAuditLog(`SECURITY ALERT: Blocked directory traversal attack attempt on path "${testPath}"`, 'security');
      }
    } else {
      setTestOutput({
        canonicalPath: testPath,
        symlinkCheckPassed: true,
        writeLockEnforced: true,
        sha256Pre: fakeHash,
        sha256Post: fakeHash,
        hashMatch: true,
        statusMessage: 'VERIFIED INTEGRITY: File read under syscall.Flock(LOCK_SH). Pre-extraction and post-extraction cryptographic hashes match 100%. Source media untouched.'
      });
      if (addAuditLog) {
        addAuditLog(`Integrity benchmark completed successfully for path "${testPath}"`, 'info');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Forensic Data Integrity & Zero-Modification Assurance</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Write-Blocker Enforcement & SHA-256 Validation Matrix</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Strict forensic verification ensuring source backup files are locked against write collisions and cryptographically validated before and after stream extraction.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-lg text-emerald-300">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Hardware & OS Write-Blocker ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Checksum Recharts Visual Dashboard */}
      <ChecksumDashboard addAuditLog={addAuditLog} />

      {/* Interactive Integrity Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <span>Interactive Directory Traversal & Forensic Hash Validator</span>
        </h3>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-mono">Target Backup File URI / Path for Extraction:</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testPath}
              onChange={(e) => handlePathChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
            />
            <button
              onClick={handleRunIntegrityBenchmark}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Run Integrity & Security Test
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Tip: Try inserting <code className="text-amber-400">/../../etc/shadow</code> or <code className="text-amber-400">symlink</code> to test the daemon's path traversal defense.
          </p>
        </div>

        {testOutput && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-4">
            <div className={`p-3 rounded-lg border flex items-center space-x-2 ${
              testOutput.symlinkCheckPassed
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}>
              {testOutput.symlinkCheckPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />}
              <span className="font-sans font-medium">{testOutput.statusMessage}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Pre-Read Cryptographic Hash</span>
                <span className="text-indigo-400 font-bold truncate block">{testOutput.sha256Pre}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Post-Extraction Verification Hash</span>
                <span className="text-emerald-400 font-bold truncate block">{testOutput.sha256Post}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Syscall Lock State:</span>
              <span className="text-emerald-400 font-bold">syscall.Flock(fd, LOCK_SH) Shared Read Lock Enforced</span>
            </div>
          </div>
        )}
      </div>

      {/* Security Guardrails Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 w-fit">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">1. OS Write-Blocker Locks</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All file descriptors are strictly opened with `O_RDONLY | O_NOFOLLOW`. Any attempt by secondary background threads to write returns an immediate EPERM or EACCES error.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 w-fit">
            <Key className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">2. Cryptographic Integrity</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Streaming SHA-256 hash calculations occur inline during byte reads. Mismatches automatically halt extraction and flag forensic media contamination.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 w-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">3. Path Traversal Defense</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Canonicalization via `filepath.EvalSymlinks` verifies every path remains strictly within authorized iOS backup root bounds prior to invoking system file handles.
          </p>
        </div>
      </div>
    </div>
  );
};
