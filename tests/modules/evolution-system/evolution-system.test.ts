/**
 * 进化系统核心测试
 * Evolution System Core Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EvolutionSystem, createEvolutionSystem } from '../../../dist/modules/evolution-system/core/EvolutionSystem';
import { EvolutionEngine } from '../../../dist/modules/evolution-system/core/EvolutionEngine';
import { EvolutionScheduler } from '../../../dist/modules/evolution-system/core/EvolutionScheduler';
import { EvolutionLogger, LogLevel } from '../../../dist/modules/evolution-system/core/EvolutionLogger';
import {
  EvolutionDirection,
  EvolutionStatus,
  RewardType,
} from '../../../dist/modules/evolution-system/interfaces';

describe('EvolutionSystem', () => {
  let system: EvolutionSystem;

  beforeEach(async () => {
    system = createEvolutionSystem();
    await system.initialize();
  });

  afterEach(async () => {
    // 清理
  });

  describe('Initialization', () => {
    it('should create an evolution system instance', () => {
      expect(system).toBeDefined();
      expect(system.isRunning()).toBe(false);
    });

    it('should initialize successfully', async () => {
      const newSystem = createEvolutionSystem();
      await newSystem.initialize();
      expect(newSystem).toBeDefined();
    });
  });

  describe('Evolution Execution', () => {
    it('should execute a single evolution', async () => {
      const result = await system.evolve('user1', 'tenant1');

      expect(result).toBeDefined();
      expect(result.evolutionId).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.fitnessScore).toBe('number');
      expect(typeof result.executionTime).toBe('number');
    });

    it('should handle evolution with options', async () => {
      const result = await system.evolve('user1', 'tenant1', {
        direction: EvolutionDirection.EXPLORATION,
        targetFitness: 0.8,
        maxMutations: 3,
      });

      expect(result).toBeDefined();
    });

    it('should update current fitness after evolution', async () => {
      await system.evolve('user2', 'tenant1');
      const fitness = await system.getCurrentFitness('user2', 'tenant1');

      expect(fitness).toBeGreaterThanOrEqual(0);
      expect(fitness).toBeLessThanOrEqual(1);
    });
  });

  describe('Batch Evolution', () => {
    it('should execute batch evolution for multiple users', async () => {
      const users = ['user_batch_1', 'user_batch_2', 'user_batch_3'];
      const results = await system.batchEvolve(users, 'tenant1');

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.evolutionId).toBeDefined();
      });
    });
  });

  describe('Status Management', () => {
    it('should get evolution status', async () => {
      const status = await system.getStatus('user1', 'tenant1');
      expect(status).toBeDefined();
      expect(Object.values(EvolutionStatus).includes(status)).toBe(true);
    });

    it('should pause and resume evolution', async () => {
      await system.pause('user1', 'tenant1');
      const statusAfterPause = await system.getStatus('user1', 'tenant1');
      expect(statusAfterPause).toBe(EvolutionStatus.PAUSED);

      await system.resume('user1', 'tenant1');
      const statusAfterResume = await system.getStatus('user1', 'tenant1');
      expect(statusAfterResume).toBe(EvolutionStatus.IDLE);
    });
  });

  describe('History Management', () => {
    it('should get evolution history', async () => {
      await system.evolve('user1', 'tenant1');
      const history = await system.getHistory('user1', 'tenant1');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should query history with options', async () => {
      await system.evolve('user1', 'tenant1');
      const history = await system.getHistory('user1', 'tenant1', {
        limit: 10,
        status: ['completed'],
      });

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Reward Management', () => {
    it('should add rewards', async () => {
      await system.addReward('user1', 'tenant1', {
        rewardId: 'rew_test_1',
        userId: 'user1',
        tenantId: 'tenant1',
        type: RewardType.TASK_SUCCESS,
        value: 0.1,
        calculatedAt: new Date(),
      });

      const rewards = await system.getRewardHistory('user1', 'tenant1');
      expect(rewards.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should get and update configuration', async () => {
      const config = await system.getConfig('user1', 'tenant1');
      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();

      await system.configureEvolution('user1', 'tenant1', {
        mutationProbability: 0.2,
      });

      const updatedConfig = await system.getConfig('user1', 'tenant1');
      expect(updatedConfig.mutationProbability).toBe(0.2);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to evolution events', () => {
      const handler = vi.fn();
      system.on('evolution:complete' as any, handler);

      expect(system).toBeDefined();
    });

    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      system.on('evolution:complete' as any, handler);
      system.off('evolution:complete' as any, handler);

      expect(system).toBeDefined();
    });
  });

  describe('Data Export/Import', () => {
    it('should export evolution data', async () => {
      const data = await system.exportData('user1', 'tenant1');

      expect(data).toBeDefined();
      expect(data.userId).toBe('user1');
      expect(data.tenantId).toBe('tenant1');
      expect(data.version).toBeDefined();
    });

    it('should import evolution data', async () => {
      const exportData = await system.exportData('user1', 'tenant1');
      const result = await system.importData('user_import_test', 'tenant1', exportData);

      expect(result).toBe(true);
    });
  });

  describe('Analysis', () => {
    it('should generate analysis report', async () => {
      await system.evolve('user1', 'tenant1');
      const report = await system.getAnalysisReport('user1', 'tenant1');

      expect(report).toBeDefined();
      expect(report.userId).toBe('user1');
      expect(report.tenantId).toBe('tenant1');
      expect(report.totalEvolutions).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('EvolutionEngine', () => {
  let engine: EvolutionEngine;

  beforeEach(() => {
    engine = new EvolutionEngine();
  });

  describe('Strategy Management', () => {
    it('should register and get strategies', () => {
      const strategies = engine.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should set default strategy', () => {
      const result = engine.setDefaultStrategy('genetic');
      expect(result).toBe(true);
    });

    it('should return false for invalid strategy', () => {
      const result = engine.setDefaultStrategy('invalid_strategy');
      expect(result).toBe(false);
    });
  });

  describe('Evolution Execution', () => {
    it('should execute evolution', async () => {
      const context = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const rewards = [{ type: RewardType.TASK_SUCCESS, value: 0.1 }];
      const result = await engine.evolve(context, rewards);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.fitnessScore).toBe('number');
    });
  });

  describe('Mutation Operations', () => {
    it('should generate mutation step', async () => {
      const context = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const mutation = await engine.evolveStep(context);
      expect(mutation === null || mutation.mutationId).toBeTruthy();
    });

    it('should get suggestions', async () => {
      const context = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const suggestions = await engine.getSuggestions(context);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});

describe('EvolutionScheduler', () => {
  let scheduler: EvolutionScheduler;

  beforeEach(() => {
    scheduler = new EvolutionScheduler();
  });

  afterEach(() => {
    scheduler.cancelAll();
  });

  describe('Task Scheduling', () => {
    it('should schedule a task', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      const key = scheduler.schedule('user1', 'tenant1', callback, {
        interval: 1000,
      });

      expect(key).toBeDefined();
      expect(scheduler.getStatus().running).toBe(1);
    });

    it('should cancel a scheduled task', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      const key = scheduler.schedule('user1', 'tenant1', callback);

      scheduler.cancel('user1', 'tenant1');
      expect(scheduler.getStatus().running).toBe(0);
    });

    it('should pause and resume task', async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      scheduler.schedule('user1', 'tenant1', callback);

      await scheduler.pause('user1', 'tenant1');
      expect(scheduler.getStatus().paused).toBe(1);

      await scheduler.resume('user1', 'tenant1');
      expect(scheduler.getStatus().paused).toBe(0);
    });
  });

  describe('Status Queries', () => {
    it('should get task status', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      scheduler.schedule('user1', 'tenant1', callback);

      const status = scheduler.getTaskStatus('user1', 'tenant1');
      expect(status).toBeDefined();
      expect(status?.userId).toBe('user1');
      expect(status?.tenantId).toBe('tenant1');
    });

    it('should get all task statuses', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      scheduler.schedule('user1', 'tenant1', callback);
      scheduler.schedule('user2', 'tenant1', callback);

      const statuses = scheduler.getAllTaskStatuses();
      expect(statuses.length).toBe(2);
    });
  });

  describe('Batch Operations', () => {
    it('should schedule batch tasks', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      const keys = scheduler.scheduleBatch([
        { userId: 'user1', tenantId: 'tenant1', callback },
        { userId: 'user2', tenantId: 'tenant1', callback },
      ]);

      expect(keys).toHaveLength(2);
    });

    it('should cancel all tasks', () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      scheduler.schedule('user1', 'tenant1', callback);
      scheduler.schedule('user2', 'tenant1', callback);

      scheduler.cancelAll();
      expect(scheduler.getStatus().running).toBe(0);
    });
  });
});

describe('EvolutionLogger', () => {
  let logger: EvolutionLogger;

  beforeEach(() => {
    logger = new EvolutionLogger({
      level: LogLevel.DEBUG,
      output: 'console',
    });
  });

  describe('Logging', () => {
    it('should log debug message', () => {
      logger.debug('Test debug message');
      const entries = logger.getEntries(1);
      expect(entries.length).toBe(1);
      expect(entries[0].message).toBe('Test debug message');
    });

    it('should log info message', () => {
      logger.info('Test info message');
      const entries = logger.getEntries(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
    });

    it('should log warning message', () => {
      logger.warn('Test warning message');
      const entries = logger.getEntries(1);
      expect(entries[0].level).toBe(LogLevel.WARN);
    });

    it('should log error message', () => {
      logger.error('Test error message');
      const entries = logger.getEntries(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('Context Logging', () => {
    it('should log with context', () => {
      logger.info('Test with context', { key: 'value' });
      const entries = logger.getEntries(1);
      expect(entries[0].context).toEqual({ key: 'value' });
    });

    it('should log evolution event', () => {
      logger.logEvolution('evo_123', LogLevel.INFO, 'Evolution completed');
      const entries = logger.getEntries(1);
      expect(entries[0].evolutionId).toBe('evo_123');
    });

    it('should log user event', () => {
      logger.logUser('user1', 'tenant1', LogLevel.INFO, 'User evolution triggered');
      const entries = logger.getEntries(1);
      expect(entries[0].userId).toBe('user1');
      expect(entries[0].tenantId).toBe('tenant1');
    });
  });

  describe('Query', () => {
    it('should query by user ID', () => {
      logger.logUser('user1', 'tenant1', LogLevel.INFO, 'Message 1');
      logger.logUser('user2', 'tenant1', LogLevel.INFO, 'Message 2');

      const entries = logger.query({ userId: 'user1' });
      expect(entries).toHaveLength(1);
      expect(entries[0].userId).toBe('user1');
    });

    it('should query by level', () => {
      logger.info('Info message');
      logger.error('Error message');

      const entries = logger.query({ level: LogLevel.ERROR });
      expect(entries.every(e => e.level === LogLevel.ERROR)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get log statistics', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.warn('Warning');

      const stats = logger.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byLevel['INFO']).toBe(2);
      expect(stats.byLevel['WARN']).toBe(1);
    });
  });

  describe('Export', () => {
    it('should export as JSON', () => {
      logger.info('Test message');
      const json = logger.export('json');

      expect(json).toContain('Test message');
    });

    it('should export as text', () => {
      logger.info('Test message');
      const text = logger.export('text');

      expect(text).toContain('Test message');
    });
  });
});
