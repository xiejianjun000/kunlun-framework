-- TaskLedger Database Schema
-- Durable Task Ledger for OpenTaiji EvolutionSystem
-- Inspired by reflow-ts (GitHub: danfry1/reflow-ts)

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================
-- Core Tables
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'default',
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Input/Output data (JSON)
    input_data TEXT,
    output_data TEXT,
    error_data TEXT,
    
    -- Execution context
    current_step TEXT,
    completed_steps TEXT DEFAULT '[]',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    -- Timing
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    scheduled_at TEXT,
    
    -- Heartbeat/Lease (Stale Run Reclamation)
    lease_expires_at TEXT,
    worker_id TEXT,
    
    -- Progress tracking
    progress REAL DEFAULT 0,
    
    -- Metadata
    metadata TEXT DEFAULT '{}',
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 
        'cancelled', 'paused', 'waiting_retry'
    ))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lease_expires ON tasks(lease_expires_at);

-- ============================================
-- Audit Log Tables
-- ============================================

CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT,
    task_snapshot TEXT,
    worker_id TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    error_message TEXT,
    stack_trace TEXT,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON task_history(timestamp);

-- ============================================
-- Recovery & Stale Task Management
-- ============================================

CREATE TABLE IF NOT EXISTS stale_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL UNIQUE,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_heartbeat TEXT NOT NULL,
    reason TEXT,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================
-- Idempotency & Deduplication
-- ============================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================
-- Schema Version Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial TaskLedger schema');
