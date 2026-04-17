/**
 * 历史记录和分析测试
 * History and Analysis Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionHistory } from '../src/modules/evolution-system/history/EvolutionHistory';
import { EvolutionAnalyzer } from '../src/modules/evolution-system/history/EvolutionAnalyzer';
import {
  EvolutionHistoryRecord,
  Reward,
  RewardType,
} from '../src/modules/evolution-system/interfaces';

describe('EvolutionHistory', () => {
  let history: EvolutionHistory;

  beforeEach(async () => {
    history = new EvolutionHistory();
    await history.initialize();
  });

  describe('Recording', () => {
    it('should record evolution history', async () => {
      const record: EvolutionHistoryRecord = {
        recordId: 'rec_1',
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionId: 'evo_1',
        triggerType: 'manual',
        triggeredAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed',
        fitnessScore: 0.6,
        fitnessDelta: 0.1,
        mutationCount: 3,
        rewards: {
          taskSuccess: 0.1,
          userFeedback: 0.05,
          evolutionary: 0.02,
          penalties: 0,
          total: 0.17,
        },
        metadata: {},
      };

      await history.record('user1', 'tenant1', record);
      const records = await history.query('user1', 'tenant1');

      expect(records.length).toBe(1);
      expect(records[0].evolutionId).toBe('evo_1');
    });

    it('should limit stored records', async () => {
      // Add many records
      for (let i = 0; i < 100; i++) {
        const record: EvolutionHistoryRecord = {
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: i % 2 === 0 ? 'completed' : 'failed',
          fitnessScore: 0.5 + i * 0.001,
          fitnessDelta: 0.01,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        };
        await history.record('user1', 'tenant1', record);
      }

      const records = await history.query('user1', 'tenant1');
      expect(records.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Querying', () => {
    beforeEach(async () => {
      // Add test records
      for (let i = 0; i < 10; i++) {
        const record: EvolutionHistoryRecord = {
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - i * 86400000), // Stagger dates
          startedAt: new Date(),
          completedAt: new Date(),
          status: i < 7 ? 'completed' : 'failed',
          fitnessScore: 0.5 + i * 0.01,
          fitnessDelta: 0.01,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        };
        await history.record('user1', 'tenant1', record);
      }
    });

    it('should query with limit', async () => {
      const records = await history.query('user1', 'tenant1', { limit: 5 });
      expect(records.length).toBe(5);
    });

    it('should query by status', async () => {
      const records = await history.query('user1', 'tenant1', {
        status: ['completed'],
      });
      expect(records.every(r => r.status === 'completed')).toBe(true);
    });

    it('should query by fitness range', async () => {
      const records = await history.query('user1', 'tenant1', {
        minFitness: 0.55,
        maxFitness: 0.58,
      });
      records.forEach(r => {
        expect(r.fitnessScore).toBeGreaterThanOrEqual(0.55);
        expect(r.fitnessScore).toBeLessThanOrEqual(0.58);
      });
    });

    it('should query by date range', async () => {
      const now = new Date();
      const weekAgo = new Date(Date.now() - 7 * 86400000);

      const records = await history.query('user1', 'tenant1', {
        startDate: weekAgo,
        endDate: now,
      });

      records.forEach(r => {
        const date = new Date(r.triggeredAt);
        expect(date >= weekAgo).toBe(true);
        expect(date <= now).toBe(true);
      });
    });
  });

  describe('Version Management', () => {
    it('should create and get versions', async () => {
      const version = await history.createVersion('user1', 'tenant1', 0.7, 'Test version');

      expect(version).toBeDefined();
      expect(version.fitnessScore).toBe(0.7);
      expect(version.version).toBe(1);

      const versions = await history.getVersions('user1', 'tenant1');
      expect(versions.length).toBe(1);
    });

    it('should increment version number', async () => {
      await history.createVersion('user1', 'tenant1', 0.6);
      await history.createVersion('user1', 'tenant1', 0.7);
      await history.createVersion('user1', 'tenant1', 0.8);

      const versions = await history.getVersions('user1', 'tenant1');
      expect(versions.length).toBe(3);
      expect(versions[2].version).toBe(3);
    });

    it('should get specific version', async () => {
      const created = await history.createVersion('user1', 'tenant1', 0.7);
      const retrieved = await history.getVersion('user1', 'tenant1', created.versionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.versionId).toBe(created.versionId);
    });
  });

  describe('Rewards', () => {
    it('should add and get rewards', async () => {
      const reward: Reward = {
        rewardId: 'rew_1',
        userId: 'user1',
        tenantId: 'tenant1',
        type: RewardType.TASK_SUCCESS,
        value: 0.1,
        calculatedAt: new Date(),
      };

      await history.addReward('user1', 'tenant1', reward);
      const rewards = await history.getRewards('user1', 'tenant1');

      expect(rewards.length).toBe(1);
      expect(rewards[0].type).toBe(RewardType.TASK_SUCCESS);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', async () => {
      // Add records
      for (let i = 0; i < 5; i++) {
        const record: EvolutionHistoryRecord = {
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: i < 4 ? 'completed' : 'failed',
          fitnessScore: 0.5 + i * 0.05,
          fitnessDelta: 0.05,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        };
        await history.record('user1', 'tenant1', record);
      }

      // Add rewards
      await history.addReward('user1', 'tenant1', {
        rewardId: 'rew_1',
        userId: 'user1',
        tenantId: 'tenant1',
        type: RewardType.TASK_SUCCESS,
        value: 0.1,
        calculatedAt: new Date(),
      });

      const stats = await history.getStats('user1', 'tenant1');

      expect(stats.totalRecords).toBe(5);
      expect(stats.successfulRecords).toBe(4);
      expect(stats.failedRecords).toBe(1);
      expect(stats.totalRewards).toBe(0.1);
    });
  });

  describe('Rollback', () => {
    it('should record rollback', async () => {
      await history.recordRollback('user1', 'tenant1', 'ver_1');
      const records = await history.query('user1', 'tenant1');

      expect(records.length).toBe(1);
      expect(records[0].metadata.type).toBe('rollback');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old records', async () => {
      // Add old records
      for (let i = 0; i < 5; i++) {
        const record: EvolutionHistoryRecord = {
          recordId: `rec_old_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_old_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - 30 * 86400000), // 30 days ago
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.5,
          fitnessDelta: 0.01,
          mutationCount: 1,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        };
        await history.record('user1', 'tenant1', record);
      }

      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const deleted = await history.cleanup('user1', 'tenant1', weekAgo);

      expect(deleted).toBe(5);
    });
  });
});

describe('EvolutionAnalyzer', () => {
  let analyzer: EvolutionAnalyzer;

  beforeEach(() => {
    analyzer = new EvolutionAnalyzer({
      analysisWindowSize: 50,
      trendPeriod: 10,
    });
  });

  describe('Report Generation', () => {
    it('should generate basic report', async () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - (10 - i) * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: i < 8 ? 'completed' : 'failed',
          fitnessScore: 0.5 + i * 0.02,
          fitnessDelta: 0.02,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0.05,
            evolutionary: 0.02,
            penalties: 0,
            total: 0.17,
          },
          metadata: {},
        });
      }

      const report = await analyzer.generateReport('user1', 'tenant1', history);

      expect(report.userId).toBe('user1');
      expect(report.tenantId).toBe('tenant1');
      expect(report.totalEvolutions).toBe(10);
      expect(report.successRate).toBe(0.8);
      expect(report.fitnessTrend.length).toBeGreaterThan(0);
    });

    it('should generate report with empty history', async () => {
      const report = await analyzer.generateReport('user1', 'tenant1', []);

      expect(report.totalEvolutions).toBe(0);
      expect(report.successRate).toBe(0);
      expect(report.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate improving trend', async () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - (10 - i) * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.4 + i * 0.03,
          fitnessDelta: 0.03,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const report = await analyzer.generateReport('user1', 'tenant1', history);
      expect(report.suggestions.some(s => s.includes('改善'))).toBe(true);
    });

    it('should detect declining trend', async () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - (10 - i) * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.7 - i * 0.03,
          fitnessDelta: -0.03,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const report = await analyzer.generateReport('user1', 'tenant1', history);
      expect(report.suggestions.some(s => s.includes('下降'))).toBe(true);
    });
  });

  describe('Mutation Statistics', () => {
    it('should calculate mutation statistics', async () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.6,
          fitnessDelta: 0.01,
          mutationCount: i + 1,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {
            lastMutationTypes: ['TRAIT', 'BEHAVIOR'],
          },
        });
      }

      const report = await analyzer.generateReport('user1', 'tenant1', history);
      expect(report.topMutations.length).toBeGreaterThan(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect fitness anomalies', () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: i === 5 ? 0.1 : 0.6, // Anomaly at index 5
          fitnessDelta: 0.01,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const anomalies = analyzer.detectAnomalies(history);
      expect(anomalies.fitnessAnomalies.length).toBeGreaterThan(0);
    });

    it('should detect performance anomalies', () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.6,
          fitnessDelta: 0.01,
          mutationCount: 2,
          executionTime: i === 3 ? 10000 : 100, // Anomaly
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const anomalies = analyzer.detectAnomalies(history);
      expect(anomalies.performanceAnomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Period Comparison', () => {
    it('should compare two periods', () => {
      const now = new Date();
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

      const history: EvolutionHistoryRecord[] = [];

      // Period 2 (week ago to now)
      for (let i = 0; i < 5; i++) {
        history.push({
          recordId: `rec_new_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_new_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(weekAgo.getTime() + i * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.7,
          fitnessDelta: 0.02,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      // Period 1 (two weeks ago to week ago)
      for (let i = 0; i < 5; i++) {
        history.push({
          recordId: `rec_old_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_old_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(twoWeeksAgo.getTime() + i * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.5,
          fitnessDelta: 0.01,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const comparison = analyzer.comparePeriods(
        history,
        { start: twoWeeksAgo, end: weekAgo },
        { start: weekAgo, end: now }
      );

      expect(comparison.fitnessComparison).toBeGreaterThan(0);
    });
  });

  describe('Fitness Prediction', () => {
    it('should predict future fitness', () => {
      const history: EvolutionHistoryRecord[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual',
          triggeredAt: new Date(Date.now() - (10 - i) * 86400000),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          fitnessScore: 0.5 + i * 0.02,
          fitnessDelta: 0.02,
          mutationCount: 2,
          rewards: {
            taskSuccess: 0.1,
            userFeedback: 0,
            evolutionary: 0,
            penalties: 0,
            total: 0.1,
          },
          metadata: {},
        });
      }

      const predictions = analyzer.predictFutureFitness(history, 5);

      expect(predictions.length).toBe(5);
      predictions.forEach(p => {
        expect(p.fitness).toBeGreaterThanOrEqual(0);
        expect(p.fitness).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty for insufficient data', () => {
      const predictions = analyzer.predictFutureFitness([], 5);
      expect(predictions.length).toBe(0);
    });
  });
});
