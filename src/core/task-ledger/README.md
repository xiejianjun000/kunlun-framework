# TaskLedger - Durable Task Ledger

SQLite-backed persistent task management for OpenTaiji EvolutionSystem.

## Features

- **Durable Task Execution** - Tasks persist across process crashes
- **Stale Task Reclamation** - Automatic recovery of abandoned tasks
- **Lease/Heartbeat Pattern** - Prevents duplicate execution
- **Idempotency Support** - Deduplication via unique keys
- **Full Audit Trail** - Complete history of all task events
- **Progress Tracking** - Step-by-step execution state
- **Automatic Retry** - Configurable retry with backoff

## Architecture

Inspired by [reflow-ts](https://github.com/danfry1/reflow-ts) design patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                      TaskLedger                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │TaskRecord   │  │TaskRecovery │  │ SQLiteStorageAdapter │ │
│  │ - create    │  │ - claim     │  │ - WAL mode          │ │
│  │ - update    │  │ - heartbeat │  │ - Foreign keys      │ │
│  │ - complete  │  │ - reclaim   │  │ - Transactions      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  SQLite Database │
                    │  - tasks         │
                    │  - task_history  │
                    │  - stale_tasks   │
                    │  - idempotency   │
                    └─────────────────┘
```

## Installation

```bash
npm install better-sqlite3
```

## Usage

### Initialize TaskLedger

```typescript
import { TaskLedger } from './TaskLedger';

const ledger = new TaskLedger({
  dbPath: './task-ledger.db',
  workerId: 'worker-1',
  leaseDurationMs: 30000,
  heartbeatIntervalMs: 10000,
  autoRecovery: true
});

await ledger.initialize();
```

### Create a Task

```typescript
const task = await ledger.createTask({
  name: 'process-report',
  type: 'report-generation',
  input_data: { reportId: 'RPT-123' },
  max_attempts: 3,
  idempotency_key: 'report-RPT-123'  // Optional deduplication
});
```

### Process Tasks with Polling

```typescript
ledger.startPolling(async (task) => {
  const input = task.getInputData();
  console.log(`Processing: ${task.name}`);
  
  try {
    // Simulate work
    await task.updateProgress(50);
    await task.addCompletedStep('step1');
    
    await task.updateProgress(100);
    await task.markCompleted({ result: 'success' });
  } catch (error) {
    await task.markFailed(error);
  }
}, 1000);
```

### Manual Task Claiming

```typescript
const { task, reclaimed } = await ledger.claimNextTask();
if (task) {
  // Process task...
  await task.markCompleted();
}
```

### Query Tasks

```typescript
const pendingTasks = await ledger.queryTasks({
  status: 'pending',
  order_by: 'priority',
  order_dir: 'desc'
});
```

### Get Task History

```typescript
const history = await ledger.getTaskHistory(task.id);
console.log('Task events:', history);
```

### Get Statistics

```typescript
const stats = await ledger.getStatistics();
console.log(`Total: ${stats.total}, Success rate: ${stats.success_rate}`);
```

## Database Schema

### tasks Table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY | Unique task ID |
| name | TEXT | Task name |
| type | TEXT | Task type/category |
| status | TEXT | pending/running/completed/failed |
| priority | INTEGER | Task priority |
| input_data | TEXT | JSON input |
| output_data | TEXT | JSON output |
| current_step | TEXT | Current execution step |
| completed_steps | TEXT | JSON array of steps |
| attempt_count | INTEGER | Retry attempts |
| lease_expires_at | TEXT | Lease expiration time |
| worker_id | TEXT | Current worker |
| progress | REAL | 0-100% |

### task_history Table

Full audit trail for all task events.

## Recovery Pattern

The stale task reclamation pattern:

1. **Worker claims task** → Sets lease_expires_at
2. **Worker sends heartbeats** → Extends lease
3. **Worker completes** → Status changes to completed
4. **If worker crashes:**
   - Lease expires without heartbeat
   - Other worker detects stale task
   - Task is reclaimed and re-queued

## Integration with EvolutionSystem

```typescript
import { TaskLedger } from './task-ledger/TaskLedger';
import { EvolutionSystem } from './EvolutionSystem';

// Initialize together
const ledger = new TaskLedger({
  dbPath: '.evolution/tasks.db',
  workerId: 'evolution-worker'
});

const evolution = new EvolutionSystem({
  taskLedger: ledger,
  // ... other config
});
```

## License

MIT
