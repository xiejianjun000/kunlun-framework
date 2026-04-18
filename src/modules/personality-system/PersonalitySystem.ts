/**
 * PersonalitySystem.ts
 * 人格系统主类实现
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IPersonalitySystem,
  IPersonalityProfile,
  BehaviorData,
  BehaviorAnalysisResult,
  PersonalitySnapshot,
  PersonalityReport,
  PersonalitySystemConfig,
  PersonalitySystemEvent,
  PrivacySettings,
  ProfileEvolution,
  ExtractedTrait,
  PersonalityDimension,
  TraitType,
  PersonalityDimensions,
  DecisionStyle,
  InformationProcessingStyle
} from '../../core/interfaces/IPersonalitySystem';

import { PersonalityModel } from './PersonalityModel';
import { PersonalityDistiller } from './PersonalityDistiller';
import { PersonalityUpdater } from './PersonalityUpdater';
import { BehaviorCollector } from './behavior/BehaviorCollector';
import { BehaviorAnalyzer } from './behavior/BehaviorAnalyzer';
import { PersonalityValidator } from './validation/PersonalityValidator';
import { PersonalitySnapshotManager } from './snapshot/PersonalitySnapshot';
import { PersonalityReporter } from './snapshot/PersonalityReporter';

import { DatabaseAdapter } from '../../adapters/storage/DatabaseAdapter';
import { VectorDbAdapter } from '../../adapters/vector-db/VectorDbAdapter';

/**
 * 人格系统配置默认值
 */
const DEFAULT_CONFIG: Partial<PersonalitySystemConfig> = {
  confidenceThreshold: 0.7,
  maxEvidenceCount: 100,
  updateFrequencyLimit: 3600000, // 1小时
  enableSnapshot: true,
  snapshotRetentionDays: 90
};

/**
 * 默认隐私设置
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  noDistillTopics: [],
  distillLevel: 'standard'
};

/**
 * 默认五维画像维度
 */
const DEFAULT_DIMENSIONS: PersonalityDimensions = {
  personality: {
    dimensions: {
      [TraitType.EXTRAVERSION_INTROVERSION]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.OPENNESS_CONSERVATISM]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.RATIONALITY_EMOTION]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.RISK_TOLERANCE]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.DECISION_STYLE]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.INFORMATION_PROCESSING]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.AUTHORITY_ORIENTATION]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.CAUSALITY_BELIEF]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.SYSTEM_COMPLEXITY]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      [TraitType.TEMPORAL_ORIENTATION]: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      }
    },
    stableTraits: []
  },
  perspective: {
    dimensions: {
      decisionStyle: {
        value: DecisionStyle.DELIBERATE,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      informationProcessing: {
        value: InformationProcessingStyle.SYSTEMATIC,
        label: '中立',
        confidence: 0,
        evidence: []
      },
      authorityOrientation: {
        value: 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      }
    },
    preferredFormats: [],
    avoidFormats: []
  },
  worldview: {
    dimensions: {
      causalityBelief: {
        value: 'evidence_based',
        label: '中立',
        confidence: 0,
        evidence: []
      },
      systemComplexity: {
        value: 'medium',
        label: '中立',
        confidence: 0,
        evidence: []
      },
      temporalOrientation: {
        value: 'medium_term',
        label: '中立',
        confidence: 0,
        evidence: []
      }
    },
    coreBeliefs: []
  },
  values: {
    valueHierarchy: {},
    bottomLinePrinciples: [],
    tradeOffPatterns: {},
    confidence: 0
  },
  lifePhilosophy: {
    dimensions: {
      goalOrientation: {
        primaryGoals: [],
        confidence: 0
      },
      timeValue: {
        value: 'medium',
        label: '中立',
        confidence: 0,
        evidence: []
      },
      meaningPursuit: {
        value: 'competence_mastery',
        label: '中立',
        confidence: 0,
        evidence: []
      },
      workStyle: {
        collaborationPreference: 'balanced',
        autonomyNeed: 'medium',
        feedbackFrequency: 'as_needed'
      }
    },
    confidence: 0
  }
};

/**
 * 人格系统主类
 * 
 * 实现IPersonalitySystem接口负责人格数据的全生命周期管理
 * 
 * @example
 * ```typescript
 * const personalitySystem = new PersonalitySystem();
 * await personalitySystem.initialize(config);
 * 
 * // 添加行为数据
 * await personalitySystem.addBehavior({
 *   id: uuidv4(),
 *   userId: 'user_123',
 *   tenantId: 'tenant_abc',
 *   type: 'chat',
 *   content: '我更喜欢详细的数据分析报告',
 *   timestamp: new Date()
 * });
 * 
 * // 分析行为
 * const analysis = await personalitySystem.analyzeBehaviors('user_123', 'tenant_abc');
 * 
 * // 生成报告
 * const report = await personalitySystem.generateReport('user_123', 'tenant_abc', 'summary');
 * ```
 */
export class PersonalitySystem extends EventEmitter implements IPersonalitySystem {
  /** 系统配置 */
  private config: PersonalitySystemConfig;
  
  /** 数据库适配器 */
  private dbAdapter: DatabaseAdapter | null = null;
  
  /** 向量数据库适配器 */
  private vectorDbAdapter: VectorDbAdapter | null = null;
  
  /** 人格模型缓存（userId -> PersonalityModel） */
  private modelCache: Map<string, PersonalityModel> = new Map();
  
  /** 人格蒸馏器 */
  private distiller: PersonalityDistiller;
  
  /** 人格更新器 */
  private updater: PersonalityUpdater;
  
  /** 行为收集器 */
  private behaviorCollector: BehaviorCollector;
  
  /** 行为分析器 */
  private behaviorAnalyzer: BehaviorAnalyzer;
  
  /** 人格验证器 */
  private validator: PersonalityValidator;
  
  /** 快照管理器 */
  private snapshotManager: PersonalitySnapshotManager;
  
  /** 报告生成器 */
  private reporter: PersonalityReporter;
  
  /** 最后更新时间记录（userId -> timestamp） */
  private lastUpdateTimes: Map<string, number> = new Map();
  
  /** 初始化状态 */
  private initialized: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    super();
    
    this.config = {} as PersonalitySystemConfig;
    this.distiller = new PersonalityDistiller();
    this.updater = new PersonalityUpdater();
    this.behaviorCollector = new BehaviorCollector();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
    this.validator = new PersonalityValidator();
    this.snapshotManager = new PersonalitySnapshotManager();
    this.reporter = new PersonalityReporter();
  }

  /**
   * 初始化人格系统
   * @param config 系统配置
   */
  async initialize(config: PersonalitySystemConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('PersonalitySystem has already been initialized');
    }

    // 合并配置
    this.config = {
      ...DEFAULT_CONFIG as PersonalitySystemConfig,
      ...config
    };

    // 初始化适配器
    if (this.config.databaseAdapter) {
      this.dbAdapter = this.config.databaseAdapter;
      await this.dbAdapter!.initialize();
    }

    if (this.config.vectorDbAdapter) {
      this.vectorDbAdapter = this.config.vectorDbAdapter;
      await this.vectorDbAdapter!.initialize();
    }

    // 初始化子模块
    this.behaviorCollector.initialize(this.config);
    this.behaviorAnalyzer.initialize(this.config);
    this.validator.initialize(this.config);
    this.snapshotManager.initialize(this.config);

    this.initialized = true;
    console.log('[PersonalitySystem] Initialized successfully');
  }

  /**
   * 获取缓存键
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  private getCacheKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 获取用户人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getPersonalityProfile(
    userId: string,
    tenantId: string
  ): Promise<IPersonalityProfile | null> {
    this.ensureInitialized();

    const cacheKey = this.getCacheKey(userId, tenantId);
    
    // 先从缓存获取
    const cachedModel = this.modelCache.get(cacheKey);
    if (cachedModel) {
      return cachedModel.getProfile();
    }

    // 从数据库获取
    if (this.dbAdapter) {
      const profile = await this.dbAdapter.getPersonalityProfile(userId, tenantId);
      if (profile) {
        const model = new PersonalityModel(profile);
        this.modelCache.set(cacheKey, model);
        return profile;
      }
    }

    return null;
  }

  /**
   * 创建新的人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param initialData 初始数据
   */
  async createPersonalityProfile(
    userId: string,
    tenantId: string,
    initialData?: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile> {
    this.ensureInitialized();

    // 检查是否已存在
    const existing = await this.getPersonalityProfile(userId, tenantId);
    if (existing) {
      throw new Error(`Personality profile already exists for user ${userId}`);
    }

    const now = new Date();
    const profile: IPersonalityProfile = {
      profileId: `profile_${uuidv4()}`,
      userId,
      tenantId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      confidenceScore: 0,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      dimensions: JSON.parse(JSON.stringify(DEFAULT_DIMENSIONS)),
      stableTraits: [],
      evolutionHistory: [
        {
          version: 1,
          timestamp: now,
          trigger: 'initial_creation',
          changes: { initial: true }
        }
      ],
      ...initialData
    };

    // 保存到数据库
    if (this.dbAdapter) {
      await this.dbAdapter.savePersonalityProfile(profile);
    }

    // 保存到向量数据库用于相似度搜索
    if (this.vectorDbAdapter) {
      await this.vectorDbAdapter.upsertPersonalityProfile(profile);
    }

    // 缓存
    const model = new PersonalityModel(profile);
    const cacheKey = this.getCacheKey(userId, tenantId);
    this.modelCache.set(cacheKey, model);

    // 创建初始快照
    if (this.config.enableSnapshot) {
      await this.snapshotManager.createSnapshot(profile, 'full', ['initial']);
    }

    this.emit(PersonalitySystemEvent.PERSONALITY_UPDATED, { userId, tenantId, profile });

    return profile;
  }

  /**
   * 更新人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param updates 更新内容
   */
  async updatePersonalityProfile(
    userId: string,
    tenantId: string,
    updates: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile> {
    this.ensureInitialized();

    // 检查更新频率限制
    const cacheKey = this.getCacheKey(userId, tenantId);
    const lastUpdate = this.lastUpdateTimes.get(cacheKey);
    if (lastUpdate) {
      const elapsed = Date.now() - lastUpdate;
      if (elapsed < this.config.updateFrequencyLimit) {
        throw new Error(
          `Update frequency limit exceeded. Please wait ${Math.ceil((this.config.updateFrequencyLimit - elapsed) / 1000)} seconds`
        );
      }
    }

    // 获取当前画像
    const currentProfile = await this.getPersonalityProfile(userId, tenantId);
    if (!currentProfile) {
      throw new Error(`No personality profile found for user ${userId}`);
    }

    // 使用更新器执行增量更新
    const updatedProfile = await this.updater.performIncrementalUpdate(currentProfile, updates);

    // 保存更新
    if (this.dbAdapter) {
      await this.dbAdapter.savePersonalityProfile(updatedProfile);
    }

    // 更新向量数据库
    if (this.vectorDbAdapter) {
      await this.vectorDbAdapter.upsertPersonalityProfile(updatedProfile);
    }

    // 更新缓存
    const model = this.modelCache.get(cacheKey);
    if (model) {
      model.updateProfile(updatedProfile);
    } else {
      this.modelCache.set(cacheKey, new PersonalityModel(updatedProfile));
    }

    // 更新最后更新时间
    this.lastUpdateTimes.set(cacheKey, Date.now());

    this.emit(PersonalitySystemEvent.PERSONALITY_UPDATED, { userId, tenantId, profile: updatedProfile });

    return updatedProfile;
  }

  /**
   * 添加行为数据
   * @param behavior 行为数据
   */
  async addBehavior(behavior: BehaviorData): Promise<void> {
    this.ensureInitialized();
    
    await this.behaviorCollector.addBehavior(behavior);

    // 保存到数据库
    if (this.dbAdapter) {
      await this.dbAdapter.saveBehavior(behavior);
    }

    // 保存到向量数据库用于语义搜索
    if (this.vectorDbAdapter) {
      await this.vectorDbAdapter.upsertBehavior(behavior);
    }
  }

  /**
   * 批量添加行为数据
   * @param behaviors 行为数据列表
   */
  async addBehaviors(behaviors: BehaviorData[]): Promise<void> {
    this.ensureInitialized();

    for (const behavior of behaviors) {
      await this.addBehavior(behavior);
    }
  }

  /**
   * 分析行为数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async analyzeBehaviors(userId: string, tenantId: string): Promise<BehaviorAnalysisResult> {
    this.ensureInitialized();

    // 收集行为数据
    const behaviors = await this.behaviorCollector.getBehaviors(userId, tenantId);
    
    if (behaviors.length === 0) {
      return {
        id: `analysis_${uuidv4()}`,
        userId,
        analyzedAt: new Date(),
        patterns: [],
        extractedTraits: [],
        confidence: 0
      };
    }

    // 分析行为模式
    const patterns = await this.behaviorAnalyzer.analyzePatterns(behaviors);

    // 提取特质
    const traits = await this.distiller.distillTraits(behaviors, userId);

    const result: BehaviorAnalysisResult = {
      id: `analysis_${uuidv4()}`,
      userId,
      analyzedAt: new Date(),
      patterns: patterns.map(p => ({
        patternId: p.id,
        type: p.type,
        description: p.description,
        frequency: p.frequency,
        relatedBehaviorIds: p.relatedBehaviorIds,
        confidence: p.confidence
      })),
      extractedTraits: traits,
      confidence: traits.length > 0 
        ? traits.reduce((sum, t) => sum + t.confidence, 0) / traits.length 
        : 0
    };

    // 如果置信度达标，更新人格画像
    if (result.confidence >= this.config.confidenceThreshold) {
      try {
        await this.updatePersonalityFromAnalysis(userId, tenantId, result);
      } catch (error) {
        console.error('[PersonalitySystem] Failed to update personality:', error);
      }
    }

    this.emit(PersonalitySystemEvent.PATTERN_DETECTED, { userId, tenantId, patterns });

    return result;
  }

  /**
   * 从分析结果更新人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param analysis 分析结果
   */
  private async updatePersonalityFromAnalysis(
    userId: string,
    tenantId: string,
    analysis: BehaviorAnalysisResult
  ): Promise<void> {
    const profile = await this.getPersonalityProfile(userId, tenantId);
    if (!profile) {
      // 如果没有画像，先创建
      await this.createPersonalityProfile(userId, tenantId);
    }

    // 使用蒸馏器更新画像
    const newDimensions = this.convertTraitsToDimensions(analysis.extractedTraits);
    const updatedProfile = await this.updater.performIncrementalUpdate(
      profile!,
      { dimensions: newDimensions as PersonalityDimensions }
    );

    await this.updatePersonalityProfile(userId, tenantId, updatedProfile);

    // 触发特质提取事件
    this.emit(PersonalitySystemEvent.TRAIT_EXTRACTED, {
      userId,
      tenantId,
      traits: analysis.extractedTraits
    });
  }

  /**
   * 将特质转换为维度数据
   * @param traits 特质列表
   */
  private convertTraitsToDimensions(traits: ExtractedTrait[]): Partial<PersonalityDimensions> {
    const dimensions: Partial<PersonalityDimensions> = {
      personality: {
        dimensions: {} as any,
        stableTraits: []
      },
      perspective: {
        dimensions: {} as any,
        preferredFormats: [],
        avoidFormats: []
      },
      worldview: {
        dimensions: {} as any,
        coreBeliefs: []
      },
      values: {
        valueHierarchy: {},
        bottomLinePrinciples: [],
        tradeOffPatterns: {},
        confidence: 0
      },
      lifePhilosophy: {
        dimensions: {} as any,
        confidence: 0
      }
    };

    for (const trait of traits) {
      // 人格特质
      if (trait.type === TraitType.EXTRAVERSION_INTROVERSION ||
          trait.type === TraitType.OPENNESS_CONSERVATISM ||
          trait.type === TraitType.RATIONALITY_EMOTION ||
          trait.type === TraitType.RISK_TOLERANCE) {
        dimensions.personality!.dimensions[trait.type] = {
          value: trait.value as number,
          label: trait.label,
          confidence: trait.confidence,
          evidence: trait.evidence
        };
      }

      // 视角特质
      if (trait.type === TraitType.DECISION_STYLE) {
        dimensions.perspective!.dimensions.decisionStyle = {
          value: trait.value as any,
          label: trait.label,
          confidence: trait.confidence,
          evidence: trait.evidence
        };
      }
      if (trait.type === TraitType.INFORMATION_PROCESSING) {
        dimensions.perspective!.dimensions.informationProcessing = {
          value: trait.value as any,
          label: trait.label,
          confidence: trait.confidence,
          evidence: trait.evidence
        };
      }
      if (trait.type === TraitType.AUTHORITY_ORIENTATION) {
        dimensions.perspective!.dimensions.authorityOrientation = {
          value: trait.value as number,
          label: trait.label,
          confidence: trait.confidence,
          evidence: trait.evidence
        };
      }
    }

    return dimensions;
  }

  /**
   * 提取人格特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async extractTraits(userId: string, tenantId: string): Promise<ExtractedTrait[]> {
    this.ensureInitialized();

    const behaviors = await this.behaviorCollector.getBehaviors(userId, tenantId);
    return this.distiller.distillTraits(behaviors, userId);
  }

  /**
   * 验证人格一致性
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async validatePersonality(userId: string, tenantId: string): Promise<boolean> {
    this.ensureInitialized();

    const profile = await this.getPersonalityProfile(userId, tenantId);
    if (!profile) {
      return false;
    }

    const behaviors = await this.behaviorCollector.getBehaviors(userId, tenantId);
    const validationResult = await this.validator.validate(profile, behaviors);

    if (!validationResult.isValid) {
      this.emit(PersonalitySystemEvent.VALIDATION_FAILED, {
        userId,
        tenantId,
        violations: validationResult.violations
      });
    }

    return validationResult.isValid;
  }

  /**
   * 创建人格快照
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param type 快照类型
   * @param tags 标签
   */
  async createSnapshot(
    userId: string,
    tenantId: string,
    type: 'full' | 'incremental' | 'milestone',
    tags?: string[]
  ): Promise<PersonalitySnapshot> {
    this.ensureInitialized();

    const profile = await this.getPersonalityProfile(userId, tenantId);
    if (!profile) {
      throw new Error(`No personality profile found for user ${userId}`);
    }

    const snapshot = await this.snapshotManager.createSnapshot(profile, type, tags);

    this.emit(PersonalitySystemEvent.SNAPSHOT_CREATED, {
      userId,
      tenantId,
      snapshot
    });

    return snapshot;
  }

  /**
   * 获取人格快照
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param snapshotId 快照ID
   */
  async getSnapshot(
    userId: string,
    tenantId: string,
    snapshotId: string
  ): Promise<PersonalitySnapshot | null> {
    this.ensureInitialized();
    return this.snapshotManager.getSnapshot(userId, tenantId, snapshotId);
  }

  /**
   * 生成人格报告
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param type 报告类型
   */
  async generateReport(
    userId: string,
    tenantId: string,
    type: 'summary' | 'detailed' | 'comparison'
  ): Promise<PersonalityReport> {
    this.ensureInitialized();

    const profile = await this.getPersonalityProfile(userId, tenantId);
    if (!profile) {
      throw new Error(`No personality profile found for user ${userId}`);
    }

    const behaviors = await this.behaviorCollector.getBehaviors(userId, tenantId);
    return this.reporter.generateReport(profile, behaviors, type);
  }

  /**
   * 获取演变历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getEvolutionHistory(userId: string, tenantId: string): Promise<ProfileEvolution[]> {
    this.ensureInitialized();

    const profile = await this.getPersonalityProfile(userId, tenantId);
    return profile?.evolutionHistory || [];
  }

  /**
   * 导出人格数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async exportPersonalityData(userId: string, tenantId: string): Promise<Record<string, any>> {
    this.ensureInitialized();

    const profile = await this.getPersonalityProfile(userId, tenantId);
    if (!profile) {
      throw new Error(`No personality profile found for user ${userId}`);
    }

    const behaviors = await this.behaviorCollector.getBehaviors(userId, tenantId);
    const snapshots = await this.snapshotManager.getSnapshots(userId, tenantId);

    return {
      profile,
      behaviors: behaviors.map(b => ({
        id: b.id,
        type: b.type,
        content: b.content,
        timestamp: b.timestamp
      })),
      snapshots: snapshots.map(s => ({
        snapshotId: s.snapshotId,
        type: s.type,
        createdAt: s.createdAt,
        tags: s.tags
      })),
      exportTime: new Date().toISOString()
    };
  }

  /**
   * 销毁人格系统
   */
  async destroy(): Promise<void> {
    // 清理缓存
    this.modelCache.clear();
    this.lastUpdateTimes.clear();

    // 关闭适配器
    if (this.dbAdapter) {
      await this.dbAdapter.close();
    }
    if (this.vectorDbAdapter) {
      await this.vectorDbAdapter.close();
    }

    // 移除所有监听器
    this.removeAllListeners();

    this.initialized = false;
    console.log('[PersonalitySystem] Destroyed successfully');
  }

  /**
   * 确保系统已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PersonalitySystem has not been initialized. Call initialize() first.');
    }
  }
}

export default PersonalitySystem;
