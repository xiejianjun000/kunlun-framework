/**
 * 奖励模型测试
 * Reward Models Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeRewardModel } from '../src/modules/evolution-system/rewards/RewardModel';
import { TaskSuccessReward } from '../src/modules/evolution-system/rewards/TaskSuccessReward';
import { UserFeedbackReward } from '../src/modules/evolution-system/rewards/UserFeedbackReward';
import { EvolutionaryReward } from '../src/modules/evolution-system/rewards/EvolutionaryReward';
import {
  RewardContext,
  FeedbackType,
  RewardType,
} from '../src/modules/evolution-system/interfaces';

describe('TaskSuccessReward', () => {
  let rewardModel: TaskSuccessReward;

  beforeEach(() => {
    rewardModel = new TaskSuccessReward({
      successBaseReward: 0.1,
      qualityWeight: 0.4,
      efficiencyWeight: 0.3,
    });
  });

  describe('Task Success Calculation', () => {
    it('should calculate reward for successful task', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        task: {
          taskId: 'task1',
          type: 'test',
          success: true,
          qualityScore: 0.8,
          efficiencyScore: 0.9,
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });

    it('should return penalty for failed task', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        task: {
          taskId: 'task1',
          type: 'test',
          success: false,
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeLessThan(0);
    });

    it('should return zero for missing task', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBe(0);
    });
  });

  describe('Consecutive Success Bonus', () => {
    it('should apply consecutive success multiplier', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        task: {
          taskId: 'task1',
          type: 'test',
          success: true,
        },
        evolutionHistory: [
          { status: 'completed', fitnessScore: 0.5, fitnessDelta: 0.1, mutationCount: 1 } as any,
          { status: 'completed', fitnessScore: 0.6, fitnessDelta: 0.1, mutationCount: 1 } as any,
        ],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0.1); // Base reward * multiplier
    });
  });

  describe('Configuration', () => {
    it('should get and update configuration', () => {
      const config = rewardModel.getConfig();
      expect(config.successBaseReward).toBe(0.1);

      rewardModel.updateConfig({ successBaseReward: 0.2 });
      expect(rewardModel.getConfig().successBaseReward).toBe(0.2);
    });
  });

  describe('Completion Rate', () => {
    it('should calculate completion rate reward', () => {
      const reward = rewardModel.calculateCompletionRateReward(8, 10);
      expect(reward).toBeGreaterThan(0);
    });

    it('should handle zero tasks', () => {
      const reward = rewardModel.calculateCompletionRateReward(0, 0);
      expect(reward).toBe(0);
    });
  });

  describe('Timeout Penalty', () => {
    it('should calculate timeout penalty', () => {
      const penalty = rewardModel.calculateTimeoutPenalty(1000, 1500);
      expect(penalty).toBeLessThan(0);
    });

    it('should return zero for on-time completion', () => {
      const penalty = rewardModel.calculateTimeoutPenalty(1000, 500);
      expect(penalty).toBe(0);
    });
  });
});

describe('UserFeedbackReward', () => {
  let rewardModel: UserFeedbackReward;

  beforeEach(() => {
    rewardModel = new UserFeedbackReward({
      positiveBaseReward: 0.05,
      negativeBasePenalty: -0.1,
      ratingThreshold: 0.5,
    });
  });

  describe('Explicit Feedback', () => {
    it('should calculate positive explicit feedback', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.EXPLICIT,
          rating: 0.8,
          providedAt: new Date(),
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });

    it('should calculate negative explicit feedback', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.EXPLICIT,
          rating: 0.2,
          providedAt: new Date(),
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeLessThan(0);
    });
  });

  describe('Feedback Types', () => {
    it('should handle implicit feedback with lower weight', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.IMPLICIT,
          rating: 0.8,
          providedAt: new Date(),
        },
      };

      const implicitReward = await rewardModel.calculate(context);

      const explicitContext: RewardContext = {
        ...context,
        feedback: {
          ...context.feedback!,
          type: FeedbackType.EXPLICIT,
        },
      };
      const explicitReward = await rewardModel.calculate(explicitContext);

      expect(Math.abs(implicitReward)).toBeLessThan(Math.abs(explicitReward));
    });

    it('should handle correction feedback', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.CORRECTION,
          rating: 0.3,
          providedAt: new Date(),
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeLessThan(0);
    });

    it('should handle approval feedback', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.APPROVAL,
          rating: 0.9,
          providedAt: new Date(),
        },
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Cumulative Feedback', () => {
    it('should calculate cumulative feedback score', () => {
      const feedbacks = [
        { rating: 0.7 },
        { rating: 0.8 },
        { rating: 0.6 },
      ];

      const reward = rewardModel.calculateCumulativeFeedback(feedbacks);
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate feedback trend', () => {
      const recent = [
        { rating: 0.8 },
        { rating: 0.9 },
      ];
      const older = [
        { rating: 0.6 },
        { rating: 0.5 },
      ];

      const trendReward = rewardModel.calculateTrendReward(recent, older);
      expect(trendReward).toBeGreaterThan(0);
    });
  });
});

describe('EvolutionaryReward', () => {
  let rewardModel: EvolutionaryReward;

  beforeEach(() => {
    rewardModel = new EvolutionaryReward({
      explorationBaseReward: 0.02,
      diversityRewardWeight: 0.3,
      consistencyRewardWeight: 0.2,
    });
  });

  describe('Exploration Reward', () => {
    it('should give base exploration reward for new evolution', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: [],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });

    it('should give bonus for mutations', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: [
          { mutationCount: 3, fitnessDelta: 0.1, fitnessScore: 0.5 } as any,
        ],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Diversity Reward', () => {
    it('should calculate diversity for diverse mutation types', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: Array(10).fill(null).map((_, i) => ({
          mutationCount: 1,
          fitnessDelta: 0.01,
          fitnessScore: 0.5,
          metadata: {
            lastMutationTypes: [i % 3 === 0 ? 'TRAIT' : i % 3 === 1 ? 'BEHAVIOR' : 'PARAMETER'],
          },
        })) as any[],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Consistency Reward', () => {
    it('should give reward for stable improvements', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: [
          { fitnessDelta: 0.05, fitnessScore: 0.55, mutationCount: 1 } as any,
          { fitnessDelta: 0.05, fitnessScore: 0.6, mutationCount: 1 } as any,
          { fitnessDelta: 0.05, fitnessScore: 0.65, mutationCount: 1 } as any,
          { fitnessDelta: 0.05, fitnessScore: 0.7, mutationCount: 1 } as any,
          { fitnessDelta: 0.05, fitnessScore: 0.75, mutationCount: 1 } as any,
        ],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });
  });

  describe('Improvement Reward', () => {
    it('should reward positive fitness changes', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: [
          { fitnessDelta: 0.1, fitnessScore: 0.6, mutationCount: 2 } as any,
        ],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeGreaterThan(0);
    });

    it('should penalize regression', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        evolutionHistory: [
          { fitnessDelta: -0.05, fitnessScore: 0.45, mutationCount: 2 } as any,
        ],
      };

      const reward = await rewardModel.calculate(context);
      expect(reward).toBeLessThan(0);
    });
  });
});

describe('CompositeRewardModel', () => {
  let composite: CompositeRewardModel;

  beforeEach(() => {
    composite = new CompositeRewardModel();
    composite.addModel(new TaskSuccessReward());
    composite.addModel(new UserFeedbackReward());
    composite.addModel(new EvolutionaryReward());
  });

  describe('Model Management', () => {
    it('should add and get models', () => {
      expect(composite.size()).toBe(3);

      const taskModel = composite.getModel('TaskSuccessReward');
      expect(taskModel).toBeDefined();
    });

    it('should remove models', () => {
      composite.removeModel('EvolutionaryReward');
      expect(composite.size()).toBe(2);
    });
  });

  describe('Composite Calculation', () => {
    it('should calculate combined rewards', async () => {
      const context: RewardContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        task: {
          taskId: 'task1',
          type: 'test',
          success: true,
          qualityScore: 0.8,
        },
        feedback: {
          feedbackId: 'fb1',
          type: FeedbackType.EXPLICIT,
          rating: 0.7,
          providedAt: new Date(),
        },
        evolutionHistory: [
          { mutationCount: 2, fitnessDelta: 0.05, fitnessScore: 0.55 } as any,
        ],
      };

      const rewards = await composite.calculate(context);

      expect(Array.isArray(rewards)).toBe(true);
      expect(rewards.length).toBeGreaterThan(0);

      // Should have rewards from different types
      const types = rewards.map(r => r.type);
      expect(types).toContain(RewardType.TASK_SUCCESS);
    });
  });
});
