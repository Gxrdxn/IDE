import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw, FileCode, HardDrive, Filter, Download, Zap, AlertTriangle } from 'lucide-react';

interface BlobRecord {
  id: string;
  filename: string;
  domain: string;
  sizeBytes: number;
  sha256Pre: string;
  sha256Post: string;
  status: 'VERIFIED' | 'MISMATCH' | 'TRAVERSAL_BLOCKED';
  timestamp: string;
}

const INITIAL_BATCH_TREND = [
  { batch: 'Batch 01 (00:00)', total: 240, verified: 240, failed: 0, rate: 100 },
  { batch: 'Batch 02 (01:00)', total: 310, verified: 309, failed: 1, rate: 99.68 },
  { batch: 'Batch 03 (02:00)', total: 450, verified: 448, failed: 2, rate: 99.56 },
  { batch: 'Batch 04 (03:00)', total: 520, verified: 518, failed: 2, rate: 99.61 },
  { batch: 'Batch 05 (04:00)', total: 680, verified: 678, failed: 2, rate: 99.70 },
  { batch: 'Batch 06 (05:00)', total: 645, verified: 642, failed: 3, rate: 99.53 },
];

const DOMAIN_BREAKDOWN = [
  { domain: 'MediaDomain', verified: 1240, failed: 3, sizeMB: 8420 },
  { domain: 'AppDomain (SQLite)', verified: 680, failed: 1, sizeMB: 3100 },
  { domain: 'CameraRollDomain', verified: 512, failed: 2, sizeMB: 6200 },
  { domain: 'KeychainDomain', verified: 195, failed: 0, sizeMB: 45 },
  { domain: 'WirelessDomain', verified: 210, failed: 4, sizeMB: 180 },
];

const INITIAL_RECENT_BLOBS: BlobRecord[] = [
  {
    id: 'blob-8921',
    filename: 'Manifest.db-wal',
    domain: 'AppDomain (SQLite)',
    sizeBytes: 4194304,
    sha256Pre: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    sha256Post: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'VERIFIED',
    timestamp: '05:41:12',
  },
  {
    id: 'blob-8922',
    filename: '3d0d1282210e39a02b2bca6e4f1a2387.attachment',
    domain: 'MediaDomain',
    sizeBytes: 1548291,
    sha256Pre: 'a7f30d22091e8712a1012390812301823a010923012930192301923019230129',
    sha256Post: 'a7f30d22091e8712a1012390812301823a010923012930192301923019230129',
    status: 'VERIFIED',
    timestamp: '05:41:28',
  },
  {
    id: 'blob-8923',
    filename: 'Keychain.plist',
    domain: 'KeychainDomain',
    sizeBytes: 65536,
    sha256Pre: '92100871120a11223d0d1282210e39a02b2bca6e4f1a2387114b301292100871',
    sha256Post: '92100871120a11223d0d1282210e39a02b2bca6e4f1a2387114b301292100871',
    status: 'VERIFIED',
    timestamp: '05:42:01',
  },
  {
    id: 'blob-8924',
    filename: '../../var/root/shadow_backup',
    domain: 'WirelessDomain',
    sizeBytes: 2048,
    sha256Pre: 'ABORTED',
    sha256Post: 'ABORTED',
    status: 'TRAVERSAL_BLOCKED',
    timestamp: '05:42:15',
  },
  {
    id: 'blob-8925',
    filename: 'IMG_4021.heic',
    domain: 'CameraRollDomain',
    sizeBytes: 3840120,
    sha256Pre: '4820129182301928301928301928301928301928301928301928301928301928',
    sha256Post: 'ffff000082301928301928301928301928301928301928301928301928301928',
    status: 'MISMATCH',
    timestamp: '05:43:02',
  },
];

interface ChecksumDashboardProps {
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'security' | 'session') => void;
}

export const ChecksumDashboard: React.FC<ChecksumDashboardProps> = ({ addAuditLog }) => {
  const [trendData, setTrendData] = useState(INITIAL_BATCH_TREND);
  const [domainData, setDomainData] = useState(DOMAIN_BREAKDOWN);
  const [recentBlobs, setRecentBlobs] = useState<BlobRecord[]>(INITIAL_RECENT_BLOBS);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSimulating, setIsSimulating] = useState(false);

  // Compute aggregate stats dynamically
  const stats = useMemo(() => {
    let totalVerified = 0;
    let totalFailed = 0;
    let totalMB = 0;

    domainData.forEach((d) => {
      totalVerified += d.verified;
      totalFailed += d.failed;
      totalMB += d.sizeMB;
    });

    const totalBlobs = totalVerified + totalFailed;
    const successRate = totalBlobs > 0 ? (totalVerified / totalBlobs) * 100 : 100;

    return {
      totalBlobs,
      totalVerified,
      totalFailed,
      successRate: successRate.toFixed(2),
      totalGB: (totalMB / 1024).toFixed(2),
    };
  }, [domainData]);

  // Donut chart status data
  const pieData = useMemo(() => {
    return [
      { name: 'Verified SHA-256 Matches', value: stats.totalVerified, color: '#10b981' },
      { name: 'Hash Mismatches', value: stats.totalFailed, color: '#f43f5e' },
      { name: 'Path Traversal Blocked', value: recentBlobs.filter(b => b.status === 'TRAVERSAL_BLOCKED').length, color: '#f59e0b' },
    ];
  }, [stats, recentBlobs]);

  // Filter recent blob log table
  const filteredBlobs = useMemo(() => {
    return recentBlobs.filter((b) => {
      const matchDomain = selectedDomainFilter === 'ALL' || b.domain.includes(selectedDomainFilter);
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchDomain && matchStatus;
    });
  }, [recentBlobs, selectedDomainFilter, statusFilter]);

  // Trigger live batch simulation
  const handleSimulateBatch = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const batchNum = trendData.length + 1;
      const newVerified = Math.floor(Math.random() * 200) + 300;
      const isCorrupted = Math.random() < 0.25;
      const newFailed = isCorrupted ? 1 : 0;
      const totalNew = newVerified + newFailed;

      const updatedTrend = [
        ...trendData,
        {
          batch: `Batch ${batchNum < 10 ? '0' + batchNum : batchNum} (${new Date().toLocaleTimeString().slice(0, 5)})`,
          total: totalNew,
          verified: newVerified,
          failed: newFailed,
          rate: Number(((newVerified / totalNew) * 100).toFixed(2)),
        },
      ];

      setTrendData(updatedTrend);

      // Randomly update domain stats
      const randomDomainIdx = Math.floor(Math.random() * domainData.length);
      const nextDomainData = [...domainData];
      nextDomainData[randomDomainIdx] = {
        ...nextDomainData[randomDomainIdx],
        verified: nextDomainData[randomDomainIdx].verified + newVerified,
        failed: nextDomainData[randomDomainIdx].failed + newFailed,
        sizeMB: nextDomainData[randomDomainIdx].sizeMB + Math.floor(Math.random() * 800) + 200,
      };
      setDomainData(nextDomainData);

      // Add a log entry
      const nowStr = new Date().toLocaleTimeString();
      const newBlob: BlobRecord = {
        id: `blob-${Date.now().toString().slice(-4)}`,
        filename: isCorrupted ? 'corrupted_payload_stream.sqlite' : `recovered_media_${Date.now().toString().slice(-4)}.mov`,
        domain: nextDomainData[randomDomainIdx].domain,
        sizeBytes: Math.floor(Math.random() * 5000000) + 100000,
        sha256Pre: 'd41d8cd98f00b204e9800998ecf8427e08210928301928301928301928301928',
        sha256Post: isCorrupted
          ? 'e99a18c428120018230192830192830192830192830192830192830192830192'
          : 'd41d8cd98f00b204e9800998ecf8427e08210928301928301928301928301928',
        status: isCorrupted ? 'MISMATCH' : 'VERIFIED',
        timestamp: nowStr,
      };

      setRecentBlobs((prev) => [newBlob, ...prev]);
      setIsSimulating(false);

      if (addAuditLog) {
        addAuditLog(
          `Simulated extraction stream batch #${batchNum}: ${newVerified} blobs verified, ${newFailed} failures detected.`,
          isCorrupted ? 'warning' : 'info'
        );
      }
    }, 600);
  };

  // Export CSV verification report
  const handleExportCSV = () => {
    const headers = ['Blob ID', 'Filename', 'Domain', 'Size (Bytes)', 'Pre-SHA256', 'Post-SHA256', 'Status', 'Timestamp'];
    const rows = recentBlobs.map((b) => [
      b.id,
      b.filename,
      b.domain,
      b.sizeBytes,
      b.sha256Pre,
      b.sha256Post,
      b.status,
      b.timestamp,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `checksum_verification_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (addAuditLog) {
      addAuditLog('Exported checksum verification audit report to CSV', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar for Dashboard */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Forensic Recharts Analytics Engine</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">File Blob Checksum Verification & Integrity Success Dashboard</h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of cryptographic stream hashes, write-blocker isolation, and byte-level payload validation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSimulateBatch}
            disabled={isSimulating}
            className="flex items-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Extracting & Verifying...' : 'Simulate Stream Batch'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Checksum Success Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>Overall Verification Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{stats.successRate}%</span>
            <span className="text-[10px] text-emerald-500 font-semibold font-mono">Target: 100%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Number(stats.successRate), 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Total Blobs Processed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>Total Verified Blobs</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{stats.totalVerified.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">/ {stats.totalBlobs.toLocaleString()} total</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">{stats.totalGB} GB validated under LOCK_SH</p>
        </div>

        {/* Card 3: Corrupted / Hash Mismatches */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>Hash Mismatches / Aborts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${stats.totalFailed > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {stats.totalFailed}
            </span>
            <span className="text-[10px] text-slate-400">blobs flagged</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {stats.totalFailed === 0 ? 'No corruption detected' : 'Quarantined for manual hex review'}
          </p>
        </div>

        {/* Card 4: Active Write-Blocker Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>Syscall Lock Assurance</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-300">O_RDONLY</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-mono font-medium">0 byte modifications committed</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Area Chart - Success Rate & Batch Volume Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Verification Rate & Stream Volume Trend</h4>
              <p className="text-xs text-slate-400">Batch-by-batch percentage pass rate vs. extracted blob count</p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40">
              <span>Avg: 99.6% Pass Rate</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="verifiedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="batch" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[95, 100]} stroke="#818cf8" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="verified"
                  name="Verified Blobs"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#verifiedGradient)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  name="Success Rate %"
                  stroke="#818cf8"
                  fillOpacity={1}
                  fill="url(#rateGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Donut Chart - Integrity Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Integrity Outcome Breakdown</h4>
            <p className="text-xs text-slate-400">Distribution of blob verification results</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] pt-2 border-t border-slate-800">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="font-bold">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart: Checksum Verification by Domain */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Verification Volume & Failures by iOS Backup Domain</h4>
            <p className="text-xs text-slate-400">Comparing cryptographic passes against failed hash checks per domain</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Total Size: {stats.totalGB} GB</span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="domain" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="verified" name="Verified Matches" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Hash Mismatches" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Checksum Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-slate-200">Recent Extracted Blob Checksum Logs</h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Domain:</span>
            </div>
            <select
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Domains</option>
              <option value="MediaDomain">MediaDomain</option>
              <option value="AppDomain">AppDomain (SQLite)</option>
              <option value="CameraRoll">CameraRoll</option>
              <option value="Keychain">Keychain</option>
              <option value="Wireless">Wireless</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="MISMATCH">Mismatch Only</option>
              <option value="TRAVERSAL_BLOCKED">Traversal Blocked</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <th className="p-2.5">Blob ID & File</th>
                <th className="p-2.5">Domain</th>
                <th className="p-2.5">Size</th>
                <th className="p-2.5">Pre-SHA256 vs Post-SHA256</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBlobs.map((blob) => (
                <tr key={blob.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-2.5 space-y-0.5">
                    <span className="font-bold text-slate-200 block">{blob.filename}</span>
                    <span className="text-[10px] text-slate-500">{blob.id}</span>
                  </td>
                  <td className="p-2.5 text-slate-300">{blob.domain}</td>
                  <td className="p-2.5 text-slate-400">{(blob.sizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="p-2.5 space-y-1">
                    <div className="text-[10px] text-slate-400">
                      <span className="text-slate-500">PRE: </span>
                      <span className="text-slate-300 font-mono">{blob.sha256Pre.slice(0, 16)}...</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <span className="text-slate-500">POST: </span>
                      <span className={blob.status === 'VERIFIED' ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                        {blob.sha256Post.slice(0, 16)}...
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        blob.status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : blob.status === 'MISMATCH'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {blob.status === 'VERIFIED' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                          <span>Match</span>
                        </>
                      ) : blob.status === 'MISMATCH' ? (
                        <>
                          <AlertTriangle className="w-3 h-3 mr-1 text-rose-400" />
                          <span>Mismatch</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 mr-1 text-amber-400" />
                          <span>Blocked</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500">{blob.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
