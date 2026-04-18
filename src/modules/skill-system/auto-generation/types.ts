/**
 * OpenTaiji Auto Skill Generation Types
 * 
 * OpenTaiji技能自进化系统的类型定义
 */

// ============ 核心轨迹数据 ============

export interface TaskTrajectory {
  trajectoryId: string;
  taskId: string;
  taskInput: string;
  taskOutput: string;
  toolCalls: ToolCall[];
  success: boolean;
  reward: number;
  tokenUsage: number;
  executionTime: number;
  metadata: TaskMetadata;
  createdAt: Date;
}

export interface ToolCall {
  toolId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
  duration: number;
  tokens?: number;
  error?: string;
}

export interface TaskMetadata {
  domain: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  tags: string[];
  userId?: string;
  sessionId?: string;
}

// ============ 技能模式 ============

export interface SkillPattern {
  patternId: string;
  name: string;
  description: string;
  triggerConditions: TriggerCondition[];
  steps: PatternStep[];
  inputs: PatternInput[];
  outputs: PatternOutput[];
  examples: string[];
  pitfalls: string[];
  prerequisites: string[];
  estimatedComplexity: number;
  frequencyScore: number;
  confidence: number;
  tags: string[];
  relatedPatterns: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerCondition {
  type: 'keyword' | 'pattern' | 'semantic' | 'context';
  value: string;
  weight: number;
}

export interface PatternStep {
  stepId: string;
  order: number;
  description: string;
  toolName?: string;
  command?: string;
  conditions?: string[];
  expectedOutput?: string;
}

export interface PatternInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface PatternOutput {
  name: string;
  type: string;
  description: string;
}

// ============ SKILL.md 结构 ============

export interface SkillDefinition {
  skillName: string;
  skillDescription: string;
  version: string;
  tags: string[];
  relatedSkills: string[];
  patternId: string;
  confidence: number;
  sourceTaskId: string;
  inputs: SkillInput[];
  outputs: SkillOutput[];
  prerequisites: string[];
  triggers: string[];
  whenToUse?: string;
  steps: string;
  examples?: string;
  pitfalls?: string;
  verification?: string;
  notes?: string;
}

export interface SkillInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

// ============ 进化追踪 ============

export interface EvolutionRecord {
  recordId: string;
  patternId: string;
  version: string;
  triggerType: 'usage' | 'feedback' | 'manual' | 'auto';
  changes: EvolutionChange[];
  success: boolean;
  metricsBefore: EvolutionMetrics;
  metricsAfter: EvolutionMetrics;
  createdAt: Date;
}

export interface EvolutionChange {
  type: 'add' | 'remove' | 'modify' | 'reorder';
  location: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
}

export interface EvolutionMetrics {
  successRate: number;
  avgExecutionTime: number;
  userSatisfaction: number;
  tokenUsage: number;
}

// ============ 生成器配置 ============

export interface GeneratorConfig {
  enabled: boolean;
  minToolCalls: number;
  minSuccessRate: number;
  confidenceThreshold: number;
  maxPatternsPerDomain: number;
  evolutionEnabled: boolean;
  autoRegister: boolean;
  outputDirectory: string;
  templatePath: string;
}

export interface GenerationResult {
  success: boolean;
  skill?: SkillDefinition;
  pattern?: SkillPattern;
  errors: string[];
  warnings: string[];
  metadata: {
    generatedAt: Date;
    generatorVersion: string;
    processingTime: number;
    tokensUsed: number;
  };
}

// ============ 分析结果 ============

export interface PatternAnalysisResult {
  shouldGenerate: boolean;
  confidence: number;
  reason: string;
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedTriggers?: string[];
  suggestedTags?: string[];
  estimatedFrequency: number;
  estimatedComplexity: number;
  similarPatterns?: string[];
}

export interface LLMAnalysisPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

// ============ 事件类型 ============

export type SkillGenerationEvent = 
  | { type: 'generation_started'; taskId: string; timestamp: Date }
  | { type: 'analysis_completed'; result: PatternAnalysisResult; timestamp: Date }
  | { type: 'skill_generated'; skill: SkillDefinition; timestamp: Date }
  | { type: 'skill_registered'; patternId: string; timestamp: Date }
  | { type: 'generation_failed'; error: string; timestamp: Date };

// ============ 默认配置 ============

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  enabled: true,
  minToolCalls: 3,
  minSuccessRate: 0.8,
  confidenceThreshold: 0.6,
  maxPatternsPerDomain: 50,
  evolutionEnabled: true,
  autoRegister: true,
  outputDirectory: './skills/generated',
  templatePath: './templates/SKILL.md.hbs',
};
