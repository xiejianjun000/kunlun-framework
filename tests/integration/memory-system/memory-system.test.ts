/**
 * Memory系统集成测试
 * Memory System Integration Tests
 * 
 * 测试场景：
 * 1. 记忆存储和检索
 * 2. 记忆层次结构（Hot/Warm/Cold）
 * 3. 记忆循环处理
 * 4. 记忆统计和清理
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import Database from 'better-sqlite3';
import { NodeManager } from '../../../src/integrations/graph-memory/NodeManager';
import { EdgeManager } from '../../../src/integrations/graph-memory/EdgeManager';
import {
  CreateNodeInput,
  CreateEdgeInput,
  NodeKind,
  EdgeKind,
  ConfidenceTier,
  MemoryNodeMapping,
} from '../../../src/integrations/graph-memory/types';

// 内存数据库用于测试
let db: Database.Database;
let nodeManager: NodeManager;
let edgeManager: EdgeManager;

describe('Memory System Integration Tests', () => {
  beforeAll(() => {
    db = new Database(':memory:');
    
    // 初始化表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        qualified_name TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        content TEXT,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        confidence_tier TEXT DEFAULT 'EXTRACTED',
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
      );
      
      -- 记忆映射表
      CREATE TABLE IF NOT EXISTS memory_mappings (
        node_id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
      );
      
      -- 记忆索引表
      CREATE TABLE IF NOT EXISTS memory_index (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        content TEXT,
        embedding BLOB,
        tier TEXT NOT NULL,
        user_id TEXT,
        tenant_id TEXT,
        created_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_memory_tier ON memory_index(tier);
      CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_index(user_id);
      CREATE INDEX IF NOT EXISTS idx_memory_tenant ON memory_index(tenant_id);
    `);
    
    nodeManager = new NodeManager(db);
    edgeManager = new EdgeManager(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    db.exec('DELETE FROM memory_mappings');
    db.exec('DELETE FROM memory_index');
    db.exec('DELETE FROM edges');
    db.exec('DELETE FROM nodes');
  });

  describe('Memory Storage', () => {
    it('should store conversation memory', () => {
      const conversationNode = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `conversation-${Date.now()}`,
        name: `Conversation ${Date.now()}`,
        content: 'User asked about installation instructions',
        metadata: {
          type: 'conversation',
          userId: 'user-123',
          timestamp: Date.now(),
        },
      });

      // 记录记忆映射
      db.prepare(`
        INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        conversationNode.id,
        `memory-${conversationNode.id}`,
        'context',
        0.95,
        Date.now()
      );

      const mapping = db.prepare('SELECT * FROM memory_mappings WHERE node_id = ?').get(conversationNode.id) as any;

      expect(mapping).toBeDefined();
      expect(mapping.memory_type).toBe('context');
      expect(mapping.confidence).toBe(0.95);
    });

    it('should store preference memory', () => {
      const preferenceNode = nodeManager.upsert({
        kind: NodeKind.Entity,
        qualifiedName: `preference-${Date.now()}`,
        name: `User Preference`,
        content: 'User prefers dark theme',
        metadata: {
          category: 'UI',
          source: 'explicit',
        },
      });

      db.prepare(`
        INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        preferenceNode.id,
        `memory-${preferenceNode.id}`,
        'preference',
        0.9,
        Date.now()
      );

      const mapping = db.prepare('SELECT * FROM memory_mappings WHERE node_id = ?').get(preferenceNode.id) as any;

      expect(mapping.memory_type).toBe('preference');
    });

    it('should store fact memory', () => {
      const factNode = nodeManager.upsert({
        kind: NodeKind.Concept,
        qualifiedName: `fact-${Date.now()}`,
        name: `Fact: User works at TechCorp`,
        content: 'User employment information',
        metadata: {
          verified: true,
          source: 'profile',
        },
      });

      db.prepare(`
        INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        factNode.id,
        `memory-${factNode.id}`,
        'fact',
        1.0,
        Date.now()
      );

      const mapping = db.prepare('SELECT * FROM memory_mappings WHERE node_id = ?').get(factNode.id) as any;

      expect(mapping.memory_type).toBe('fact');
      expect(mapping.confidence).toBe(1.0);
    });

    it('should store skill memory', () => {
      const skillNode = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `skill-usage-${Date.now()}`,
        name: `Skill: Code Review`,
        content: 'User frequently uses code review skill',
        metadata: {
          skillId: 'code-review',
          usageCount: 15,
        },
      });

      db.prepare(`
        INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        skillNode.id,
        `memory-${skillNode.id}`,
        'skill',
        0.85,
        Date.now()
      );

      const mapping = db.prepare('SELECT * FROM memory_mappings WHERE node_id = ?').get(skillNode.id) as any;

      expect(mapping.memory_type).toBe('skill');
    });

    it('should batch store memories', () => {
      const memories = [
        { content: 'Memory 1', type: 'context' },
        { content: 'Memory 2', type: 'preference' },
        { content: 'Memory 3', type: 'fact' },
      ];

      const insertMany = db.transaction((items: any[]) => {
        const results: any[] = [];
        for (const item of items) {
          const node = nodeManager.upsert({
            kind: NodeKind.Document,
            qualifiedName: `mem-${Date.now()}-${Math.random()}`,
            name: item.content,
            content: item.content,
          });
          
          db.prepare(`
            INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(node.id, `memory-${node.id}`, item.type, 0.9, Date.now());
          
          results.push(node);
        }
        return results;
      });

      const nodes = insertMany(memories);

      expect(nodes).toHaveLength(3);
      const allMappings = db.prepare('SELECT COUNT(*) as count FROM memory_mappings').get() as any;
      expect(allMappings.count).toBe(3);
    });
  });

  describe('Memory Retrieval', () => {
    beforeEach(() => {
      // 创建测试记忆
      const contexts = [
        'How to install Node.js',
        'Node.js version management',
        'npm package installation',
      ];

      contexts.forEach((content, i) => {
        const node = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: `ctx-${i}-${Date.now()}`,
          name: content,
          content,
          metadata: { tier: 'warm' },
        });

        db.prepare(`
          INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          `index-${i}`,
          node.id,
          content,
          'warm',
          'user-123',
          'tenant-456',
          Date.now() - i * 1000
        );
      });
    });

    it('should retrieve memories by tier', () => {
      const warmMemories = db.prepare(`
        SELECT * FROM memory_index WHERE tier = 'warm'
      `).all();

      expect(warmMemories.length).toBeGreaterThan(0);
      expect(warmMemories.every((m: any) => m.tier === 'warm')).toBe(true);
    });

    it('should retrieve memories by user', () => {
      const userMemories = db.prepare(`
        SELECT * FROM memory_index WHERE user_id = 'user-123'
      `).all();

      expect(userMemories.length).toBe(3);
    });

    it('should retrieve memories by tenant', () => {
      const tenantMemories = db.prepare(`
        SELECT * FROM memory_index WHERE tenant_id = 'tenant-456'
      `).all();

      expect(tenantMemories.length).toBe(3);
    });

    it('should search memories by content', () => {
      const results = nodeManager.search('Node.js');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(n => n.content?.includes('Node.js'))).toBe(true);
    });
  });

  describe('Memory Hierarchy', () => {
    it('should distinguish Hot tier memories', () => {
      const hotMemories = [
        'Current conversation about project X',
        'Ongoing debugging session',
      ];

      hotMemories.forEach((content) => {
        const node = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: `hot-${Math.random()}`,
          name: content.substring(0, 30),
          content,
          metadata: { tier: 'hot' },
        });

        db.prepare(`
          INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(node.id, node.id, content, 'hot', 'user-1', 'tenant-1', Date.now());
      });

      const hotCount = db.prepare(`
        SELECT COUNT(*) as count FROM memory_index WHERE tier = 'hot'
      `).get() as any;

      expect(hotCount.count).toBe(2);
    });

    it('should distinguish Cold tier memories', () => {
      const coldMemories = [
        'Archived project from 2023',
        'Old configuration settings',
      ];

      coldMemories.forEach((content) => {
        const node = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: `cold-${Math.random()}`,
          name: content.substring(0, 30),
          content,
          metadata: { tier: 'cold' },
        });

        db.prepare(`
          INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(node.id, node.id, content, 'cold', 'user-1', 'tenant-1', Date.now() - 30 * 24 * 60 * 60 * 1000);
      });

      const coldCount = db.prepare(`
        SELECT COUNT(*) as count FROM memory_index WHERE tier = 'cold'
      `).get() as any;

      expect(coldCount.count).toBe(2);
    });

    it('should maintain memory relationships across tiers', () => {
      const parent = nodeManager.upsert({
        kind: NodeKind.Concept,
        qualifiedName: 'parent-concept',
        name: 'Parent Concept',
        metadata: { tier: 'warm' },
      });

      const child = nodeManager.upsert({
        kind: NodeKind.Concept,
        qualifiedName: 'child-concept',
        name: 'Child Concept',
        metadata: { tier: 'hot' },
      });

      edgeManager.create({
        sourceId: parent.id,
        targetId: child.id,
        kind: EdgeKind.RELATED_TO,
        metadata: { tierRelation: 'parent-child' },
      });

      const parentWithChildren = nodeManager.getById(parent.id);
      const children = edgeManager.getBySource(parent.id);

      expect(parentWithChildren).toBeDefined();
      expect(children.length).toBe(1);
    });
  });

  describe('Memory Cycle', () => {
    it('should create memory cycle structure', () => {
      const capture = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `capture-${Date.now()}`,
        name: 'Captured Conversation',
        content: 'User asked: How to use the API?',
        metadata: { phase: 'capture', timestamp: Date.now() },
      });

      const consolidate = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `consolidate-${Date.now()}`,
        name: 'Consolidated Memory',
        content: 'API usage patterns learned',
        metadata: { phase: 'consolidate', timestamp: Date.now() },
      });

      const retrieve = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `retrieve-${Date.now()}`,
        name: 'Retrieved Memory',
        content: 'User needs API guidance',
        metadata: { phase: 'retrieve', timestamp: Date.now() },
      });

      // 创建循环关系
      edgeManager.create({ sourceId: capture.id, targetId: consolidate.id, kind: EdgeKind.RELATED_TO });
      edgeManager.create({ sourceId: consolidate.id, targetId: retrieve.id, kind: EdgeKind.RELATED_TO });
      edgeManager.create({ sourceId: retrieve.id, targetId: capture.id, kind: EdgeKind.RELATED_TO });

      // 验证所有节点都存在
      expect(nodeManager.getById(capture.id)).toBeDefined();
      expect(nodeManager.getById(consolidate.id)).toBeDefined();
      expect(nodeManager.getById(retrieve.id)).toBeDefined();

      // 验证边都创建成功
      const outgoingEdges = edgeManager.getBySource(capture.id);
      expect(outgoingEdges.length).toBe(1);
    });

    it('should track memory through cycle phases', () => {
      const phases = ['capture', 'consolidate', 'abstract', 'retrieve', 'reflect'];
      const nodes: any[] = [];

      phases.forEach((phase, i) => {
        const node = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: `phase-${phase}-${Date.now()}`,
          name: `Phase: ${phase}`,
          content: `Memory in ${phase} phase`,
          metadata: { 
            phase, 
            order: i,
            timestamp: Date.now() + i 
          },
        });
        nodes.push(node);

        db.prepare(`
          INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(node.id, node.id, node.content, 'warm', 'user-cycle', 'tenant-cycle', Date.now());
      });

      // 创建顺序关系
      for (let i = 0; i < nodes.length - 1; i++) {
        edgeManager.create({
          sourceId: nodes[i].id,
          targetId: nodes[i + 1].id,
          kind: EdgeKind.RELATED_TO,
        });
      }

      const phaseOrder = db.prepare(`
        SELECT * FROM memory_index WHERE user_id = 'user-cycle'
        ORDER BY created_at
      `).all();

      expect(phaseOrder.length).toBe(phases.length);
    });
  });

  describe('Memory Statistics', () => {
    it('should calculate memory statistics per user', () => {
      // 创建多个用户的记忆
      const users = [
        { id: 'user-a', memories: 3 },
        { id: 'user-b', memories: 5 },
      ];

      users.forEach(({ id, memories }) => {
        for (let i = 0; i < memories; i++) {
          const node = nodeManager.upsert({
            kind: NodeKind.Document,
            qualifiedName: `${id}-mem-${i}-${Date.now()}`,
            name: `Memory ${i}`,
            content: `Memory content for ${id}`,
          });

          db.prepare(`
            INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(node.id, node.id, node.content, 'warm', id, 'tenant-shared', Date.now());
        }
      });

      const stats = db.prepare(`
        SELECT user_id, COUNT(*) as count 
        FROM memory_index 
        GROUP BY user_id
      `).all() as any[];

      const userAStats = stats.find(s => s.user_id === 'user-a');
      const userBStats = stats.find(s => s.user_id === 'user-b');

      expect(userAStats?.count).toBe(3);
      expect(userBStats?.count).toBe(5);
    });

    it('should track memory by type', () => {
      const types = ['context', 'preference', 'fact', 'skill'];

      types.forEach(type => {
        for (let i = 0; i < 2; i++) {
          const node = nodeManager.upsert({
            kind: NodeKind.Document,
            qualifiedName: `${type}-${i}-${Date.now()}`,
            name: `${type} memory ${i}`,
            content: `${type} content`,
          });

          db.prepare(`
            INSERT INTO memory_mappings (node_id, memory_id, memory_type, confidence, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(node.id, node.id, type, 0.9, Date.now());
        }
      });

      const typeStats = db.prepare(`
        SELECT memory_type, COUNT(*) as count 
        FROM memory_mappings 
        GROUP BY memory_type
      `).all() as any[];

      expect(typeStats.length).toBe(4);
      typeStats.forEach(stat => {
        expect(stat.count).toBe(2);
      });
    });
  });

  describe('Memory Cleanup', () => {
    it('should clean up expired memories', () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // 创建过期和未过期的记忆
      [
        { content: 'Old memory', age: 35 * dayMs },
        { content: 'Recent memory', age: 5 * dayMs },
        { content: 'Another old', age: 40 * dayMs },
      ].forEach(({ content, age }) => {
        const node = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: `cleanup-${Math.random()}`,
          name: content,
          content,
        });

        db.prepare(`
          INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(node.id, node.id, content, 'cold', 'user-cleanup', 'tenant-cleanup', now - age);
      });

      // 清理30天以上的记忆
      const cutoff = now - 30 * dayMs;
      const result = db.prepare(`
        DELETE FROM memory_index WHERE created_at < ?
      `).run(cutoff);

      expect(result.changes).toBe(2);

      const remaining = db.prepare('SELECT COUNT(*) as count FROM memory_index').get() as any;
      expect(remaining.count).toBe(1);
    });

    it('should clean up orphaned nodes', () => {
      const connected = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `connected-${Date.now()}`,
        name: 'Connected Node',
      });

      const orphaned = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `orphaned-${Date.now()}`,
        name: 'Orphaned Node',
      });

      const target = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: `target-${Date.now()}`,
        name: 'Target Node',
      });

      edgeManager.create({
        sourceId: connected.id,
        targetId: target.id,
        kind: EdgeKind.RELATED_TO,
      });

      // 清理孤立节点
      const result = db.prepare(`
        DELETE FROM nodes 
        WHERE id NOT IN (
          SELECT DISTINCT source_id FROM edges
          UNION
          SELECT DISTINCT target_id FROM edges
        )
        AND kind = 'Document'
      `).run();

      expect(result.changes).toBe(1);
      expect(nodeManager.getById(connected.id)).toBeDefined();
      expect(nodeManager.getById(orphaned.id)).toBeNull();
    });
  });

  describe('Multi-tenant Memory Isolation', () => {
    it('should isolate memories by tenant', () => {
      const tenants = ['tenant-a', 'tenant-b'];

      tenants.forEach(tenantId => {
        for (let i = 0; i < 3; i++) {
          const node = nodeManager.upsert({
            kind: NodeKind.Document,
            qualifiedName: `${tenantId}-mem-${i}-${Date.now()}`,
            name: `${tenantId} memory ${i}`,
            content: `Private content for ${tenantId}`,
          });

          db.prepare(`
            INSERT INTO memory_index (id, memory_id, content, tier, user_id, tenant_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(node.id, node.id, node.content, 'warm', `${tenantId}-user`, tenantId, Date.now());
        }
      });

      // 验证租户A看不到租户B的记忆
      const tenantAMemories = db.prepare(`
        SELECT * FROM memory_index WHERE tenant_id = 'tenant-a'
      `).all() as any[];

      expect(tenantAMemories.every(m => m.content.includes('tenant-a'))).toBe(true);
      expect(tenantAMemories.some(m => m.content.includes('tenant-b'))).toBe(false);
    });

    it('should isolate node operations by tenant', () => {
      const tenant1Node = nodeManager.upsert({
        kind: NodeKind.Entity,
        qualifiedName: 'tenant1:shared-name',
        name: 'Shared Name',
        content: 'Tenant 1 content',
        metadata: { tenantId: 'tenant1' },
      });

      const tenant2Node = nodeManager.upsert({
        kind: NodeKind.Entity,
        qualifiedName: 'tenant2:shared-name',
        name: 'Shared Name',
        content: 'Tenant 2 content',
        metadata: { tenantId: 'tenant2' },
      });

      expect(tenant1Node.id).not.toBe(tenant2Node.id);
      expect(tenant1Node.content).toBe('Tenant 1 content');
      expect(tenant2Node.content).toBe('Tenant 2 content');
    });
  });
});
