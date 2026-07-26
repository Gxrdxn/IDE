import { useState, useEffect, useCallback } from 'react';
import { SessionState, DEFAULT_SESSION_STATE } from '../types';

const STORAGE_KEY = 'SYNTAXFORGE_RECOVERY_SESSION_V1';

export function useLocalStorage() {
  const [session, setSessionState] = useState<SessionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with DEFAULT_SESSION_STATE to safeguard against schema updates
        return {
          ...DEFAULT_SESSION_STATE,
          ...parsed,
          archState: { ...DEFAULT_SESSION_STATE.archState, ...(parsed.archState || {}) },
          carverState: { ...DEFAULT_SESSION_STATE.carverState, ...(parsed.carverState || {}) },
          specsState: { ...DEFAULT_SESSION_STATE.specsState, ...(parsed.specsState || {}) },
          lspState: { ...DEFAULT_SESSION_STATE.lspState, ...(parsed.lspState || {}) },
          guardrailsState: { ...DEFAULT_SESSION_STATE.guardrailsState, ...(parsed.guardrailsState || {}) },
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : DEFAULT_SESSION_STATE.auditLogs,
        };
      }
    } catch (err) {
      console.error('[LocalStorage] Failed to parse session state, falling back to default:', err);
    }
    return DEFAULT_SESSION_STATE;
  });

  const [saveStatus, setSaveStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [lastSavedFormatted, setLastSavedFormatted] = useState<string>('');

  // Update formatted time when session.lastSaved changes
  useEffect(() => {
    try {
      const date = new Date(session.lastSaved);
      setLastSavedFormatted(date.toLocaleTimeString());
    } catch {
      setLastSavedFormatted('Just now');
    }
  }, [session.lastSaved]);

  // Persist to localStorage whenever session state changes
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setSaveStatus('synced');
      } catch (err) {
        console.error('[LocalStorage] Save error:', err);
        setSaveStatus('error');
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [session]);

  const updateSession = useCallback((updater: Partial<SessionState> | ((prev: SessionState) => SessionState)) => {
    setSessionState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return {
        ...next,
        lastSaved: new Date().toISOString(),
      };
    });
  }, []);

  const addAuditLog = useCallback((action: string, type: 'info' | 'warning' | 'security' | 'session' = 'info') => {
    setSessionState((prev) => {
      const newLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        action,
        type,
      };
      return {
        ...prev,
        lastSaved: new Date().toISOString(),
        auditLogs: [newLog, ...prev.auditLogs].slice(0, 50), // keep latest 50
      };
    });
  }, []);

  const resetSession = useCallback(() => {
    const freshState: SessionState = {
      ...DEFAULT_SESSION_STATE,
      lastSaved: new Date().toISOString(),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Recovery session reset to clean default state',
          type: 'session',
        },
      ],
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    } catch (err) {
      console.error('[LocalStorage] Reset error:', err);
    }
    setSessionState(freshState);
  }, []);

  const exportSession = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `syntaxforge-session-${session.caseNumber || 'case'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [session]);

  const importSession = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        const merged: SessionState = {
          ...DEFAULT_SESSION_STATE,
          ...parsed,
          lastSaved: new Date().toISOString(),
          auditLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'Imported session state from external JSON package',
              type: 'session',
            },
            ...(Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []),
          ].slice(0, 50),
        };
        setSessionState(merged);
        return true;
      }
    } catch (err) {
      console.error('[LocalStorage] Import error:', err);
    }
    return false;
  }, []);

  return {
    session,
    saveStatus,
    lastSavedFormatted,
    updateSession,
    addAuditLog,
    resetSession,
    exportSession,
    importSession,
  };
}
