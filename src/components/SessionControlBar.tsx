import React, { useState, useRef } from 'react';
import { Save, RefreshCw, Download, Upload, Clock, FileText, Check, AlertCircle, Edit3, X, History, Sparkles } from 'lucide-react';
import { SessionState } from '../types';

interface SessionControlBarProps {
  session: SessionState;
  saveStatus: 'synced' | 'saving' | 'error';
  lastSavedFormatted: string;
  updateSession: (updater: Partial<SessionState> | ((prev: SessionState) => SessionState)) => void;
  resetSession: () => void;
  exportSession: () => void;
  importSession: (jsonString: string) => boolean;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'security' | 'session') => void;
}

export const SessionControlBar: React.FC<SessionControlBarProps> = ({
  session,
  saveStatus,
  lastSavedFormatted,
  updateSession,
  resetSession,
  exportSession,
  importSession,
  addAuditLog,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(session.sessionName);
  const [tempCase, setTempCase] = useState(session.caseNumber);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = () => {
    updateSession({
      sessionName: tempName || 'Active Recovery Session',
      caseNumber: tempCase || 'CASE-2026-0001',
    });
    addAuditLog(`Updated session target name to "${tempName}" (${tempCase})`, 'session');
    setIsEditingName(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importSession(content);
        if (success) {
          setImportError(null);
          addAuditLog(`Successfully imported recovery session package: ${file.name}`, 'session');
        } else {
          setImportError('Invalid session JSON format.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 backdrop-blur px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Active Session Name & Case Number */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-md text-indigo-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Persistence Engine:</span>
            <span className="text-slate-200 text-xs font-semibold">localStorage Active</span>
          </div>

          {!isEditingName ? (
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100">{session.sessionName}</span>
              <span className="text-slate-500 font-mono">({session.caseNumber})</span>
              <button
                onClick={() => {
                  setTempName(session.sessionName);
                  setTempCase(session.caseNumber);
                  setIsEditingName(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Edit Session Name & Case"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Session Name"
                className="bg-slate-950 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
              />
              <input
                type="text"
                value={tempCase}
                onChange={(e) => setTempCase(e.target.value)}
                placeholder="Case #"
                className="bg-slate-950 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none w-28 font-mono"
              />
              <button
                onClick={handleSaveName}
                className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-500"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Auto-Save Status & Actions */}
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1">
          {/* Save Status Indicator */}
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 shrink-0">
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">Syncing to LocalStorage...</span>
              </>
            )}
            {saveStatus === 'synced' && (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Saved to LocalStorage ({lastSavedFormatted})</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Save Error</span>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800"></div>

          {/* Examiner Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              showNotes ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Notes</span>
          </button>

          {/* Audit Trail Modal Toggle */}
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-medium transition-colors"
          >
            <History className="w-3 h-3 text-indigo-400" />
            <span>Audit Trail ({session.auditLogs.length})</span>
          </button>

          {/* Export Session */}
          <button
            onClick={exportSession}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-medium transition-colors"
            title="Export session to JSON file"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Export</span>
          </button>

          {/* Import Session */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-medium transition-colors"
            title="Import session from JSON file"
          >
            <Upload className="w-3 h-3 text-amber-400" />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Reset Session */}
          <button
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded text-[11px] font-medium transition-colors"
            title="Clear local storage session state"
          >
            <RefreshCw className="w-3 h-3 text-rose-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Examiner Notes Drawer */}
      {showNotes && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Examiner Case Notes & Session Context (Auto-Persisted)</span>
            </span>
            <button onClick={() => setShowNotes(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={session.examinerNotes}
            onChange={(e) => updateSession({ examinerNotes: e.target.value })}
            placeholder="Add forensic observations, recovered hashes, or case notes..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
          />
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400 font-semibold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Confirm LocalStorage Session Reset</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to reset the active recovery session? All local state including current filters, notes, and custom payloads will be restored to default.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetSession();
                  setShowConfirmReset(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded text-xs transition-colors"
              >
                Reset Session State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                <History className="w-4 h-4" />
                <span>Session Audit Log & Persistence History</span>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-2">
              {session.auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-200 font-sans">{log.action}</span>
                    <span className="block text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                    log.type === 'session' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    log.type === 'security' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {log.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Error Banner */}
      {importError && (
        <div className="max-w-7xl mx-auto mt-2 p-2 bg-rose-950/60 border border-rose-800/60 text-rose-300 rounded text-xs flex justify-between items-center">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
