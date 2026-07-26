import React, { useState } from 'react';
import { Database, Search, FileSearch, Sparkles, Binary, CheckCircle, RefreshCw, Layers, Bookmark, BookmarkCheck } from 'lucide-react';
import { MOCK_MANIFEST_RECORDS, MOCK_SQLITE_PAGES, MOCK_RECOVERED_RECORDS } from '../data/mockForensicData';

interface SQLiteCarverTabProps {
  carverState?: {
    activeSubTab: 'manifest' | 'slack' | 'records';
    searchTerm: string;
    selectedDomain: string;
    selectedPageNum: number;
    varintInput: string;
    bookmarkedRecordIds: number[];
  };
  onStateChange?: (updater: (prev: any) => any) => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'security' | 'session') => void;
}

export const SQLiteCarverTab: React.FC<SQLiteCarverTabProps> = ({
  carverState,
  onStateChange,
  addAuditLog,
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalDomain, setInternalDomain] = useState('ALL');
  const [internalSubTab, setInternalSubTab] = useState<'manifest' | 'slack' | 'records'>('manifest');
  const [internalPageNum, setInternalPageNum] = useState<number>(1);
  const [internalVarint, setInternalVarint] = useState<string>('817f');
  const [internalBookmarks, setInternalBookmarks] = useState<number[]>([]);

  const activeSubTab = carverState?.activeSubTab ?? internalSubTab;
  const searchTerm = carverState?.searchTerm ?? internalSearch;
  const selectedDomain = carverState?.selectedDomain ?? internalDomain;
  const selectedPageNum = carverState?.selectedPageNum ?? internalPageNum;
  const varintInput = carverState?.varintInput ?? internalVarint;
  const bookmarkedRecordIds = carverState?.bookmarkedRecordIds ?? internalBookmarks;

  const updateSubTab = (tab: 'manifest' | 'slack' | 'records') => {
    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, activeSubTab: tab }));
    } else {
      setInternalSubTab(tab);
    }
  };

  const updateSearch = (term: string) => {
    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, searchTerm: term }));
    } else {
      setInternalSearch(term);
    }
  };

  const updateDomain = (domain: string) => {
    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, selectedDomain: domain }));
    } else {
      setInternalDomain(domain);
    }
  };

  const updatePageNum = (page: number) => {
    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, selectedPageNum: page }));
    } else {
      setInternalPageNum(page);
    }
  };

  const updateVarint = (val: string) => {
    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, varintInput: val }));
    } else {
      setInternalVarint(val);
    }
  };

  const toggleBookmark = (id: number) => {
    const isBookmarked = bookmarkedRecordIds.includes(id);
    const nextBookmarks = isBookmarked
      ? bookmarkedRecordIds.filter((bId) => bId !== id)
      : [...bookmarkedRecordIds, id];

    if (onStateChange) {
      onStateChange((prev: any) => ({ ...prev, bookmarkedRecordIds: nextBookmarks }));
    } else {
      setInternalBookmarks(nextBookmarks);
    }

    if (addAuditLog) {
      addAuditLog(
        isBookmarked
          ? `Removed record ID #${id} from evidence bookmarks`
          : `Bookmarked record ID #${id} for forensic evidence export`,
        'info'
      );
    }
  };

  const [decodedVarint, setDecodedVarint] = useState<{ val: number; bytes: number } | null>({ val: 255, bytes: 2 });

  // Filter Manifest Records
  const filteredManifest = MOCK_MANIFEST_RECORDS.filter(rec => {
    const matchesSearch = rec.relativePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rec.fileID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rec.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'ALL' || rec.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  // Simple Varint decode simulation
  const handleDecodeVarint = (hexStr: string) => {
    updateVarint(hexStr);
    try {
      const cleanHex = hexStr.replace(/\s+/g, '');
      const bytes = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
      }
      
      let res = 0;
      let consumed = 0;
      for (let i = 0; i < bytes.length && i < 9; i++) {
        const b = bytes[i];
        consumed++;
        if (i === 8) {
          res = (res << 8) | b;
          break;
        } else {
          res = (res << 7) | (b & 0x7f);
          if (!(b & 0x80)) break;
        }
      }
      setDecodedVarint({ val: res, bytes: consumed });
    } catch {
      setDecodedVarint(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Database className="w-4 h-4" />
              <span>Low-Level Forensics & SQLite Parsing Engine</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">iOS Backup Manifest.db & SQLite Slack Space Carver</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Inspect iOS `Manifest.db` SHA-1 file mappings, decode SQLite B-Tree cell slack space, scan freelist trunk/leaf pages, and recover orphaned payload cells.
            </p>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <button
              onClick={() => updateSubTab('manifest')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'manifest'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manifest.db Inspector
            </button>
            <button
              onClick={() => updateSubTab('slack')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'slack'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Freelist & Slack Decoder
            </button>
            <button
              onClick={() => updateSubTab('records')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'records'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recovered Record Stream
            </button>
          </div>
        </div>
      </div>

      {/* SubTab 1: Manifest.db Inspector */}
      {activeSubTab === 'manifest' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search domain, relativePath, or fileID..."
                value={searchTerm}
                onChange={(e) => updateSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">Domain Filter:</span>
              <select
                value={selectedDomain}
                onChange={(e) => updateDomain(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="ALL">All Domains</option>
                <option value="HomeDomain">HomeDomain</option>
                <option value="CameraRollDomain">CameraRollDomain</option>
                <option value="AppDomain-com.tencent.xin">AppDomain (WeChat)</option>
                <option value="WirelessDomain">WirelessDomain</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">Hashed File ID (SHA-1 / SHA-256)</th>
                  <th className="p-3 font-semibold">Domain</th>
                  <th className="p-3 font-semibold">Relative iOS Path</th>
                  <th className="p-3 font-semibold">Size</th>
                  <th className="p-3 font-semibold">Slack Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900 text-slate-300">
                {filteredManifest.map((rec) => (
                  <tr key={rec.fileID} className="hover:bg-slate-800/40">
                    <td className="p-3 text-indigo-400 font-bold truncate max-w-[200px]">{rec.fileID}</td>
                    <td className="p-3 text-slate-400">{rec.domain}</td>
                    <td className="p-3 text-emerald-400 font-sans font-medium">{rec.relativePath}</td>
                    <td className="p-3 text-slate-400">{(rec.fileSize / 1024).toFixed(1)} KB</td>
                    <td className="p-3">
                      {rec.recoveredFromSlack ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px]">
                          <Sparkles className="w-3 h-3" />
                          <span>Carved from WAL/Slack</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          <span>Active File</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: Freelist & Slack Decoder */}
      {activeSubTab === 'slack' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SQLite Page Structure Viewer */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>SQLite B-Tree & Freelist Page Analyzer</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {MOCK_SQLITE_PAGES.map((pg) => (
                <button
                  key={pg.pageNumber}
                  onClick={() => updatePageNum(pg.pageNumber)}
                  className={`p-3 rounded-lg border text-left transition-all font-mono text-xs ${
                    selectedPageNum === pg.pageNumber
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold">Page #{pg.pageNumber}</div>
                  <div className="text-[10px] text-slate-500 uppercase mt-0.5">{pg.pageType}</div>
                  <div className="text-[10px] text-amber-400 mt-1">{pg.slackSpaceBytes} B Slack</div>
                </button>
              ))}
            </div>

            {/* Selected Page Details */}
            {MOCK_SQLITE_PAGES.find(p => p.pageNumber === selectedPageNum) && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Page Type Identifier:</span>
                  <span className="text-indigo-400 font-bold">
                    {MOCK_SQLITE_PAGES.find(p => p.pageNumber === selectedPageNum)?.pageType}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Cell Count / Free Blocks:</span>
                  <span className="text-emerald-400">
                    {MOCK_SQLITE_PAGES.find(p => p.pageNumber === selectedPageNum)?.cellCount} cells, {' '}
                    {MOCK_SQLITE_PAGES.find(p => p.pageNumber === selectedPageNum)?.freeBlockCount} free blocks
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Page Header & Hex Payload Dump</span>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800 text-slate-300 overflow-x-auto text-[11px] font-mono leading-relaxed tracking-wider">
                    {MOCK_SQLITE_PAGES.find(p => p.pageNumber === selectedPageNum)?.rawHex}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Varint Decoder */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Binary className="w-4 h-4 text-emerald-400" />
              <span>SQLite Varint Interactive Decoder</span>
            </h3>

            <p className="text-xs text-slate-400">
              Enter raw hex bytes representing a SQLite 1 to 9-byte varint to decode integer length or serial-type:
            </p>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Hex Bytes</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={varintInput}
                  onChange={(e) => handleDecodeVarint(e.target.value)}
                  placeholder="e.g. 81 7f"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 w-full"
                />
                <button
                  onClick={() => handleDecodeVarint(varintInput)}
                  className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {decodedVarint !== null ? (
              <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Decoded Value:</span>
                  <span className="text-emerald-400 font-bold">{decodedVarint.val}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Bytes Consumed:</span>
                  <span className="text-indigo-400 font-bold">{decodedVarint.bytes} bytes</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2 rounded">
                Invalid hex varint format
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: Recovered Record Stream */}
      {activeSubTab === 'records' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <FileSearch className="w-4 h-4 text-amber-400" />
              <span>Carved iOS Artifact Record Stream</span>
            </h3>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-md">
              3 Records Restored from Slack & Freelist
            </span>
          </div>

          <div className="space-y-4">
            {MOCK_RECOVERED_RECORDS.map((rec) => (
              <div key={rec.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold">
                      Table: {rec.table}
                    </span>
                    <span className="text-slate-300 font-semibold">{rec.sourceFile}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-slate-500">Offset: 0x{rec.rawCellOffset.toString(16)}</span>
                    <span className="text-emerald-400 font-bold">Confidence: {(rec.confidenceScore * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => toggleBookmark(rec.id)}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors ${
                        bookmarkedRecordIds.includes(rec.id)
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Bookmark evidence record"
                    >
                      {bookmarkedRecordIds.includes(rec.id) ? (
                        <>
                          <BookmarkCheck className="w-3 h-3 text-amber-400" />
                          <span>Bookmarked</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span>Bookmark</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Restored Payload Key-Values</span>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                    {Object.entries(rec.dataFields).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-300">
                        <span className="text-indigo-400">{k}:</span>
                        <span className="text-slate-200 font-sans font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Carved Timestamp: {rec.deletedTimestamp}</span>
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>CRC & Varint Schema Verified</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
