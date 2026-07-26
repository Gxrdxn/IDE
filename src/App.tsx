import React from 'react';
import { Header } from './components/Header';
import { SessionControlBar } from './components/SessionControlBar';
import { ArchitectureTab } from './components/ArchitectureTab';
import { SQLiteCarverTab } from './components/SQLiteCarverTab';
import { CodeSpecsTab } from './components/CodeSpecsTab';
import { LspValidatorTab } from './components/LspValidatorTab';
import { IntegrityGuardrailsTab } from './components/IntegrityGuardrailsTab';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  const {
    session,
    saveStatus,
    lastSavedFormatted,
    updateSession,
    addAuditLog,
    resetSession,
    exportSession,
    importSession,
  } = useLocalStorage();

  const handleTabChange = (tabId: string) => {
    updateSession({ activeTab: tabId });
    addAuditLog(`Navigated to view tab: ${tabId.toUpperCase()}`, 'session');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      <div>
        <Header activeTab={session.activeTab} setActiveTab={handleTabChange} />

        <SessionControlBar
          session={session}
          saveStatus={saveStatus}
          lastSavedFormatted={lastSavedFormatted}
          updateSession={updateSession}
          resetSession={resetSession}
          exportSession={exportSession}
          importSession={importSession}
          addAuditLog={addAuditLog}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {session.activeTab === 'arch' && (
            <ArchitectureTab
              activeStage={session.archState.activeStage}
              onStageChange={(stage) =>
                updateSession((prev) => ({
                  ...prev,
                  archState: { activeStage: stage },
                }))
              }
            />
          )}

          {session.activeTab === 'carver' && (
            <SQLiteCarverTab
              carverState={session.carverState}
              onStateChange={(updater) =>
                updateSession((prev) => ({
                  ...prev,
                  carverState: typeof updater === 'function' ? updater(prev.carverState) : { ...prev.carverState, ...updater },
                }))
              }
              addAuditLog={addAuditLog}
            />
          )}

          {session.activeTab === 'specs' && (
            <CodeSpecsTab
              selectedSpecId={session.specsState.selectedSpecId}
              onSpecChange={(specId) =>
                updateSession((prev) => ({
                  ...prev,
                  specsState: { selectedSpecId: specId },
                }))
              }
            />
          )}

          {session.activeTab === 'lsp' && (
            <LspValidatorTab
              inputPayload={session.lspState.inputPayload}
              onPayloadChange={(payload) =>
                updateSession((prev) => ({
                  ...prev,
                  lspState: { inputPayload: payload },
                }))
              }
              addAuditLog={addAuditLog}
            />
          )}

          {session.activeTab === 'guardrails' && (
            <IntegrityGuardrailsTab
              testPath={session.guardrailsState.testPath}
              onTestPathChange={(path) =>
                updateSession((prev) => ({
                  ...prev,
                  guardrailsState: { testPath: path },
                }))
              }
              addAuditLog={addAuditLog}
            />
          )}
        </main>
      </div>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>SyntaxForge-LSP Developer Tooling & Forensic Recovery Architecture Specification</p>
        <p className="mt-1 text-slate-600">Built for Zero-Trust Privilege Separation, LSP Compliance, and Forensic Data Integrity.</p>
      </footer>
    </div>
  );
}
