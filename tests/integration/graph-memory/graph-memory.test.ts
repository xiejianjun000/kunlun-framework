/**
 * GraphMemory集成测试
 * GraphMemory Integration Tests
 * 
 * 测试场景：
 * 1. 图数据库初始化
 * 2. 节点创建和查询
 * 3. 边管理
 * 4. 事务操作
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
  NodeSearchOptions,
} from '../../../src/integrations/graph-memory/types';

// 内存数据库用于测试
let db: Database.Database;
let nodeManager: NodeManager;
let edgeManager: EdgeManager;

describe('GraphMemory Integration Tests', () => {
  beforeAll(() => {
    // 创建内存数据库
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
      
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
      CREATE INDEX IF NOT EXISTS idx_nodes_qualified_name ON nodes(qualified_name);
    `);
    
    // 创建管理器实例
    nodeManager = new NodeManager(db);
    edgeManager = new EdgeManager(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // 清理数据
    db.exec('DELETE FROM edges');
    db.exec('DELETE FROM nodes');
  });

  describe('Node Management', () => {
    describe('Node Creation', () => {
      it('should create a node with all fields', () => {
        const input: CreateNodeInput = {
          kind: NodeKind.File,
          qualifiedName: 'src/index.ts',
          name: 'index.ts',
          content: 'export const main = () => {};',
          metadata: {
            language: 'TypeScript',
            filePath: 'src/index.ts',
            lineStart: 1,
            lineEnd: 5,
          },
        };

        const node = nodeManager.upsert(input);

        expect(node).toBeDefined();
        expect(node.id).toBeDefined();
        expect(node.kind).toBe(NodeKind.File);
        expect(node.qualifiedName).toBe('src/index.ts');
        expect(node.name).toBe('index.ts');
        expect(node.content).toBe('export const main = () => {};');
        expect(node.metadata.language).toBe('TypeScript');
        expect(node.createdAt).toBeDefined();
        expect(node.updatedAt).toBeDefined();
      });

      it('should create a node with custom ID', () => {
        const input: CreateNodeInput = {
          id: 'custom-node-id-123',
          kind: NodeKind.Function,
          qualifiedName: 'src/utils/helper.ts::calculateSum',
          name: 'calculateSum',
        };

        const node = nodeManager.upsert(input);

        expect(node.id).toBe('custom-node-id-123');
      });

      it('should update existing node on upsert', () => {
        const input1: CreateNodeInput = {
          kind: NodeKind.Class,
          qualifiedName: 'MyClass',
          name: 'MyClass',
          content: 'Version 1',
        };

        const node1 = nodeManager.upsert(input1);
        
        const input2: CreateNodeInput = {
          id: node1.id,
          kind: NodeKind.Class,
          qualifiedName: 'MyClass',
          name: 'MyClass',
          content: 'Version 2',
        };

        const node2 = nodeManager.upsert(input2);

        expect(node2.id).toBe(node1.id);
        expect(node2.content).toBe('Version 2');
        expect(node1.createdAt).toBe(node2.createdAt);
      });

      it('should create multiple nodes in batch', () => {
        const inputs: CreateNodeInput[] = [
          { kind: NodeKind.File, qualifiedName: 'a.ts', name: 'a.ts' },
          { kind: NodeKind.File, qualifiedName: 'b.ts', name: 'b.ts' },
          { kind: NodeKind.File, qualifiedName: 'c.ts', name: 'c.ts' },
        ];

        const nodes = nodeManager.upsertBatch(inputs);

        expect(nodes).toHaveLength(3);
        nodes.forEach((node, i) => {
          expect(node.name).toBe(`${String.fromCharCode(97 + i)}.ts`);
        });
      });
    });

    describe('Node Query', () => {
      it('should get node by ID', () => {
        const input: CreateNodeInput = {
          kind: NodeKind.Interface,
          qualifiedName: 'IUserRepository',
          name: 'IUserRepository',
        };

        const created = nodeManager.upsert(input);
        const retrieved = nodeManager.getById(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.name).toBe('IUserRepository');
      });

      it('should return null for non-existent node', () => {
        const node = nodeManager.getById('non-existent-id');
        expect(node).toBeNull();
      });

      it('should get node by qualified name', () => {
        const input: CreateNodeInput = {
          kind: NodeKind.Type,
          qualifiedName: 'UserDTO',
          name: 'UserDTO',
        };

        nodeManager.upsert(input);
        const node = nodeManager.getByQualifiedName('UserDTO');

        expect(node).toBeDefined();
        expect(node?.qualifiedName).toBe('UserDTO');
      });

      it('should get nodes by kind', () => {
        nodeManager.upsertBatch([
          { kind: NodeKind.Function, qualifiedName: 'func1', name: 'func1' },
          { kind: NodeKind.Function, qualifiedName: 'func2', name: 'func2' },
          { kind: NodeKind.Class, qualifiedName: 'class1', name: 'class1' },
        ]);

        const functions = nodeManager.getByKind(NodeKind.Function);

        expect(functions).toHaveLength(2);
        expect(functions.every(n => n.kind === NodeKind.Function)).toBe(true);
      });

      it('should get multiple nodes by IDs', () => {
        const nodes = nodeManager.upsertBatch([
          { kind: NodeKind.Variable, qualifiedName: 'var1', name: 'var1' },
          { kind: NodeKind.Variable, qualifiedName: 'var2', name: 'var2' },
          { kind: NodeKind.Variable, qualifiedName: 'var3', name: 'var3' },
        ]);

        const ids = [nodes[0].id, nodes[1].id];
        const retrieved = nodeManager.getByIds(ids);

        expect(retrieved).toHaveLength(2);
        expect(retrieved.map(n => n.name)).toEqual(['var1', 'var2']);
      });

      it('should search nodes by content', () => {
        nodeManager.upsertBatch([
          { kind: NodeKind.Function, qualifiedName: 'add', name: 'add', content: 'function add(a, b) { return a + b; }' },
          { kind: NodeKind.Function, qualifiedName: 'subtract', name: 'subtract', content: 'function subtract(a, b) { return a - b; }' },
          { kind: NodeKind.Function, qualifiedName: 'multiply', name: 'multiply', content: 'function multiply(a, b) { return a * b; }' },
        ]);

        const results = nodeManager.search('return');

        expect(results.length).toBeGreaterThan(0);
        expect(results.some(n => n.qualifiedName === 'add')).toBe(true);
      });

      it('should search nodes with kind filter', () => {
        nodeManager.upsertBatch([
          { kind: NodeKind.Function, qualifiedName: 'myFunc', name: 'myFunc', content: 'test content' },
          { kind: NodeKind.Class, qualifiedName: 'myClass', name: 'myClass', content: 'test content' },
        ]);

        const results = nodeManager.search('test', { kinds: [NodeKind.Function] });

        expect(results).toHaveLength(1);
        expect(results[0].kind).toBe(NodeKind.Function);
      });
    });

    describe('Node Update', () => {
      it('should update node content', () => {
        const created = nodeManager.upsert({
          kind: NodeKind.Test,
          qualifiedName: 'test-example',
          name: 'test-example',
          content: 'Old content',
        });

        const updated = nodeManager.update(created.id, {
          content: 'New content',
        });

        expect(updated).toBeDefined();
        expect(updated?.content).toBe('New content');
      });

      it('should update node metadata', () => {
        const created = nodeManager.upsert({
          kind: NodeKind.Function,
          qualifiedName: 'myFunc',
          name: 'myFunc',
          metadata: { importance: 1 },
        });

        const updated = nodeManager.update(created.id, {
          metadata: { importance: 5, tags: ['critical'] },
        });

        expect(updated?.metadata.importance).toBe(5);
        expect(updated?.metadata.tags).toEqual(['critical']);
      });

      it('should return null when updating non-existent node', () => {
        const result = nodeManager.update('non-existent', { name: 'new' });
        expect(result).toBeNull();
      });
    });

    describe('Node Delete', () => {
      it('should delete a node', () => {
        const created = nodeManager.upsert({
          kind: NodeKind.Document,
          qualifiedName: 'doc1',
          name: 'doc1',
        });

        const deleted = nodeManager.delete(created.id);

        expect(deleted).toBe(true);
        expect(nodeManager.getById(created.id)).toBeNull();
      });

      it('should return false when deleting non-existent node', () => {
        const result = nodeManager.delete('non-existent');
        expect(result).toBe(false);
      });

      it('should batch delete nodes', () => {
        const nodes = nodeManager.upsertBatch([
          { kind: NodeKind.Entity, qualifiedName: 'entity1', name: 'entity1' },
          { kind: NodeKind.Entity, qualifiedName: 'entity2', name: 'entity2' },
          { kind: NodeKind.Entity, qualifiedName: 'entity3', name: 'entity3' },
        ]);

        const idsToDelete = [nodes[0].id, nodes[1].id];
        const deletedCount = nodeManager.deleteBatch(idsToDelete);

        expect(deletedCount).toBe(2);
        expect(nodeManager.getByIds(idsToDelete)).toHaveLength(0);
        expect(nodeManager.getById(nodes[2].id)).toBeDefined();
      });
    });

    describe('Node Statistics', () => {
      it('should get node statistics', () => {
        nodeManager.upsertBatch([
          { kind: NodeKind.File, qualifiedName: 'a.ts', name: 'a.ts' },
          { kind: NodeKind.File, qualifiedName: 'b.ts', name: 'b.ts' },
          { kind: NodeKind.Class, qualifiedName: 'MyClass', name: 'MyClass' },
        ]);

        const stats = nodeManager.getStats();

        expect(stats.total).toBe(3);
        expect(stats.byKind[NodeKind.File]).toBe(2);
        expect(stats.byKind[NodeKind.Class]).toBe(1);
      });

      it('should check if node exists', () => {
        const created = nodeManager.upsert({
          kind: NodeKind.Project,
          qualifiedName: 'my-project',
          name: 'my-project',
        });

        expect(nodeManager.exists(created.id)).toBe(true);
        expect(nodeManager.exists('non-existent')).toBe(false);
      });

      it('should check if qualified name exists', () => {
        nodeManager.upsert({
          kind: NodeKind.Project,
          qualifiedName: 'unique-project',
          name: 'unique-project',
        });

        expect(nodeManager.existsByQualifiedName('unique-project')).toBe(true);
        expect(nodeManager.existsByQualifiedName('non-existent')).toBe(false);
      });
    });
  });

  describe('Edge Management', () => {
    describe('Edge Creation', () => {
      it('should create an edge between two nodes', () => {
        const source = nodeManager.upsert({
          kind: NodeKind.Class,
          qualifiedName: 'UserService',
          name: 'UserService',
        });

        const target = nodeManager.upsert({
          kind: NodeKind.Class,
          qualifiedName: 'UserRepository',
          name: 'UserRepository',
        });

        const input: CreateEdgeInput = {
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.IMPORTS,
          confidenceTier: ConfidenceTier.EXTRACTED,
          metadata: { filePath: 'src/services/UserService.ts', line: 5 },
        };

        const edge = edgeManager.create(input);

        expect(edge).toBeDefined();
        expect(edge.sourceId).toBe(source.id);
        expect(edge.targetId).toBe(target.id);
        expect(edge.kind).toBe(EdgeKind.IMPORTS);
        expect(edge.confidenceTier).toBe(ConfidenceTier.EXTRACTED);
      });

      it('should create edge with custom ID', () => {
        const source = nodeManager.upsert({
          kind: NodeKind.Function,
          qualifiedName: 'main',
          name: 'main',
        });

        const target = nodeManager.upsert({
          kind: NodeKind.Function,
          qualifiedName: 'init',
          name: 'init',
        });

        const edge = edgeManager.create({
          id: 'custom-edge-id',
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.CALLS,
        });

        expect(edge.id).toBe('custom-edge-id');
      });

      it('should create edge with upsert', () => {
        const source = nodeManager.upsert({
          kind: NodeKind.Interface,
          qualifiedName: 'IMyInterface',
          name: 'IMyInterface',
        });

        const target = nodeManager.upsert({
          kind: NodeKind.Class,
          qualifiedName: 'MyClass',
          name: 'MyClass',
        });

        const edge = edgeManager.upsert({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.IMPLEMENTS,
        });

        expect(edge).toBeDefined();
        expect(edge.kind).toBe(EdgeKind.IMPLEMENTS);
      });
    });

    describe('Edge Query', () => {
      let source1: any, source2: any, target1: any, target2: any;

      beforeEach(() => {
        source1 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'func1', name: 'func1' });
        source2 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'func2', name: 'func2' });
        target1 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'target1', name: 'target1' });
        target2 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'target2', name: 'target2' });

        edgeManager.create({ sourceId: source1.id, targetId: target1.id, kind: EdgeKind.CALLS });
        edgeManager.create({ sourceId: source1.id, targetId: target2.id, kind: EdgeKind.CALLS });
        edgeManager.create({ sourceId: source2.id, targetId: target1.id, kind: EdgeKind.REFERENCES });
      });

      it('should get edges by source', () => {
        const edges = edgeManager.getBySource(source1.id);

        expect(edges).toHaveLength(2);
        expect(edges.every(e => e.sourceId === source1.id)).toBe(true);
      });

      it('should get edges by target', () => {
        const edges = edgeManager.getByTarget(target1.id);

        expect(edges).toHaveLength(2);
        expect(edges.every(e => e.targetId === target1.id)).toBe(true);
      });

      it('should get edges by kind', () => {
        const edges = edgeManager.getByKind(EdgeKind.CALLS);

        expect(edges).toHaveLength(2);
        expect(edges.every(e => e.kind === EdgeKind.CALLS)).toBe(true);
      });

      it('should get edges between nodes', () => {
        const edges = edgeManager.getBetweenNodes(source1.id, target1.id);

        expect(edges.length).toBeGreaterThan(0);
      });

      it('should get all edges', () => {
        const edges = edgeManager.getAll();

        expect(edges.length).toBe(3);
      });
    });

    describe('Edge Update', () => {
      it('should update edge confidence tier', () => {
        const source = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'A', name: 'A' });
        const target = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'B', name: 'B' });

        const edge = edgeManager.create({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.INHERITS,
          confidenceTier: ConfidenceTier.INFERRED,
        });

        const updated = edgeManager.update(edge.id, {
          confidenceTier: ConfidenceTier.EXTRACTED,
        });

        expect(updated?.confidenceTier).toBe(ConfidenceTier.EXTRACTED);
      });

      it('should update edge metadata', () => {
        const source = nodeManager.upsert({ kind: NodeKind.Interface, qualifiedName: 'I', name: 'I' });
        const target = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'Impl', name: 'Impl' });

        const edge = edgeManager.create({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.IMPLEMENTS,
        });

        const updated = edgeManager.update(edge.id, {
          metadata: { line: 10, verified: true },
        });

        expect(updated?.metadata.line).toBe(10);
        expect(updated?.metadata.verified).toBe(true);
      });
    });

    describe('Edge Delete', () => {
      it('should delete an edge', () => {
        const source = nodeManager.upsert({ kind: NodeKind.Entity, qualifiedName: 'E1', name: 'E1' });
        const target = nodeManager.upsert({ kind: NodeKind.Entity, qualifiedName: 'E2', name: 'E2' });

        const edge = edgeManager.create({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.RELATED_TO,
        });

        const deleted = edgeManager.delete(edge.id);

        expect(deleted).toBe(true);
        expect(edgeManager.getById(edge.id)).toBeNull();
      });

      it('should delete all edges by source', () => {
        const source = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'caller', name: 'caller' });
        const target1 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'callee1', name: 'callee1' });
        const target2 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'callee2', name: 'callee2' });

        edgeManager.create({ sourceId: source.id, targetId: target1.id, kind: EdgeKind.CALLS });
        edgeManager.create({ sourceId: source.id, targetId: target2.id, kind: EdgeKind.CALLS });

        const deleted = edgeManager.deleteBySource(source.id);

        expect(deleted).toBe(2);
        expect(edgeManager.getBySource(source.id)).toHaveLength(0);
      });

      it('should delete all edges by node', () => {
        const node = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'SharedClass', name: 'SharedClass' });
        const other1 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'func1', name: 'func1' });
        const other2 = nodeManager.upsert({ kind: NodeKind.Function, qualifiedName: 'func2', name: 'func2' });

        edgeManager.create({ sourceId: node.id, targetId: other1.id, kind: EdgeKind.CONTAINS });
        edgeManager.create({ sourceId: other2.id, targetId: node.id, kind: EdgeKind.IMPORTS });

        const deleted = edgeManager.deleteAllByNode(node.id);

        expect(deleted).toBe(2);
      });
    });

    describe('Edge Existence', () => {
      it('should check if edge exists', () => {
        const source = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'f1', name: 'f1' });
        const target = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'f2', name: 'f2' });

        const edge = edgeManager.create({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.IMPORTS,
        });

        expect(edgeManager.exists(edge.id)).toBe(true);
        expect(edgeManager.exists('non-existent')).toBe(false);
      });

      it('should check if relation exists', () => {
        const source = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'Parent', name: 'Parent' });
        const target = nodeManager.upsert({ kind: NodeKind.Class, qualifiedName: 'Child', name: 'Child' });

        edgeManager.create({
          sourceId: source.id,
          targetId: target.id,
          kind: EdgeKind.EXTENDS,
        });

        expect(edgeManager.existsRelation(source.id, target.id, EdgeKind.EXTENDS)).toBe(true);
        expect(edgeManager.existsRelation(source.id, target.id, EdgeKind.INHERITS)).toBe(false);
      });
    });
  });

  describe('Graph Statistics', () => {
    it('should get overall graph statistics', () => {
      // 创建节点
      nodeManager.upsertBatch([
        { kind: NodeKind.Class, qualifiedName: 'Class1', name: 'Class1' },
        { kind: NodeKind.Class, qualifiedName: 'Class2', name: 'Class2' },
        { kind: NodeKind.Function, qualifiedName: 'func1', name: 'func1' },
      ]);

      // 创建边
      const class1 = nodeManager.getByQualifiedName('Class1')!;
      const class2 = nodeManager.getByQualifiedName('Class2')!;
      const func1 = nodeManager.getByQualifiedName('func1')!;

      edgeManager.create({ sourceId: class1.id, targetId: class2.id, kind: EdgeKind.EXTENDS });
      edgeManager.create({ sourceId: class1.id, targetId: func1.id, kind: EdgeKind.CONTAINS });

      const stats = edgeManager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byKind[EdgeKind.EXTENDS]).toBe(1);
      expect(stats.byKind[EdgeKind.CONTAINS]).toBe(1);
    });

    it('should get node statistics', () => {
      nodeManager.upsertBatch([
        { kind: NodeKind.File, qualifiedName: 'x.ts', name: 'x.ts' },
        { kind: NodeKind.File, qualifiedName: 'y.ts', name: 'y.ts' },
        { kind: NodeKind.Function, qualifiedName: 'z', name: 'z' },
      ]);

      const stats = nodeManager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byKind[NodeKind.File]).toBe(2);
      expect(stats.byKind[NodeKind.Function]).toBe(1);
    });
  });

  describe('Transaction Operations', () => {
    it('should execute multiple operations in transaction', () => {
      const executeTransaction = db.transaction(() => {
        const node1 = nodeManager.upsert({
          kind: NodeKind.Project,
          qualifiedName: 'transaction-test',
          name: 'transaction-test',
        });

        const node2 = nodeManager.upsert({
          kind: NodeKind.Module,
          qualifiedName: 'module1',
          name: 'module1',
        });

        edgeManager.create({
          sourceId: node1.id,
          targetId: node2.id,
          kind: EdgeKind.CONTAINS,
        });

        return { node1, node2 };
      });

      const result = executeTransaction();

      expect(result.node1).toBeDefined();
      expect(result.node2).toBeDefined();
      expect(nodeManager.getByQualifiedName('transaction-test')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate qualified name', () => {
      nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: 'unique-doc',
        name: 'unique-doc',
      });

      // 尝试创建同名节点应该更新而不是报错
      const updated = nodeManager.upsert({
        kind: NodeKind.Document,
        qualifiedName: 'unique-doc',
        name: 'unique-doc',
        content: 'Updated content',
      });

      expect(updated.content).toBe('Updated content');
    });

    it('should handle edge to non-existent node gracefully', () => {
      const source = nodeManager.upsert({
        kind: NodeKind.Class,
        qualifiedName: 'Orphan',
        name: 'Orphan',
      });

      // 创建一条指向不存在节点的边
      const edge = edgeManager.create({
        sourceId: source.id,
        targetId: 'non-existent-target',
        kind: EdgeKind.REFERENCES,
      });

      expect(edge).toBeDefined();
    });
  });

  describe('Neighbor Operations', () => {
    it('should get neighbor IDs in outgoing direction', () => {
      const a = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'a', name: 'a' });
      const b = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'b', name: 'b' });
      const c = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'c', name: 'c' });

      edgeManager.create({ sourceId: a.id, targetId: b.id, kind: EdgeKind.IMPORTS });
      edgeManager.create({ sourceId: a.id, targetId: c.id, kind: EdgeKind.IMPORTS });

      const neighbors = edgeManager.getNeighborIds(a.id, 'outgoing');

      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContain(b.id);
      expect(neighbors).toContain(c.id);
    });

    it('should get neighbor IDs in incoming direction', () => {
      const a = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'inc-a', name: 'inc-a' });
      const b = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'inc-b', name: 'inc-b' });

      edgeManager.create({ sourceId: b.id, targetId: a.id, kind: EdgeKind.IMPORTS });

      const neighbors = edgeManager.getNeighborIds(a.id, 'incoming');

      expect(neighbors).toHaveLength(1);
      expect(neighbors).toContain(b.id);
    });

    it('should get neighbor IDs in both directions', () => {
      const a = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'both-a', name: 'both-a' });
      const b = nodeManager.upsert({ kind: NodeKind.File, qualifiedName: 'both-b', name: 'both-b' });

      edgeManager.create({ sourceId: a.id, targetId: b.id, kind: EdgeKind.IMPORTS });
      edgeManager.create({ sourceId: b.id, targetId: a.id, kind: EdgeKind.IMPORTS });

      const neighbors = edgeManager.getNeighborIds(a.id, 'both');

      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContain(b.id);
    });
  });
});
