/**
 * 人格系统测试套件
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// 导入被测试的模块
import { PersonalityModel } from '../../src/modules/personality-system/PersonalityModel';
import { PersonalityDistiller } from '../../src/modules/personality-system/PersonalityDistiller';
import { PersonalityUpdater } from '../../src/modules/personality-system/PersonalityUpdater';
import { BehaviorCollector } from '../../src/modules/personality-system/behavior/BehaviorCollector';
import { BehaviorAnalyzer } from '../../src/modules/personality-system/behavior/BehaviorAnalyzer';
import { TraitExtractor } from '../../src/modules/personality-system/trait/TraitExtractor';
import { CommunicationStyleExtractor } from '../../src/modules/personality-system/trait/CommunicationStyleExtractor';
import { DecisionStyleExtractor } from '../../src/modules/personality-system/trait/DecisionStyleExtractor';
import { LearningStyleExtractor } from '../../src/modules/personality-system/trait/LearningStyleExtractor';
import { PersonalityValidator } from '../../src/modules/personality-system/validation/PersonalityValidator';
import { TraitConstraintChecker } from '../../src/modules/personality-system/validation/TraitConstraintChecker';
import { PersonalitySnapshotManager } from '../../src/modules/personality-system/snapshot/PersonalitySnapshot';
import { PersonalityReporter } from '../../src/modules/personality-system/snapshot/PersonalityReporter';

import {
  IPersonalityProfile,
  BehaviorData,
  TraitType,
  PersonalityDimension
} from '../../src/core/interfaces/IPersonalitySystem';

/**
 * 创建测试用的人格画像
 */
function createTestProfile(): IPersonalityProfile {
  return {
    profileId: `profile_${uuidv4()}`,
    userId: 'test_user',
    tenantId: 'test_tenant',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    confidenceScore: 0.7,
    privacySettings: {
      noDistillTopics: [],
      distillLevel: 'standard'
    },
    dimensions: {
      personality: {
        dimensions: {
          extraversion_introversion: {
            value: 0.6,
            label: '外向型',
            confidence: 0.8,
            evidence: ['喜欢团队讨论', '主动发起话题']
          },
          openness_conservatism: {
            value: 0.7,
            label: '高开放性',
            confidence: 0.75,
            evidence: ['愿意尝试新功能', '接受AI建议']
          },
          rationality_emotion: {
            value: 0.65,
            label: '偏理性',
            confidence: 0.85,
            evidence: ['要求数据分析', '偏好结构化输出']
          },
          risk_tolerance: {
            value: 0.5,
            label: '中等风险偏好',
            confidence: 0.7,
            evidence: ['愿意自动化但要求确认']
          }
        },
        stableTraits: ['专业导向', '效率优先']
      },
      perspective: {
        dimensions: {
          decisionStyle: {
            value: 'deliberate',
            label: '深思熟虑型',
            confidence: 0.8,
            evidence: ['请求多次验证结果']
          },
          informationProcessing: {
            value: 'systematic',
            label: '系统性处理',
            confidence: 0.75,
            evidence: ['偏好完整报告']
          },
          authorityOrientation: {
            value: 0.6,
            label: '中等权威尊重',
            confidence: 0.7,
            evidence: ['重视合规性检查']
          }
        },
        preferredFormats: ['详细报告', '数据表格'],
        avoidFormats: ['纯口语化回复']
      },
      worldview: {
        dimensions: {
          causalityBelief: {
            value: 'evidence_based',
            label: '证据驱动',
            confidence: 0.85,
            evidence: ['要求数据支持']
          },
          systemComplexity: {
            value: 'high',
            label: '高复杂性认知',
            confidence: 0.75,
            evidence: ['理解多因素影响']
          },
          temporalOrientation: {
            value: 'medium_term',
            label: '中期导向',
            confidence: 0.7,
            evidence: ['关注季度目标']
          }
        },
        coreBeliefs: ['系统性方法优于直觉', '数据是决策基础']
      },
      values: {
        valueHierarchy: {
          priority1: { value: '合规性', weight: 0.3, evidence: '任何建议必须符合法规' },
          priority2: { value: '效率', weight: 0.25, evidence: '持续优化流程' }
        },
        bottomLinePrinciples: ['绝不违反法律法规'],
        tradeOffPatterns: { speed_vs_accuracy: '牺牲速度保准确' },
        confidence: 0.8
      },
      lifePhilosophy: {
        dimensions: {
          goalOrientation: {
            primaryGoals: ['提升工作效率', '减少重复工作'],
            confidence: 0.8
          },
          timeValue: {
            value: 'high',
            label: '高时间价值感',
            confidence: 0.75,
            evidence: ['对浪费时间极度敏感']
          },
          meaningPursuit: {
            value: 'competence_mastery',
            label: '追求能力精进',
            confidence: 0.7,
            evidence: ['关注技能提升']
          },
          workStyle: {
            collaborationPreference: 'selective',
            autonomyNeed: 'high',
            feedbackFrequency: 'monthly'
          }
        },
        confidence: 0.75
      }
    },
    stableTraits: ['专业导向', '效率优先'],
    evolutionHistory: [
      {
        version: 1,
        timestamp: new Date(),
        trigger: 'initial_creation',
        changes: { initial: true }
      }
    ]
  };
}

/**
 * 创建测试用的行为数据
 */
function createTestBehaviors(): BehaviorData[] {
  return [
    {
      id: `behavior_${uuidv4()}`,
      userId: 'test_user',
      tenantId: 'test_tenant',
      type: 'chat',
      content: '我更喜欢详细的数据分析报告',
      timestamp: new Date(),
      metadata: {}
    },
    {
      id: `behavior_${uuidv4()}`,
      userId: 'test_user',
      tenantId: 'test_tenant',
      type: 'chat',
      content: '请给我一个完整的方案分析',
      timestamp: new Date(),
      metadata: {}
    },
    {
      id: `behavior_${uuidv4()}`,
      userId: 'test_user',
      tenantId: 'test_tenant',
      type: 'decision',
      content: '根据数据显示这个方案可行',
      timestamp: new Date(),
      metadata: {}
    }
  ];
}

// ==================== PersonalityModel 测试 ====================

describe('PersonalityModel', () => {
  let model: PersonalityModel;
  let profile: IPersonalityProfile;

  beforeEach(() => {
    profile = createTestProfile();
    model = new PersonalityModel(profile);
  });

  describe('getProfile', () => {
    it('应该返回完整的画像数据', () => {
      const result = model.getProfile();
      expect(result).toBeDefined();
      expect(result?.userId).toBe('test_user');
      expect(result?.tenantId).toBe('test_tenant');
    });
  });

  describe('updateProfile', () => {
    it('应该更新画像数据并增加版本号', () => {
      const initialVersion = model.getProfile()?.version;
      model.updateProfile({ confidenceScore: 0.9 });
      expect(model.getProfile()?.confidenceScore).toBe(0.9);
      expect(model.getProfile()?.version).toBe(initialVersion! + 1);
    });
  });

  describe('getDimension', () => {
    it('应该返回正确的人格维度数据', () => {
      const personality = model.getDimension(PersonalityDimension.PERSONALITY);
      expect(personality).toBeDefined();
      expect(personality.dimensions).toBeDefined();
    });

    it('应该对未知维度返回null', () => {
      const unknown = model.getDimension('unknown' as PersonalityDimension);
      expect(unknown).toBeNull();
    });
  });

  describe('calculateSimilarity', () => {
    it('应该计算两个画像的相似度', () => {
      const otherProfile = createTestProfile();
      const otherModel = new PersonalityModel(otherProfile);
      const similarity = model.calculateSimilarity(otherModel);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('addStableTrait', () => {
    it('应该添加稳定特质', () => {
      model.addStableTrait('新特质');
      const traits = model.getStableTraits();
      expect(traits).toContain('新特质');
    });

    it('不应该添加重复的稳定特质', () => {
      model.addStableTrait('新特质');
      model.addStableTrait('新特质');
      const traits = model.getStableTraits();
      const count = traits.filter(t => t === '新特质').length;
      expect(count).toBe(1);
    });
  });
});

// ==================== PersonalityDistiller 测试 ====================

describe('PersonalityDistiller', () => {
  let distiller: PersonalityDistiller;

  beforeEach(() => {
    distiller = new PersonalityDistiller();
  });

  describe('distillTraits', () => {
    it('应该从行为数据中提取特质', async () => {
      const behaviors = createTestBehaviors();
      const traits = await distiller.distillTraits(behaviors, 'test_user');
      expect(Array.isArray(traits)).toBe(true);
    });

    it('应该处理空行为列表', async () => {
      const traits = await distiller.distillTraits([], 'test_user');
      expect(traits).toEqual([]);
    });
  });

  describe('generateProfile', () => {
    it('应该从特质生成人格画像', async () => {
      const behaviors = createTestBehaviors();
      const traits = await distiller.distillTraits(behaviors, 'test_user');
      const profile = await distiller.generateProfile(traits, 'test_user', 'test_tenant');
      
      expect(profile).toBeDefined();
      expect(profile.userId).toBe('test_user');
      expect(profile.tenantId).toBe('test_tenant');
      expect(profile.profileId).toMatch(/^profile_/);
    });
  });

  describe('validateDistillation', () => {
    it('应该验证蒸馏结果', () => {
      const validTraits = [
        {
          type: TraitType.EXTRAVERSION_INTROVERSION,
          value: 0.7,
          label: '外向型',
          confidence: 0.8,
          evidence: ['证据1', '证据2', '证据3'],
          sourceBehaviorIds: ['id1', 'id2']
        }
      ];
      expect(distiller.validateDistillation(validTraits)).toBe(true);
    });

    it('应该拒绝空特质列表', () => {
      expect(distiller.validateDistillation([])).toBe(false);
    });
  });
});

// ==================== PersonalityUpdater 测试 ====================

describe('PersonalityUpdater', () => {
  let updater: PersonalityUpdater;
  let profile: IPersonalityProfile;

  beforeEach(() => {
    updater = new PersonalityUpdater();
    profile = createTestProfile();
  });

  describe('performIncrementalUpdate', () => {
    it('应该执行增量更新', async () => {
      const updates = {
        confidenceScore: 0.85
      };
      const updated = await updater.performIncrementalUpdate(profile, updates);
      
      expect(updated.confidenceScore).toBe(0.85);
      expect(updated.version).toBe(profile.version + 1);
    });

    it('应该保存更新到历史', async () => {
      const updates = { confidenceScore: 0.9 };
      await updater.performIncrementalUpdate(profile, updates);
      
      const history = updater.getVersionHistory('test_user');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('calculateUpdateWeight', () => {
    it('应该计算更新权重', () => {
      const weight = updater.calculateUpdateWeight(0.5, 0.8);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    });

    it('高置信度新数据应该返回较大权重', () => {
      const highWeight = updater.calculateUpdateWeight(0.5, 0.95);
      expect(highWeight).toBe(1.0); // 快速更新
    });
  });

  describe('rollbackToVersion', () => {
    it('应该回滚到指定版本', async () => {
      // 先执行一些更新
      await updater.performIncrementalUpdate(profile, { confidenceScore: 0.8 });
      await updater.performIncrementalUpdate(profile, { confidenceScore: 0.85 });
      
      // 回滚到版本1
      const rolledBack = await updater.rollbackToVersion('test_user', 1);
      
      expect(rolledBack).toBeDefined();
      expect(rolledBack?.version).toBeGreaterThan(1);
    });
  });
});

// ==================== BehaviorCollector 测试 ====================

describe('BehaviorCollector', () => {
  let collector: BehaviorCollector;

  beforeEach(() => {
    collector = new BehaviorCollector();
  });

  describe('addBehavior', () => {
    it('应该添加行为数据', async () => {
      const behavior = createTestBehaviors()[0];
      await collector.addBehavior(behavior);
      
      const behaviors = await collector.getBehaviors('test_user', 'test_tenant');
      expect(behaviors.length).toBeGreaterThan(0);
    });
  });

  describe('getBehaviors', () => {
    it('应该返回用户的行为数据', async () => {
      const behaviors = createTestBehaviors();
      await collector.addBehaviors(behaviors);
      
      const result = await collector.getBehaviors('test_user', 'test_tenant');
      expect(result.length).toBe(behaviors.length);
    });

    it('应该支持limit参数', async () => {
      await collector.addBehaviors(createTestBehaviors());
      const result = await collector.getBehaviors('test_user', 'test_tenant', { limit: 1 });
      expect(result.length).toBe(1);
    });

    it('应该支持类型筛选', async () => {
      await collector.addBehaviors(createTestBehaviors());
      const result = await collector.getBehaviors('test_user', 'test_tenant', { type: 'chat' });
      expect(result.every(b => b.type === 'chat')).toBe(true);
    });
  });

  describe('deleteBehavior', () => {
    it('应该删除指定行为', async () => {
      const behaviors = createTestBehaviors();
      await collector.addBehaviors(behaviors);
      
      const idToDelete = behaviors[0].id;
      const deleted = await collector.deleteBehavior(idToDelete, 'test_user', 'test_tenant');
      
      expect(deleted).toBe(true);
    });
  });
});

// ==================== TraitExtractor 测试 ====================

describe('TraitExtractor', () => {
  let extractor: TraitExtractor;

  beforeEach(() => {
    extractor = new TraitExtractor();
  });

  describe('extract', () => {
    it('应该提取外向/内向特质', () => {
      const traits = extractor.extract('我喜欢团队讨论和交流');
      expect(traits.length).toBeGreaterThan(0);
      expect(traits.some(t => t.type === TraitType.EXTRAVERSION_INTROVERSION)).toBe(true);
    });

    it('应该提取理性/感性特质', () => {
      const traits = extractor.extract('根据数据分析，这个方案是合理的');
      expect(traits.some(t => t.type === TraitType.RATIONALITY_EMOTION)).toBe(true);
    });
  });

  describe('extractBatch', () => {
    it('应该批量提取特质并合并', () => {
      const contents = [
        '我喜欢团队讨论',
        '我喜欢和同事交流'
      ];
      const traits = extractor.extractBatch(contents);
      expect(Array.isArray(traits)).toBe(true);
    });
  });
});

// ==================== CommunicationStyleExtractor 测试 ====================

describe('CommunicationStyleExtractor', () => {
  let extractor: CommunicationStyleExtractor;

  beforeEach(() => {
    extractor = new CommunicationStyleExtractor();
  });

  describe('extract', () => {
    it('应该提取沟通风格', async () => {
      const contents = [
        '请您提供详细的数据分析报告',
        '根据规定我们需要按照标准流程执行'
      ];
      const traits = await extractor.extract(contents);
      expect(Array.isArray(traits)).toBe(true);
    });
  });

  describe('analyzeSingle', () => {
    it('应该分析单条内容', () => {
      const result = extractor.analyzeSingle('请您确认这个方案是否符合规范');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ==================== DecisionStyleExtractor 测试 ====================

describe('DecisionStyleExtractor', () => {
  let extractor: DecisionStyleExtractor;

  beforeEach(() => {
    extractor = new DecisionStyleExtractor();
  });

  describe('extract', () => {
    it('应该提取决策风格', async () => {
      const contents = [
        '我需要再考虑一下',
        '让我权衡一下各种因素'
      ];
      const traits = await extractor.extract(contents);
      expect(Array.isArray(traits)).toBe(true);
    });
  });

  describe('identifyDecisionSignals', () => {
    it('应该识别决策信号', () => {
      const result = extractor.identifyDecisionSignals('我需要决定是否采用这个方案');
      expect(result.isDecision).toBe(true);
    });
  });
});

// ==================== LearningStyleExtractor 测试 ====================

describe('LearningStyleExtractor', () => {
  let extractor: LearningStyleExtractor;

  beforeEach(() => {
    extractor = new LearningStyleExtractor();
  });

  describe('extract', () => {
    it('应该提取学习偏好', async () => {
      const contents = [
        '我喜欢看视频教程学习',
        '通过实际操作我能更快掌握'
      ];
      const traits = await extractor.extract(contents);
      expect(Array.isArray(traits)).toBe(true);
    });
  });

  describe('identifyLearningSignals', () => {
    it('应该识别学习信号', () => {
      const result = extractor.identifyLearningSignals('我想学习如何使用这个工具');
      expect(result.isLearning).toBe(true);
    });
  });
});

// ==================== PersonalityValidator 测试 ====================

describe('PersonalityValidator', () => {
  let validator: PersonalityValidator;

  beforeEach(() => {
    validator = new PersonalityValidator();
  });

  describe('validate', () => {
    it('应该验证人格一致性', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      
      const result = await validator.validate(profile, behaviors);
      expect(result).toBeDefined();
      expect(result.isValid !== undefined).toBe(true);
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('quickValidate', () => {
    it('应该快速验证人格约束', () => {
      const profile = createTestProfile();
      const isValid = validator.quickValidate(profile);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('generateReport', () => {
    it('应该生成验证报告', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      const result = await validator.validate(profile, behaviors);
      
      const report = validator.generateReport(result);
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });
});

// ==================== TraitConstraintChecker 测试 ====================

describe('TraitConstraintChecker', () => {
  let checker: TraitConstraintChecker;

  beforeEach(() => {
    checker = new TraitConstraintChecker();
  });

  describe('checkConstraint', () => {
    it('应该检查有效范围内的特质值', () => {
      const result = checker.checkConstraint(TraitType.EXTRAVERSION_INTROVERSION, 0.7);
      expect(result.satisfied).toBe(true);
    });

    it('应该拒绝超出范围的特质值', () => {
      const result = checker.checkConstraint(TraitType.EXTRAVERSION_INTROVERSION, 1.5);
      expect(result.satisfied).toBe(false);
    });
  });

  describe('quickCheck', () => {
    it('应该快速检查画像约束', () => {
      const profile = createTestProfile();
      const violations = checker.quickCheck(profile);
      expect(Array.isArray(violations)).toBe(true);
    });
  });
});

// ==================== PersonalitySnapshotManager 测试 ====================

describe('PersonalitySnapshotManager', () => {
  let manager: PersonalitySnapshotManager;

  beforeEach(() => {
    manager = new PersonalitySnapshotManager();
  });

  describe('createSnapshot', () => {
    it('应该创建完整快照', async () => {
      const profile = createTestProfile();
      const snapshot = await manager.createSnapshot(profile, 'full');
      
      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^snapshot_/);
      expect(snapshot.type).toBe('full');
    });

    it('应该创建增量快照', async () => {
      const profile = createTestProfile();
      const snapshot = await manager.createSnapshot(profile, 'incremental', ['test']);
      
      expect(snapshot.type).toBe('incremental');
      expect(snapshot.tags).toContain('test');
    });

    it('应该创建里程碑快照', async () => {
      const profile = createTestProfile();
      const snapshot = await manager.createSnapshot(profile, 'milestone');
      
      expect(snapshot.type).toBe('milestone');
    });
  });

  describe('getSnapshots', () => {
    it('应该获取快照列表', async () => {
      const profile = createTestProfile();
      await manager.createSnapshot(profile, 'full');
      await manager.createSnapshot(profile, 'incremental');
      
      const snapshots = await manager.getSnapshots('test_user', 'test_tenant');
      expect(snapshots.length).toBe(2);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应该从快照恢复画像', async () => {
      const profile = createTestProfile();
      const snapshot = await manager.createSnapshot(profile, 'full');
      
      const restored = await manager.restoreFromSnapshot(snapshot);
      
      expect(restored).toBeDefined();
      expect(restored.userId).toBe(profile.userId);
    });
  });
});

// ==================== PersonalityReporter 测试 ====================

describe('PersonalityReporter', () => {
  let reporter: PersonalityReporter;

  beforeEach(() => {
    reporter = new PersonalityReporter();
  });

  describe('generateReport', () => {
    it('应该生成概要报告', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      
      const report = await reporter.generateReport(profile, behaviors, 'summary');
      
      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^report_/);
      expect(report.type).toBe('summary');
      expect(report.content.summary).toBeDefined();
    });

    it('应该生成详细报告', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      
      const report = await reporter.generateReport(profile, behaviors, 'detailed');
      
      expect(report.suggestions).toBeDefined();
      expect(Array.isArray(report.suggestions)).toBe(true);
    });
  });

  describe('exportAsText', () => {
    it('应该导出为文本格式', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      const report = await reporter.generateReport(profile, behaviors, 'summary');
      
      const text = reporter.exportAsText(report);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('exportAsJSON', () => {
    it('应该导出为JSON格式', async () => {
      const profile = createTestProfile();
      const behaviors = createTestBehaviors();
      const report = await reporter.generateReport(profile, behaviors, 'summary');
      
      const json = reporter.exportAsJSON(report);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
