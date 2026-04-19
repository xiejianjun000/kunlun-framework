/**
 * 特质管理测试
 * Trait Management Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TraitManager,
  TraitMutator,
  TraitValidator,
  TraitCategory,
} from '../../../dist/modules/evolution-system/traits';
import { EvolutionContext, EvolutionDirection, MutationType } from '../../../dist/modules/evolution-system/interfaces';

describe('TraitManager', () => {
  let manager: TraitManager;

  beforeEach(() => {
    manager = new TraitManager();
  });

  describe('Initialization', () => {
    it('should create a trait manager instance', () => {
      expect(manager).toBeDefined();
    });

    it('should initialize successfully', async () => {
      const newManager = new TraitManager();
      await newManager.initialize();
      expect(newManager).toBeDefined();
    });
  });

  describe('Trait Operations', () => {
    it('should get default state', async () => {
      const state = await manager.getTraits('user1', 'tenant1');
      expect(state).toBeDefined();
      expect(typeof state.fitness).toBe('number');
    });

    it('should set and get trait', async () => {
      await manager.setTrait('user1', 'tenant1', 'extraversion', {
        name: 'extraversion',
        category: TraitCategory.PERSONALITY,
        value: 0.7,
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const trait = await manager.getTrait('user1', 'tenant1', 'extraversion');
      expect(trait).toBeDefined();
      expect(trait?.value).toBe(0.7);
    });

    it('should batch set traits', async () => {
      await manager.setTraits('user1', 'tenant1', {
        trait1: {
          name: 'trait1',
          category: TraitCategory.PERSONALITY,
          value: 0.6,
          confidence: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        trait2: {
          name: 'trait2',
          category: TraitCategory.PREFERENCE,
          value: 0.4,
          confidence: 0.6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const state = await manager.getTraits('user1', 'tenant1');
      expect(state.trait1).toBe(0.6);
      expect(state.trait2).toBe(0.4);
    });

    it('should update trait value', async () => {
      await manager.setTrait('user1', 'tenant1', 'testTrait', {
        name: 'testTrait',
        category: TraitCategory.BEHAVIOR,
        value: 0.5,
        confidence: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.updateTrait('user1', 'tenant1', 'testTrait', 0.8);

      const trait = await manager.getTrait('user1', 'tenant1', 'testTrait');
      expect(trait?.value).toBe(0.8);
    });

    it('should delete trait', async () => {
      await manager.setTrait('user1', 'tenant1', 'toDelete', {
        name: 'toDelete',
        category: TraitCategory.BEHAVIOR,
        value: 0.5,
        confidence: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deleted = await manager.deleteTrait('user1', 'tenant1', 'toDelete');
      expect(deleted).toBe(true);

      const trait = await manager.getTrait('user1', 'tenant1', 'toDelete');
      expect(trait).toBeNull();
    });

    it('should reset traits', async () => {
      await manager.setTrait('user1', 'tenant1', 'testTrait', {
        name: 'testTrait',
        category: TraitCategory.BEHAVIOR,
        value: 0.5,
        confidence: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.resetTraits('user1', 'tenant1');

      const state = await manager.getTraits('user1', 'tenant1');
      expect(state.testTrait).toBeUndefined();
    });
  });

  describe('Trait Listing', () => {
    it('should list all traits', async () => {
      await manager.setTraits('user1', 'tenant1', {
        trait1: {
          name: 'trait1',
          category: TraitCategory.PERSONALITY,
          value: 0.6,
          confidence: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        trait2: {
          name: 'trait2',
          category: TraitCategory.PREFERENCE,
          value: 0.4,
          confidence: 0.6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const traits = await manager.listTraits('user1', 'tenant1');
      expect(traits.length).toBe(2);
    });

    it('should filter traits by category', async () => {
      await manager.setTraits('user1', 'tenant1', {
        trait1: {
          name: 'trait1',
          category: TraitCategory.PERSONALITY,
          value: 0.6,
          confidence: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        trait2: {
          name: 'trait2',
          category: TraitCategory.PREFERENCE,
          value: 0.4,
          confidence: 0.6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const traits = await manager.listTraits('user1', 'tenant1', TraitCategory.PERSONALITY);
      expect(traits.length).toBe(1);
      expect(traits[0].category).toBe(TraitCategory.PERSONALITY);
    });

    it('should get trait count', async () => {
      await manager.setTraits('user1', 'tenant1', {
        trait1: {
          name: 'trait1',
          category: TraitCategory.PERSONALITY,
          value: 0.6,
          confidence: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        trait2: {
          name: 'trait2',
          category: TraitCategory.PREFERENCE,
          value: 0.4,
          confidence: 0.6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const count = await manager.getTraitCount('user1', 'tenant1');
      expect(count).toBe(2);
    });
  });

  describe('Export/Import', () => {
    it('should export traits', async () => {
      await manager.setTrait('user1', 'tenant1', 'exportTrait', {
        name: 'exportTrait',
        category: TraitCategory.PERSONALITY,
        value: 0.7,
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const exported = await manager.exportTraits('user1', 'tenant1');
      expect(exported.exportTrait).toBeDefined();
    });

    it('should import traits', async () => {
      const traits = {
        importTrait: {
          name: 'importTrait',
          category: TraitCategory.BEHAVIOR,
          value: 0.5,
          confidence: 0.6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await manager.importTraits('user1', 'tenant1', traits);

      const trait = await manager.getTrait('user1', 'tenant1', 'importTrait');
      expect(trait).toBeDefined();
      expect(trait?.value).toBe(0.5);
    });
  });
});

describe('TraitMutator', () => {
  let mutator: TraitMutator;

  beforeEach(() => {
    mutator = new TraitMutator({
      mutationProbability: 0.5,
      mutationStrength: 0.1,
    });
  });

  describe('Mutation Generation', () => {
    it('should generate a mutation', () => {
      const state = {
        fitness: 0.5,
        trait1: 0.6,
        trait2: 0.4,
      };

      const mutation = mutator.generateMutation(state);
      expect(mutation === null || mutation.mutationId).toBeTruthy();
    });

    it('should respect max strength', () => {
      const state = { fitness: 0.5, trait1: 0.6 };
      const mutation = mutator.generateMutation(state, { maxStrength: 0.05 });

      if (mutation) {
        expect(mutation.strength).toBeLessThanOrEqual(0.05);
      }
    });

    it('should specify mutation type', () => {
      const state = { fitness: 0.5, trait1: 0.6 };
      const mutation = mutator.generateMutation(state, { type: MutationType.TRAIT });

      if (mutation) {
        expect(mutation.type).toBe(MutationType.TRAIT);
      }
    });
  });

  describe('Batch Mutation', () => {
    it('should generate multiple mutations', () => {
      const state = {
        fitness: 0.5,
        trait1: 0.6,
        trait2: 0.4,
        trait3: 0.7,
        trait4: 0.3,
      };

      const mutations = mutator.generateMutations(state, []);
      expect(Array.isArray(mutations)).toBe(true);
    });

    it('should respect max count', () => {
      const state = {
        fitness: 0.5,
        trait1: 0.6,
        trait2: 0.4,
      };

      const mutations = mutator.generateMutations(state, [], 2);
      expect(mutations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Mutation Analysis', () => {
    it('should calculate mutation info', () => {
      const state = { fitness: 0.5, trait1: 0.6 };
      const mutations = mutator.generateMutations(state, []);

      const info = mutator.calculateMutationInfo(mutations);
      expect(info.totalMutations).toBe(mutations.length);
      expect(info.avgStrength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mutation Operations', () => {
    it('should reverse mutation', () => {
      const mutation = mutator.generateMutation({ fitness: 0.5, trait1: 0.6 });
      if (mutation) {
        const reversed = mutator.reverseMutation(mutation);
        expect(reversed.oldValue).toBe(mutation.newValue);
        expect(reversed.newValue).toBe(mutation.oldValue);
      }
    });

    it('should merge mutations', () => {
      const state = { fitness: 0.5, trait1: 0.6 };
      const mutations = mutator.generateMutations(state, []);

      if (mutations.length >= 2) {
        const merged = mutator.mergeMutations(mutations);
        expect(merged.size()).toBeLessThanOrEqual(mutations.length);
      }
    });
  });

  describe('Configuration', () => {
    it('should get and update configuration', () => {
      const config = mutator.getConfig();
      expect(config.mutationProbability).toBe(0.5);

      mutator.updateConfig({ mutationProbability: 0.8 });
      expect(mutator.getConfig().mutationProbability).toBe(0.8);
    });
  });
});

describe('TraitValidator', () => {
  let validator: TraitValidator;

  beforeEach(() => {
    validator = new TraitValidator({
      strictMode: false,
      autoCorrect: true,
    });
  });

  describe('Basic Validation', () => {
    it('should validate mutation with valid values', async () => {
      const mutation = {
        mutationId: 'mut_1',
        type: MutationType.TRAIT,
        path: 'fitness',
        oldValue: 0.5,
        newValue: 0.6,
        strength: 0.1,
        validated: false,
      };

      const context: EvolutionContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const valid = await validator.validate(mutation, context);
      expect(valid).toBe(true);
    });

    it('should validate range for numeric values', async () => {
      const mutation = {
        mutationId: 'mut_1',
        type: MutationType.TRAIT,
        path: 'fitness',
        oldValue: 0.5,
        newValue: 1.5, // Out of range
        strength: 1.0,
        validated: false,
      };

      const context: EvolutionContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const valid = await validator.validate(mutation, context);
      expect(valid).toBe(true); // Auto-corrected
    });
  });

  describe('Constraint Validation', () => {
    it('should validate against constraints', async () => {
      const mutation = {
        mutationId: 'mut_1',
        type: MutationType.TRAIT,
        path: 'testTrait',
        oldValue: 0.5,
        newValue: 0.9,
        strength: 0.4,
        validated: false,
      };

      const context: EvolutionContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [
          {
            constraintId: 'c1',
            type: 'range' as any,
            path: 'testTrait',
            value: { min: 0, max: 0.7 },
            strict: false,
          },
        ],
        historyCount: 0,
        metadata: {},
      };

      const result = await validator.validateWithDetails(mutation, context);
      expect(result.valid || result.correctedValue !== undefined).toBe(true);
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch of mutations', async () => {
      const mutations = [
        {
          mutationId: 'mut_1',
          type: MutationType.TRAIT,
          path: 'fitness',
          oldValue: 0.5,
          newValue: 0.6,
          strength: 0.1,
          validated: false,
        },
        {
          mutationId: 'mut_2',
          type: MutationType.TRAIT,
          path: 'trait1',
          oldValue: 0.4,
          newValue: 0.5,
          strength: 0.1,
          validated: false,
        },
      ];

      const context: EvolutionContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [],
        historyCount: 0,
        metadata: {},
      };

      const result = await validator.validateBatch(mutations, context);
      expect(result.validMutations.length + result.invalidMutations.length).toBe(2);
    });
  });

  describe('Custom Validators', () => {
    it('should register and use custom validator', async () => {
      validator.registerValidator('positive', (value) => (value as number) > 0);

      const mutation = {
        mutationId: 'mut_1',
        type: MutationType.TRAIT,
        path: 'fitness',
        oldValue: -0.5,
        newValue: -0.3,
        strength: 0.2,
        validated: false,
      };

      const context: EvolutionContext = {
        userId: 'user1',
        tenantId: 'tenant1',
        currentFitness: 0.5,
        direction: EvolutionDirection.BALANCED,
        constraints: [
          {
            constraintId: 'c1',
            type: 'custom' as any,
            path: 'fitness',
            value: 'positive',
            strict: true,
          },
        ],
        historyCount: 0,
        metadata: {},
      };

      const result = await validator.validateWithDetails(mutation, context);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should unregister custom validator', () => {
      validator.registerValidator('test', () => true);
      const removed = validator.unregisterValidator('test');
      expect(removed).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should get and update configuration', () => {
      const config = validator.getConfig();
      expect(config.strictMode).toBe(false);

      validator.updateConfig({ strictMode: true });
      expect(validator.getConfig().strictMode).toBe(true);
    });
  });
});
