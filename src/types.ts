export interface ManifestRecord {
  fileID: string;
  domain: string;
  relativePath: string;
  flags: number;
  fileMetaHex: string;
  recoveredFromSlack: boolean;
  fileSize: number;
}

export interface SqlitePage {
  pageNumber: number;
  pageType: 'leaf_table' | 'interior_table' | 'freelist_trunk' | 'freelist_leaf';
  cellCount: number;
  unallocatedStart: number;
  freeBlockCount: number;
  slackSpaceBytes: number;
  rawHex: string;
}

export interface RecoveredRecord {
  id: number;
  sourceFile: string;
  table: string;
  deletedTimestamp: string;
  dataFields: Record<string, string | number | null>;
  confidenceScore: number;
  rawCellOffset: number;
}

export interface IpcMessage {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
  result?: Record<string, any>;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface CodeSpec {
  id: string;
  title: string;
  language: 'go' | 'python' | 'typescript' | 'bash';
  filename: string;
  description: string;
  code: string;
  keyHighlights: string[];
}

export interface SessionState {
  sessionName: string;
  caseNumber: string;
  examinerNotes: string;
  lastSaved: string;
  activeTab: string;
  archState: {
    activeStage: number;
  };
  carverState: {
    activeSubTab: 'manifest' | 'slack' | 'records';
    searchTerm: string;
    selectedDomain: string;
    selectedPageNum: number;
    varintInput: string;
    bookmarkedRecordIds: number[];
  };
  specsState: {
    selectedSpecId: string;
  };
  lspState: {
    inputPayload: string;
  };
  guardrailsState: {
    testPath: string;
  };
  auditLogs: Array<{
    id: string;
    timestamp: string;
    action: string;
    type: 'info' | 'warning' | 'security' | 'session';
  }>;
}

export const DEFAULT_SESSION_STATE: SessionState = {
  sessionName: 'Active Session #8042 - iPhone 14 Pro',
  caseNumber: 'CASE-2026-0723-A',
  examinerNotes: 'Examining Manifest.db for deleted iMessage records and WAL slack space.',
  lastSaved: new Date().toISOString(),
  activeTab: 'arch',
  archState: {
    activeStage: 0,
  },
  carverState: {
    activeSubTab: 'manifest',
    searchTerm: '',
    selectedDomain: 'ALL',
    selectedPageNum: 1,
    varintInput: '817f',
    bookmarkedRecordIds: [],
  },
  specsState: {
    selectedSpecId: 'go-daemon',
  },
  lspState: {
    inputPayload: `{
  "jsonrpc": "2.0",
  "id": 1001,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///var/MobileDevice/Backups/Manifest.db"
    },
    "position": {
      "line": 5,
      "character": 10
    }
  }
}`,
  },
  guardrailsState: {
    testPath: '/var/MobileDevice/ProvisioningProfiles/Backups/3d0d1282210e39a0/2b/2b2bca6e4f1a2387114b301292100871120a1122',
  },
  auditLogs: [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      action: 'Forensic session initialized & bound to local storage persistence engine',
      type: 'session',
    },
  ],
};

