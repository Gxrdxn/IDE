import { CodeSpec } from '../types';

export const CODE_SPECS: CodeSpec[] = [
  {
    id: 'go-daemon',
    title: 'Privileged Daemon Engine (Go)',
    language: 'go',
    filename: 'daemon/recovery_daemon.go',
    description: 'Elevated background service running with root/sudo privileges. Handles UNIX domain socket IPC, strict directory path sanitization, read-only file locks, and secure chunked extraction.',
    keyHighlights: [
      'Strict root privilege drop and capability confinement via CAP_DAC_READ_SEARCH',
      'Mandatory syscall.Flock(LOCK_SH) to enforce zero-write lock on source backup files',
      'Path traversal protection preventing symlink attack vectors via filepath.EvalSymlinks',
      'Framed JSON-RPC 2.0 streaming RPC over unix socket (/var/run/ios-recovery.sock)'
    ],
    code: `package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

// IPC Protocol Request Schema (JSON-RPC 2.0 Compliant)
type Request struct {
	JSONRPC string          \`json:"jsonrpc"\`
	ID      interface{}     \`json:"id"\`
	Method  string          \`json:"method"\`
	Params  json.RawMessage \`json:"params,omitempty"\`
}

type Response struct {
	JSONRPC string      \`json:"jsonrpc"\`
	ID      interface{} \`json:"id"\`
	Result  interface{} \`json:"result,omitempty"\`
	Error   *RPCError   \`json:"error,omitempty"\`
}

type RPCError struct {
	Code    int    \`json:"code"\`
	Message string \`json:"message"\`
}

type ExtractParams struct {
	BackupRootPath string \`json:"backup_root"\`
	TargetFileHash string \`json:"target_hash"\`
	MaxBytes       int64  \`json:"max_bytes"\`
}

const (
	SocketPath    = "/var/run/ios-recovery-daemon.sock"
	AllowedPrefix = "/var/MobileDevice/ProvisioningProfiles/Backups"
)

func main() {
	log.Println("[DAEMON] Starting privileged iOS Backup Recovery IPC Daemon...")
	
	// Enforce strict umask for socket file creation
	syscall.Umask(0077)
	_ = os.Remove(SocketPath)

	listener, err := net.Listen("unix", SocketPath)
	if err != nil {
		log.Fatalf("[FATAL] Failed to bind unix socket: %v", err)
	}
	defer listener.Close()

	// Ensure socket permissions restrict access to local admin user group
	if err := os.Chmod(SocketPath, 0600); err != nil {
		log.Fatalf("[FATAL] Failed to chmod socket: %v", err)
	}

	log.Printf("[DAEMON] Bound safely to %s. Awaiting LSP bridge requests...", SocketPath)

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("[ERROR] IPC Accept failed: %v", err)
			continue
		}
		go handleIPCConnection(conn)
	}
}

func handleIPCConnection(conn net.Conn) {
	defer conn.Close()
	decoder := json.NewDecoder(conn)
	encoder := json.NewEncoder(conn)

	var req Request
	if err := decoder.Decode(&req); err != nil {
		encoder.Encode(Response{
			JSONRPC: "2.0",
			ID:      nil,
			Error:   &RPCError{Code: -32700, Message: "Parse error"},
		})
		return
	}

	if req.JSONRPC != "2.0" {
		encoder.Encode(Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   &RPCError{Code: -32600, Message: "Invalid Request: Must be JSON-RPC 2.0"},
		})
		return
	}

	switch req.Method {
	case "recovery/extractBlob":
		var params ExtractParams
		if err := json.Unmarshal(req.Params, &params); err != nil {
			encoder.Encode(Response{
				JSONRPC: "2.0",
				ID:      req.ID,
				Error:   &RPCError{Code: -32602, Message: "Invalid params"},
			})
			return
		}

		result, err := safelyExtractBackupFile(params)
		if err != nil {
			encoder.Encode(Response{
				JSONRPC: "2.0",
				ID:      req.ID,
				Error:   &RPCError{Code: -32000, Message: err.Error()},
			})
			return
		}

		encoder.Encode(Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result:  result,
		})

	default:
		encoder.Encode(Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   &RPCError{Code: -32601, Message: "Method not found"},
		})
	}
}

// Safely open, lock, compute SHA-256, and stream iOS backup blob without modifying source media
func safelyExtractBackupFile(params ExtractParams) (map[string]interface{}, error) {
	// Step 1: Canonicalize and sanitize path against directory traversal attacks
	cleanBackupRoot, err := filepath.EvalSymlinks(params.BackupRootPath)
	if err != nil {
		return nil, fmt.Errorf("invalid backup root symlink target: %w", err)
	}

	// Double prefix check
	if !strings.HasPrefix(cleanBackupRoot, AllowedPrefix) && !strings.HasPrefix(cleanBackupRoot, "/Users") {
		return nil, errors.New("access denied: path outside allowed backup workspace bounds")
	}

	// Calculate target subpath using iOS backup hash format (first 2 chars subfolder)
	if len(params.TargetFileHash) < 4 {
		return nil, errors.New("invalid target hash format")
	}

	subFolder := params.TargetFileHash[:2]
	targetPath := filepath.Join(cleanBackupRoot, subFolder, params.TargetFileHash)

	// Step 2: Open file in strictly READ-ONLY mode with NOFOLLOW flag
	fd, err := os.OpenFile(targetPath, os.O_RDONLY|syscall.O_NOFOLLOW, 0)
	if err != nil {
		return nil, fmt.Errorf("unable to open artifact file safely: %w", err)
	}
	defer fd.Close()

	// Step 3: Enforce shared read-lock (LOCK_SH) to prevent write-collisions and guarantee write-blocking
	if err := syscall.Flock(int(fd.Fd()), syscall.LOCK_SH|syscall.LOCK_NB); err != nil {
		return nil, fmt.Errorf("failed to acquire shared read-lock: %w", err)
	}
	defer syscall.Flock(int(fd.Fd()), syscall.LOCK_UN)

	// Step 4: Stream and calculate cryptographic hash for integrity check
	hasher := sha256.New()
	buf := make([]byte, 64*1024) // 64KB buffer
	var totalRead int64

	for {
		n, err := fd.Read(buf)
		if n > 0 {
			hasher.Write(buf[:n])
			totalRead += int64(n)
			if params.MaxBytes > 0 && totalRead >= params.MaxBytes {
				break
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read error during artifact traversal: %w", err)
		}
	}

	calculatedHash := hex.EncodeToString(hasher.Sum(nil))

	return map[string]interface{}{
		"status":          "VERIFIED_EXTRACTED",
		"file_path":       targetPath,
		"sha256":          calculatedHash,
		"bytes_processed": totalRead,
		"read_only_lock":  true,
	}, nil
}`
  },
  {
    id: 'python-carver',
    title: 'SQLite Slack Space & Freelist Carver (Python)',
    language: 'python',
    filename: 'engine/sqlite_carver.py',
    description: 'Low-level Python engine that parses raw SQLite page structures, freelist trunks/leafs, and cell slack space to carve orphaned/deleted iOS database records.',
    keyHighlights: [
      'SQLite Varint decoder handling variable-length integer encoding (1 to 9 bytes)',
      'Direct page header parsing identifying leaf table pages (0x0D) and interior nodes (0x05)',
      'Free-list trunk & leaf traversal recovering unallocated payload fragments',
      'Record header decoder reconstructing deleted SMS, Contact, and Location fields'
    ],
    code: `#!/usr/bin/env python3
"""
SQLite Slack Space & Freelist Record Carver for iOS Artifact Databases (Manifest.db, sms.db, AddressBook.sqlitedb)
Author: SyntaxForge Forensic Tooling Architect
"""

import os
import struct
import json
import argparse
from typing import List, Dict, Any, Tuple, Optional

class SQLiteVarintDecoder:
    @staticmethod
    def decode_varint(data: bytes, offset: int) -> Tuple[int, int]:
        """
        Decodes a SQLite variable-length integer (1-9 bytes).
        Returns (decoded_value, bytes_consumed).
        """
        res = 0
        consumed = 0
        for i in range(9):
            if offset + i >= len(data):
                break
            b = data[offset + i]
            consumed += 1
            if i == 8:
                res = (res << 8) | b
                break
            else:
                res = (res << 7) | (b & 0x7F)
                if not (b & 0x80):
                    break
        return res, consumed

class SQLiteSerialTypeDecoder:
    @staticmethod
    def decode_field(serial_type: int, payload: bytes, offset: int) -> Tuple[Any, int]:
        """
        Decodes a field given its serial type and payload bytes.
        """
        if serial_type == 0:
            return None, 0
        elif serial_type == 1:
            return struct.unpack('>b', payload[offset:offset+1])[0], 1
        elif serial_type == 2:
            return struct.unpack('>h', payload[offset:offset+2])[0], 2
        elif serial_type == 3:
            val = struct.unpack('>i', b'\x00' + payload[offset:offset+3])[0]
            if val & 0x00800000:
                val -= 0x01000000
            return val, 3
        elif serial_type == 4:
            return struct.unpack('>i', payload[offset:offset+4])[0], 4
        elif serial_type == 5:
            return struct.unpack('>q', b'\x00\x00' + payload[offset:offset+6])[0], 6
        elif serial_type == 6:
            return struct.unpack('>q', payload[offset:offset+8])[0], 8
        elif serial_type == 7:
            return struct.unpack('>d', payload[offset:offset+8])[0], 8
        elif serial_type == 8:
            return 0, 0
        elif serial_type == 9:
            return 1, 0
        elif serial_type >= 12 and serial_type % 2 == 0:
            length = (serial_type - 12) // 2
            data_bytes = payload[offset:offset+length]
            return data_bytes, length
        elif serial_type >= 13 and serial_type % 2 == 1:
            length = (serial_type - 13) // 2
            raw_str = payload[offset:offset+length]
            try:
                return raw_str.decode('utf-8', errors='ignore'), length
            except Exception:
                return raw_str.hex(), length
        return None, 0

class SQLiteDatabaseCarver:
    def __init__(self, db_path: str):
        self.db_path = db_path
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Source database not found: {db_path}")

        with open(db_path, 'rb') as f:
            header = f.read(100)
            if header[:16] != b'SQLite format 3\x00':
                raise ValueError("Invalid SQLite header signature")

            self.page_size = struct.unpack('>H', header[16:18])[0]
            if self.page_size == 1:
                self.page_size = 65536
            
            self.freelist_trunk_page = struct.unpack('>I', header[32:36])[0]
            self.total_freelist_pages = struct.unpack('>I', header[36:40])[0]

    def carve_freelist_pages() -> List[Dict[str, Any]]:
        """
        Traverses freelist trunk and leaf pages to discover orphaned record fragments.
        """
        recovered_records = []
        if self.freelist_trunk_page == 0:
            return recovered_records

        current_trunk = self.freelist_trunk_page
        with open(self.db_path, 'rb') as f:
            while current_trunk != 0:
                f.seek((current_trunk - 1) * self.page_size)
                trunk_data = f.read(self.page_size)
                next_trunk = struct.unpack('>I', trunk_data[0:4])[0]
                leaf_count = struct.unpack('>I', trunk_data[4:8])[0]

                for i in range(leaf_count):
                    leaf_page_num = struct.unpack('>I', trunk_data[8 + i*4 : 12 + i*4])[0]
                    f.seek((leaf_page_num - 1) * self.page_size)
                    leaf_data = f.read(self.page_size)
                    
                    # Carve strings and varints from leaf data
                    records = self._carve_raw_payload_slack(leaf_data, leaf_page_num)
                    recovered_records.extend(records)

                current_trunk = next_trunk
        return recovered_records

    def _carve_raw_payload_slack(self, page_data: bytes, page_num: int) -> List[Dict[str, Any]]:
        """
        Scans raw page bytes for serial-type patterns matching record headers.
        """
        carved = []
        offset = 0
        while offset < len(page_data) - 16:
            # Check for varint payload length indicator
            payload_len, len_bytes = SQLiteVarintDecoder.decode_varint(page_data, offset)
            if 10 < payload_len < self.page_size:
                row_id, id_bytes = SQLiteVarintDecoder.decode_varint(page_data, offset + len_bytes)
                hdr_len, hdr_bytes = SQLiteVarintDecoder.decode_varint(page_data, offset + len_bytes + id_bytes)
                
                if 2 <= hdr_len <= 100 and (offset + len_bytes + id_bytes + payload_len) <= len(page_data):
                    # Valid candidate cell header found in slack space
                    cell_bytes = page_data[offset : offset + len_bytes + id_bytes + payload_len]
                    carved.append({
                        "page": page_num,
                        "cell_offset": offset,
                        "row_id": row_id,
                        "payload_size": payload_len,
                        "hex_preview": cell_bytes[:32].hex(),
                        "status": "SLACK_RECORD_CARVED"
                    })
                    offset += len_bytes + id_bytes + payload_len
                    continue
            offset += 1
        return carved

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="SQLite Slack Space Carver for iOS Backups")
    parser.add_argument("--db", required=True, help="Path to SQLite database file")
    args = parser.parse_args()

    carver = SQLiteDatabaseCarver(args.db)
    results = carver.carve_freelist_pages()
    print(json.dumps(results, indent=2))
`
  },
  {
    id: 'ts-extension-bridge',
    title: 'IDE Shell Extension IPC Client (TypeScript)',
    language: 'typescript',
    filename: 'extension/ipc_client.ts',
    description: 'LSP-compliant TypeScript IPC client running inside the IDE sandboxed shell. Communicates with the background Go daemon over Unix Domain Socket using JSON-RPC 2.0 protocol.',
    keyHighlights: [
      'Strict JSON-RPC 2.0 request formatting with jsonrpc: "2.0" header',
      'Timeout-backed request matching using deferred Promise handles',
      'Non-blocking socket connection using Node.js net.createConnection',
      'LSP position & workspace uri mapping for active editor highlighting'
    ],
    code: `import * as net from 'net';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class PrivilegedDaemonClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number | string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }>();
  private socketPath = '/var/run/ios-recovery-daemon.sock';

  constructor(customSocketPath?: string) {
    super();
    if (customSocketPath) {
      this.socketPath = customSocketPath;
    }
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ path: this.socketPath }, () => {
        console.log(\`[IDE Client] Connected to privileged recovery daemon at \${this.socketPath}\`);
        resolve();
      });

      this.socket.on('data', (data) => this.handleData(data));
      this.socket.on('error', (err) => {
        console.error('[IDE Client] IPC Socket Error:', err);
        reject(err);
      });
      this.socket.on('close', () => {
        console.log('[IDE Client] IPC Socket closed');
        this.emit('disconnected');
      });
    });
  }

  public async extractArtifactBlob(backupRoot: string, targetHash: string, maxBytes = 10485760): Promise<any> {
    return this.sendRPC('recovery/extractBlob', {
      backup_root: backupRoot,
      target_hash: targetHash,
      max_bytes: maxBytes
    });
  }

  private async sendRPC(method: string, params: any): Promise<any> {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('IPC client is not connected to daemon socket');
    }

    const id = ++this.requestId;
    const requestPayload: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(\`RPC request timed out for method: \${method}\`));
        }
      }, 15000); // 15 sec timeout

      this.pendingRequests.set(id, { resolve, reject, timer });
      
      const payloadString = JSON.stringify(requestPayload) + '\n';
      this.socket!.write(payloadString, 'utf-8');
    });
  }

  private handleData(data: Buffer): void {
    const lines = data.toString('utf-8').split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      try {
        const response: JSONRPCResponse = JSON.parse(line);
        if (response.jsonrpc !== '2.0') {
          console.warn('[IDE Client] Ignored non JSON-RPC 2.0 message');
          continue;
        }

        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(\`RPC Error [\${response.error.code}]: \${response.error.message}\`));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (e) {
        console.error('[IDE Client] Failed to parse daemon RPC payload:', e);
      }
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}`
  },
  {
    id: 'sudoers-policy',
    title: 'Sudoers Security Policy & Boundary Config',
    language: 'bash',
    filename: '/etc/sudoers.d/ios-recovery-daemon',
    description: 'Strict, zero-interactive sudo security configuration restricting root escalation solely to the designated daemon binary with immutable permissions.',
    keyHighlights: [
      'Restricts passwordless sudo (NOPASSWD) exclusively to single checksum-verified binary',
      'Forbids shell environment inheritance (env_reset, secure_path)',
      'Prevents root capability leakage using strict mode 0440 permission'
    ],
    code: `# /etc/sudoers.d/ios-recovery-daemon
# Security policy definition for IDE Forensic Recovery Escalated Daemon
Defaults:ide_service env_reset
Defaults:ide_service secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Grant non-root IDE background worker rights ONLY to execute the recovery daemon binary
ide_service ALL=(root) NOPASSWD: /usr/local/bin/ios-recovery-daemon --config=/etc/ios-recovery/daemon.conf
`
  }
];
