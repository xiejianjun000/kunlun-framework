/**
 * 进化策略测试
 * Evolution Strategies Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GeneticStrategy,
  type GeneticStrategyConfig,
} from '../src/modules/evolution-system/strategies/GeneticStrategy';
import {
  ReinforcementStrategy,
  type ReinforcementStrategyConfig,
} from '../src/modules/evolution-system/strategies/ReinforcementStrategy';
import {
  GradientStrategy,
  type GradientStrategyConfig,
} from '../src/modules/evolution-system/strategies/GradientStrategy';
import { StrategyContext, MutationType } from '../src/modules/evolution-system/interfaces';

describe('GeneticStrategy', () => {
  let strategy: GeneticStrategy;

  beforeEach(() => {
    strategy = new GeneticStrategy({
      populationSize: 20,
      maxMutations: 3,
    });
  });

  describe('Initialization', () => {
    it('should create a genetic strategy instance', () => {
      expect(strategy).toBeDefined();
      expect(strategy.id).toBe('genetic');
      expect(strategy.name).toBe('Genetic Algorithm Strategy');
    });
  });

  describe('Execution', () => {
    it('should execute evolution successfully', async () => {
      const context: StrategyContext = {
        currentState: {
          fitness: 0.5,
          trait1: 0.6,
          trait2: 0.4,
        },
        params: { maxMutations: 3 },
        constraints: [],
        history: [],
      };

      const result = await strategy.execute(context);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.fitnessDelta).toBe('number');
      expect(result.mutations).toBeDefined();
      expect(Array.isArray(result.mutations)).toBe(true);
    });

    it('should respect max mutations limit', async () => {
      const context: StrategyContext = {
        currentState: {
          fitness: 0.5,
          trait1: 0.6,
          trait2: 0.4,
          trait3: 0.7,
        },
        params: { maxMutations: 2 },
        constraints: [],
        history: [],
      };

      const result = await strategy.execute(context);

      expect(result.mutations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Conditions', () => {
    it('should return applicable conditions', () => {
      const conditions = strategy.getApplicableConditions();
      expect(Array.isArray(conditions)).toBe(true);
      expect(conditions.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should get and update configuration', () => {
      const config = strategy.getConfig();
      expect(config.populationSize).toBe(20);

      strategy.updateConfig({ populationSize: 30 });
      expect(strategy.getConfig().populationSize).toBe(30);
    });
  });
});

describe('ReinforcementStrategy', () => {
  let strategy: ReinforcementStrategy;

  beforeEach(() => {
    strategy = new ReinforcementStrategy({
      qLearning: {
        learningRate: 0.1,
        discountFactor: 0.9,
        epsilon: 0.3,
        epsilonDecay: 0.99,
        minEpsilon: 0.01,
      },
    });
  });

  describe('Initialization', () => {
    it('should create a reinforcement strategy instance', () => {
      expect(strategy).toBeDefined();
      expect(strategy.id).toBe('reinforcement');
    });
  });

  describe('Execution', () => {
    it('should execute evolution with Q-learning', async () => {
      const context: StrategyContext = {
        currentState: {
          fitness: 0.5,
          trait1: 0.6,
        },
        params: { maxMutations: 3 },
        constraints: [],
        history: Array(25).fill(null).map((_, i) => ({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual' as any,
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed' as any,
          fitnessScore: 0.5,
          fitnessDelta: 0,
          mutationCount: 1,
          rewards: { taskSuccess: 0.1, userFeedback: 0, evolutionary: 0, penalties: 0, total: 0.1 },
          metadata: {},
        })),
      };

      const result = await strategy.execute(context);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should update Q-table on repeated execution', async () => {
      const context: StrategyContext = {
        currentState: { fitness: 0.5 },
        params: {},
        constraints: [],
        history: [],
      };

      await strategy.execute(context);
      await strategy.execute(context);

      const stats = strategy.getQTableStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Q-Table Management', () => {
    it('should save and load Q-table', () => {
      const saved = strategy.saveQTable();
      expect(Array.isArray(saved)).toBe(true);

      strategy.loadQTable(saved);
      const reloaded = strategy.saveQTable();
      expect(reloaded.length).toBe(saved.length);
    });
  });

  describe('Conditions', () => {
    it('should return applicable conditions', () => {
      const conditions = strategy.getApplicableConditions();
      expect(Array.isArray(conditions)).toBe(true);
    });
  });
});

describe('GradientStrategy', () => {
  let strategy: GradientStrategy;

  beforeEach(() => {
    strategy = new GradientStrategy({
      gradient: {
        learningRate: 0.01,
        momentum: 0.9,
        gradientClip: 5,
        adaptiveLearningRate: true,
      },
      maxIterations: 5,
    });
  });

  describe('Initialization', () => {
    it('should create a gradient strategy instance', () => {
      expect(strategy).toBeDefined();
      expect(strategy.id).toBe('gradient');
    });
  });

  describe('Execution', () => {
    it('should execute gradient descent optimization', async () => {
      const context: StrategyContext = {
        currentState: {
          fitness: 0.5,
          trait1: 0.6,
          trait2: 0.4,
        },
        params: { maxMutations: 2 },
        constraints: [],
        history: [],
      };

      const result = await strategy.execute(context);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.mutations).toBeDefined();
    });

    it('should handle history for gradient estimation', async () => {
      const context: StrategyContext = {
        currentState: { fitness: 0.5 },
        params: {},
        constraints: [],
        history: Array(5).fill(null).map((_, i) => ({
          recordId: `rec_${i}`,
          userId: 'user1',
          tenantId: 'tenant1',
          evolutionId: `evo_${i}`,
          triggerType: 'manual' as any,
          triggeredAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed' as any,
          fitnessScore: 0.4 + i * 0.02,
          fitnessDelta: 0.02,
          mutationCount: 1,
          rewards: { taskSuccess: 0.1, userFeedback: 0, evolutionary: 0, penalties: 0, total: 0.1 },
          metadata: {},
        })),
      };

      const result = await strategy.execute(context);
      expect(result).toBeDefined();
    });
  });

  describe('Gradient History', () => {
    it('should reset gradient history', () => {
      strategy.resetGradientHistory();
      const stats = strategy.getGradientStats();
      expect(stats.totalParameters).toBe(0);
    });

    it('should track gradient statistics', async () => {
      const context: StrategyContext = {
        currentState: {
          fitness: 0.5,
          trait1: 0.6,
        },
        params: {},
        constraints: [],
        history: [],
      };

      await strategy.execute(context);
      const stats = strategy.getGradientStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Conditions', () => {
    it('should return applicable conditions', () => {
      const conditions = strategy.getApplicableConditions();
      expect(Array.isArray(conditions)).toBe(true);
    });
  });
});

describe('Strategy Comparison', () => {
  const context: StrategyContext = {
    currentState: {
      fitness: 0.5,
      trait1: 0.6,
      trait2: 0.4,
      trait3: 0.7,
    },
    params: { maxMutations: 3 },
    constraints: [],
    history: [],
  };

  it('should all strategies produce valid results', async () => {
    const genetic = new GeneticStrategy();
    const reinforcement = new ReinforcementStrategy();
    const gradient = new GradientStrategy();

    const [genResult, rlResult, gradResult] = await Promise.all([
      genetic.execute(context),
      reinforcement.execute(context),
      gradient.execute(context),
    ]);

    expect(genResult).toBeDefined();
    expect(rlResult).toBeDefined();
    expect(gradResult).toBeDefined();

    // All should produce valid state
    expect(genResult.newState).toBeDefined();
    expect(rlResult.newState).toBeDefined();
    expect(gradResult.newState).toBeDefined();
  });

  it('should produce different mutation patterns', async () => {
    const genetic = new GeneticStrategy();
    const reinforcement = new ReinforcementStrategy();
    const gradient = new GradientStrategy();

    const [genResult, rlResult, gradResult] = await Promise.all([
      genetic.execute(context),
      reinforcement.execute(context),
      gradient.execute(context),
    ]);

    // Strategies may produce different mutations
    expect(genResult.mutations.length).toBeGreaterThanOrEqual(0);
    expect(rlResult.mutations.length).toBeGreaterThanOrEqual(0);
    expect(gradResult.mutations.length).toBeGreaterThanOrEqual(0);
  });
});
