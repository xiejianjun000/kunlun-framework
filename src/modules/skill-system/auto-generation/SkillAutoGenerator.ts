/**
 * SkillAutoGenerator - 技能自动生成器
 * 
 * 核心功能：
 * - 分析任务执行轨迹
 * - 提取成功模式（使用LLM）
 * - 生成标准SKILL.md文件
 * - 注册到SkillRegistry
 */

import {
  TaskTrajectory,
  SkillPattern,
  SkillDefinition,
  GeneratorConfig,
  GenerationResult,
  DEFAULT_GENERATOR_CONFIG,
  SkillGenerationEvent,
} from './types';
import { TaskPatternAnalyzer } from './TaskPatternAnalyzer';
import { SkillEvolutionTracker } from './SkillEvolutionTracker';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export class SkillAutoGenerator extends EventEmitter {
  private config: GeneratorConfig;
  private analyzer: TaskPatternAnalyzer;
  private tracker: SkillEvolutionTracker;
  private llmClient: LLMClient | null = null;
  private skillRegistry: SkillRegistry | null = null;

  constructor(config: Partial<GeneratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
    this.analyzer = new TaskPatternAnalyzer(this.config);
    this.tracker = new SkillEvolutionTracker();
  }

  /**
   * 设置LLM客户端
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * 设置技能注册表
   */
  setSkillRegistry(registry: SkillRegistry): void {
    this.skillRegistry = registry;
  }

  /**
   * 从任务轨迹生成技能
   */
  async generateFromTrajectory(trajectory: TaskTrajectory): Promise<GenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    this.emit('generation_started', { 
      type: 'generation_started', 
      taskId: trajectory.taskId, 
      timestamp: new Date() 
    });

    try {
      // 1. 模式分析
      const analysisResult = await this.analyzer.shouldGenerateSkill(trajectory);
      
      this.emit('analysis_completed', {
        type: 'analysis_completed',
        result: analysisResult,
        timestamp: new Date(),
      });

      if (!analysisResult.shouldGenerate) {
        return {
          success: false,
          errors: [analysisResult.reason],
          warnings: [],
          metadata: this.createMetadata(startTime, 0),
        };
      }

      // 2. 提取技能模式
      let pattern = await this.analyzer.analyzeTrajectory(trajectory);
      
      if (!pattern) {
        return {
          success: false,
          errors: ['Pattern extraction failed'],
          warnings: [],
          metadata: this.createMetadata(startTime, 0),
        };
      }

      // 3. 使用LLM优化模式（如果可用）
      if (this.llmClient) {
        pattern = await this.optimizeWithLLM(pattern, trajectory);
      }

      // 4. 生成SKILL.md定义
      const skill = this.generateSkillDefinition(pattern, trajectory);

      // 5. 保存技能文件
      await this.saveSkillFile(skill);

      this.emit('skill_generated', {
        type: 'skill_generated',
        skill,
        timestamp: new Date(),
      });

      // 6. 注册技能
      if (this.config.autoRegister && this.skillRegistry) {
        await this.skillRegistry.register(pattern);
        
        this.emit('skill_registered', {
          type: 'skill_registered',
          patternId: pattern.patternId,
          timestamp: new Date(),
        });
      }

      // 7. 记录进化
      await this.tracker.recordGeneration(pattern, trajectory);

      return {
        success: true,
        skill,
        pattern,
        errors: [],
        warnings,
        metadata: this.createMetadata(startTime, skill ? 1000 : 0),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      this.emit('generation_failed', {
        type: 'generation_failed',
        error: errorMessage,
        timestamp: new Date(),
      });

      return {
        success: false,
        errors,
        warnings,
        metadata: this.createMetadata(startTime, 0),
      };
    }
  }

  /**
   * 批量生成技能
   */
  async generateBatch(trajectories: TaskTrajectory[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    for (const trajectory of trajectories) {
      const result = await this.generateFromTrajectory(trajectory);
      results.push(result);
    }

    return results;
  }

  /**
   * 使用LLM优化模式
   */
  private async optimizeWithLLM(
    pattern: SkillPattern,
    trajectory: TaskTrajectory
  ): Promise<SkillPattern> {
    if (!this.llmClient) {
      return pattern;
    }

    const prompt = this.buildOptimizationPrompt(pattern, trajectory);

    try {
      const response = await this.llmClient.complete({
        prompt,
        temperature: 0.5,
        maxTokens: 2000,
      });

      // 解析LLM响应并更新模式
      return this.parseLLMOptimization(response, pattern);
    } catch (error) {
      console.warn('LLM optimization failed, using original pattern:', error);
      return pattern;
    }
  }

  /**
   * 构建优化提示词
   */
  private buildOptimizationPrompt(pattern: SkillPattern, trajectory: TaskTrajectory): string {
    return `
# 技能模式优化任务

你是一个技能工程师，需要优化以下技能模式，使其更加清晰、可复用。

## 当前模式
名称: ${pattern.name}
描述: ${pattern.description}
步骤数: ${pattern.steps.length}
置信度: ${pattern.confidence}

## 步骤详情
${pattern.steps.map(s => `${s.order}. ${s.description}`).join('\n')}

## 原始任务输入
${trajectory.taskInput}

## 原始任务输出摘要
${trajectory.taskOutput?.substring(0, 500) || 'N/A'}

## 任务要求
1. 优化技能名称，使其更简洁明了
2. 完善描述，清晰说明技能用途
3. 识别潜在的陷阱和注意事项
4. 提取通用触发词（中文）
5. 建议相关技能标签

请以JSON格式返回优化后的模式（只返回JSON，不要其他内容）：
{
  "name": "优化后的名称",
  "description": "优化后的描述",
  "triggers": ["触发词1", "触发词2"],
  "tags": ["标签1", "标签2"],
  "pitfalls": ["陷阱1", "陷阱2"],
  "notes": ["备注1", "备注2"]
}
`;
  }

  /**
   * 解析LLM优化结果
   */
  private parseLLMOptimization(
    response: string,
    original: SkillPattern
  ): SkillPattern {
    try {
      // 提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return original;
      }

      const optimized = JSON.parse(jsonMatch[0]);

      return {
        ...original,
        name: optimized.name || original.name,
        description: optimized.description || original.description,
        triggerConditions: [
          ...original.triggerConditions,
          ...(optimized.triggers || []).map((t: string) => ({
            type: 'keyword' as const,
            value: t,
            weight: 0.8,
          })),
        ],
        tags: [...new Set([...original.tags, ...(optimized.tags || [])])],
        pitfalls: [...new Set([...original.pitfalls, ...(optimized.pitfalls || [])])],
        updatedAt: new Date(),
      };
    } catch {
      return original;
    }
  }

  /**
   * 生成技能定义
   */
  private generateSkillDefinition(
    pattern: SkillPattern,
    trajectory: TaskTrajectory
  ): SkillDefinition {
    // 加载模板
    const template = this.loadTemplate();

    // 替换占位符
    const skill: SkillDefinition = {
      skillName: pattern.name,
      skillDescription: pattern.description,
      version: pattern.version,
      tags: pattern.tags,
      relatedSkills: pattern.relatedPatterns,
      patternId: pattern.patternId,
      confidence: pattern.confidence,
      sourceTaskId: trajectory.taskId,
      inputs: pattern.inputs.map(i => ({
        name: i.name,
        type: i.type,
        description: i.description,
        required: i.required,
      })),
      outputs: pattern.outputs.map(o => ({
        name: o.name,
        type: o.type,
        description: o.description,
      })),
      prerequisites: pattern.prerequisites,
      triggers: pattern.triggerConditions.map(t => t.value),
      whenToUse: `适用于${pattern.tags.join('、')}相关任务`,
      steps: this.formatSteps(pattern),
      examples: pattern.examples.join('\n'),
      pitfalls: pattern.pitfalls.join('\n'),
      verification: '验证任务是否按预期完成',
      notes: '此技能由OpenTaiji自动生成',
    };

    return skill;
  }

  /**
   * 加载模板
   */
  private loadTemplate(): string {
    const templatePath = path.resolve(this.config.templatePath);
    
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }

    // 返回默认模板
    return this.getDefaultTemplate();
  }

  /**
   * 获取默认模板
   */
  private getDefaultTemplate(): string {
    return `# {{skillName}}

## 描述
{{skillDescription}}

## 触发条件
{{#each triggers}}
- {{this}}
{{/each}}

## 步骤
{{steps}}

## 输入参数
{{#each inputs}}
- {{name}} ({{type}}): {{description}}
{{/each}}

## 输出
{{#each outputs}}
- {{name}} ({{type}}): {{description}}
{{/each}}

## 前置条件
{{#each prerequisites}}
- {{this}}
{{/each}}

## 注意事项
{{pitfalls}}

## 验证
{{verification}}

---
*自动生成 | 版本: {{version}} | 置信度: {{confidence}}*`;
  }

  /**
   * 格式化步骤
   */
  private formatSteps(pattern: SkillPattern): string {
    const lines: string[] = [];

    for (const step of pattern.steps) {
      let line = `${step.order}. ${step.description}`;
      
      if (step.toolName) {
        line += ` (使用 ${step.toolName})`;
      }
      
      if (step.expectedOutput) {
        line += `\n   预期输出: ${step.expectedOutput}`;
      }
      
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * 保存技能文件
   */
  private async saveSkillFile(skill: SkillDefinition): Promise<void> {
    const outputDir = path.resolve(this.config.outputDirectory);
    
    // 确保目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const fileName = `${this.sanitizeFileName(skill.skillName)}.md`;
    const filePath = path.join(outputDir, fileName);

    // 渲染模板
    const content = this.renderTemplate(skill);

    // 写入文件
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 渲染模板
   */
  private renderTemplate(skill: SkillDefinition): string {
    const template = this.loadTemplate();

    let content = template
      .replace(/\{\{skillName\}\}/g, skill.skillName)
      .replace(/\{\{skillDescription\}\}/g, skill.skillDescription)
      .replace(/\{\{version\}\}/g, skill.version)
      .replace(/\{\{confidence\}\}/g, (skill.confidence * 100).toFixed(0) + '%')
      .replace(/\{\{patternId\}\}/g, skill.patternId)
      .replace(/\{\{sourceTaskId\}\}/g, skill.sourceTaskId)
      .replace(/\{\{generatedAt\}\}/g, new Date().toISOString())
      .replace(/\{\{generatorVersion\}\}/g, '1.0.0');

    // 渲染数组字段
    content = content
      .replace(/\{\{tags\}\}/g, skill.tags.join(', '))
      .replace(/\{\{relatedSkills\}\}/g, skill.relatedSkills.join(', '));

    // 渲染步骤
    content = content.replace(/\{\{steps\}\}/g, skill.steps);

    // 渲染触发词
    content = content.replace(
      /\{\{#each triggers\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, inner) => skill.triggers.map(t => `- ${t}`).join('\n')
    );

    // 渲染输入
    content = content.replace(
      /\{\{#each inputs\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, inner) => skill.inputs.map(i => 
        `- ${i.name} (${i.type}): ${i.description}`
      ).join('\n')
    );

    // 渲染输出
    content = content.replace(
      /\{\{#each outputs\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, inner) => skill.outputs.map(o => 
        `- ${o.name} (${o.type}): ${o.description}`
      ).join('\n')
    );

    // 渲染前置条件
    content = content.replace(
      /\{\{#each prerequisites\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, inner) => skill.prerequisites.map(p => `- ${p}`).join('\n')
    );

    // 渲染其他字段
    content = content.replace(/\{\{whenToUse\}\}/g, skill.whenToUse || '');
    content = content.replace(/\{\{examples\}\}/g, skill.examples || '');
    content = content.replace(/\{\{pitfalls\}\}/g, skill.pitfalls || '');
    content = content.replace(/\{\{verification\}\}/g, skill.verification || '');
    content = content.replace(/\{\{notes\}\}/g, skill.notes || '');

    return content;
  }

  /**
   * 创建元数据
   */
  private createMetadata(startTime: number, tokensUsed: number) {
    return {
      generatedAt: new Date(),
      generatorVersion: '1.0.0',
      processingTime: Date.now() - startTime,
      tokensUsed,
    };
  }

  /**
   * 获取生成统计
   */
  async getStatistics(): Promise<GenerationStatistics> {
    return this.tracker.getStatistics();
  }
}

// ============ 类型定义 ============

export interface LLMClient {
  complete(options: {
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string>;
}

export interface SkillRegistry {
  register(pattern: SkillPattern): Promise<void>;
  unregister(patternId: string): Promise<void>;
  findSimilar(query: string): Promise<SkillPattern[]>;
}

export interface GenerationStatistics {
  totalPatterns: number;
  totalUsages: number;
  overallSuccessRate: number;
  patternsByDomain: Record<string, number>;
  topPatterns: Array<{ patternId: string; usageCount: number }>;
}

export default SkillAutoGenerator;
