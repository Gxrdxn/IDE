import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Shield } from 'lucide-react';
import { CODE_SPECS } from '../data/codeSpecs';

interface CodeSpecsTabProps {
  selectedSpecId?: string;
  onSpecChange?: (specId: string) => void;
}

export const CodeSpecsTab: React.FC<CodeSpecsTabProps> = ({
  selectedSpecId: propSpecId,
  onSpecChange,
}) => {
  const [internalSpecId, setInternalSpecId] = useState<string>('go-daemon');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedSpecId = propSpecId ?? internalSpecId;
  const activeSpec = CODE_SPECS.find(s => s.id === selectedSpecId) || CODE_SPECS[0];

  const handleSelectSpec = (specId: string) => {
    if (onSpecChange) {
      onSpecChange(specId);
    } else {
      setInternalSpecId(specId);
    }
    setCopied(false);
  };


  const handleCopy = () => {
    navigator.clipboard.writeText(activeSpec.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeSpec.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeSpec.filename.split('/').pop() || 'code_spec.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <FileCode className="w-4 h-4" />
              <span>Production Code Specifications & Modular Skeletons</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Elevated Go Daemon, Python Carver & TS IPC Client</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Fully annotated, production-grade source code demonstrating privilege separation, path sanitization, shared read-locks, and SQLite slack space recovery.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code File Selector */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {CODE_SPECS.map((spec) => (
          <button
            key={spec.id}
            onClick={() => handleSelectSpec(spec.id)}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors flex items-center space-x-2 border ${
              selectedSpecId === spec.id
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {spec.language === 'bash' ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <FileCode className="w-3.5 h-3.5" />}
            <span>{spec.filename}</span>
          </button>
        ))}
      </div>

      {/* Key Architectural Highlights */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
          Key Implementation Guardrails & Security Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeSpec.keyHighlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5"></span>
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Editor View */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg font-mono text-xs">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
          <span className="text-slate-300 font-semibold">{activeSpec.filename}</span>
          <span className="uppercase text-[10px] font-bold text-indigo-400 px-2 py-0.5 bg-indigo-950 border border-indigo-800/50 rounded">
            {activeSpec.language}
          </span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[550px] leading-relaxed text-slate-300 bg-slate-950">
          <pre className="text-[12px] font-mono leading-relaxed whitespace-pre">
            {activeSpec.code}
          </pre>
        </div>
      </div>
    </div>
  );
};
