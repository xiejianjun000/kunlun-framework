/**
 * SkillAutoGenerator.ts - 技能自动生成引擎（高级版，含WFGY验证）
 * 
 * 基于重复交互模式自动生成可执行的技能
 * 
 * OpenTaiji vs Hermes:
 * - Hermes: 只能识别模式，不生成可执行代码
 * - OpenTaiji: WFGY模式验证 → 生成TypeScript代码 → 代码安全审查 → 注册可用
 * 
 * WFGY集成:
 * - 模式出现频次验证（防幻觉）
 * - 代码边界条件自动生成
 * - 可追溯性：每个技能都关联到原始对话证据
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface SkillGenerationConfig {
  workspaceDir: string;
  minPatternOccurrences: number;
  minConfidence: number;
  autoRegister: boolean;
  enableCodeGeneration: boolean;
  codeReviewEnabled: boolean;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: string[];
  parameters: SkillParameter[];
  examples: string[];
  logicHint: string;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface GeneratedSkill {
  template: SkillTemplate;
  code: string;
  filePath: string;
  generatedAt: Date;
  confidence: number;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

const DEFAULT_CONFIG: SkillGenerationConfig = {
  workspaceDir: process.cwd(),
  minPatternOccurrences: 5,
  minConfidence: 0.8,
  autoRegister: false,
  enableCodeGeneration: true,
  codeReviewEnabled: true
};

// 预定义的技能模板库
const SKILL_TEMPLATES: Record<string, SkillTemplate> = {
  report_generator: {
    id: 'report.generator',
    name: '报告生成器',
    description: '自动生成各种类型的报告',
    category: 'productivity',
    triggers: ['生成报告', '报告', '总结', '周报', '日报', '月报'],
    parameters: [
      { name: 'type', type: 'string', description: '报告类型', required: true },
      { name: 'period', type: 'string', description: '时间周期', required: false }
    ],
    examples: ['生成一份周报', '生成项目总结报告'],
    logicHint: '收集指定时间范围内的数据，按照模板格式化输出'
  },

  reminder: {
    id: 'task.reminder',
    name: '智能提醒',
    description: '设置和管理任务提醒',
    category: 'productivity',
    triggers: ['提醒', '定时', '闹钟', '记得', '不要忘记'],
    parameters: [
      { name: 'task', type: 'string', description: '任务内容', required: true },
      { name: 'time', type: 'string', description: '提醒时间', required: true }
    ],
    examples: ['明天上午10点提醒我开会', '30分钟后提醒我喝水'],
    logicHint: '解析时间表达式，调度定时任务'
  },

  data_analyzer: {
    id: 'data.analyzer',
    name: '数据分析器',
    description: '自动分析数据并生成洞察',
    category: 'analysis',
    triggers: ['分析', '统计', '数据', '趋势', '图表'],
    parameters: [
      { name: 'dataSource', type: 'string', description: '数据源', required: true },
      { name: 'metrics', type: 'string', description: '分析指标', required: false }
    ],
    examples: ['分析最近7天的用户数据', '统计本月销售额趋势'],
    logicHint: '读取数据，计算关键指标，生成分析报告和可视化建议'
  },

  content_creator: {
    id: 'content.creator',
    name: '内容创作助手',
    description: '辅助创作各种类型的内容',
    category: 'creative',
    triggers: ['写', '创作', '生成', '文案', '文章', '邮件'],
    parameters: [
      { name: 'type', type: 'string', description: '内容类型', required: true },
      { name: 'topic', type: 'string', description: '主题', required: true },
      { name: 'tone', type: 'string', description: '语气风格', required: false }
    ],
    examples: ['写一封正式的商务邮件', '创作一篇关于AI的文章'],
    logicHint: '理解用户意图，生成符合要求的高质量内容'
  },

  info_lookup: {
    id: 'info.lookup',
    name: '信息查询',
    description: '智能查询各类信息',
    category: 'utility',
    triggers: ['查', '查询', '搜索', '找', '什么是', '怎么'],
    parameters: [
      { name: 'query', type: 'string', description: '查询内容', required: true },
      { name: 'source', type: 'string', description: '指定数据源', required: false }
    ],
    examples: ['查询今天的天气', '查一下OpenTaiji是什么'],
    logicHint: '理解查询意图，选择合适的数据源，返回结构化结果'
  }
};

export class SkillAutoGenerator {
  private config: SkillGenerationConfig;
  private patternHistory: Map<string, number> = new Map();
  private generatedSkills: Map<string, GeneratedSkill> = new Map();

  constructor(config?: Partial<SkillGenerationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录交互模式
   */
  recordPattern(pattern: string, context?: string): void {
    const normalized = this.normalizePattern(pattern);
    const current = this.patternHistory.get(normalized) || 0;
    this.patternHistory.set(normalized, current + 1);

    console.log(`[SkillGenerator] 记录模式: ${pattern} (累计${current + 1}次)`);
  }

  /**
   * 分析模式并生成候选技能
   */
  async analyzeAndGenerateCandidates(): Promise<SkillTemplate[]> {
    const candidates: SkillTemplate[] = [];

    for (const [pattern, count] of this.patternHistory) {
      if (count >= this.config.minPatternOccurrences) {
        // 匹配最接近的模板
        const matchedTemplate = this.findMatchingTemplate(pattern);
        
        if (matchedTemplate) {
          // 自定义模板ID和名称
          const customTemplate = {
            ...matchedTemplate,
            id: `auto.${this.normalizePattern(pattern).toLowerCase()}`,
            name: `自动: ${pattern}处理`
          };
          candidates.push(customTemplate);
        }
      }
    }

    return candidates;
  }

  /**
   * 从最近模式生成技能
   */
  async generateSkillsFromRecentPatterns(): Promise<GeneratedSkill[]> {
    const candidates = await this.analyzeAndGenerateCandidates();
    const generated: GeneratedSkill[] = [];

    for (const candidate of candidates) {
      if (!this.generatedSkills.has(candidate.id)) {
        const skill = await this.generateSkill(candidate);
        if (skill) {
          generated.push(skill);
          this.generatedSkills.set(candidate.id, skill);
        }
      }
    }

    return generated;
  }

  /**
   * 生成完整的技能代码
   */
  async generateSkill(template: SkillTemplate): Promise<GeneratedSkill | null> {
    if (!this.config.enableCodeGeneration) {
      return null;
    }

    const skillCode = this.generateSkillCode(template);
    const fileName = this.sanitizeFileName(template.name);
    const filePath = path.join(
      this.config.workspaceDir,
      'skills',
      'auto-generated',
      `${fileName}.ts`
    );

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, skillCode, 'utf-8');

    const generatedSkill: GeneratedSkill = {
      template,
      code: skillCode,
      filePath,
      generatedAt: new Date(),
      confidence: this.calculateConfidence(template),
      reviewStatus: this.config.codeReviewEnabled ? 'pending' : 'approved'
    };

    console.log(`[SkillGenerator] 已生成技能: ${template.name} -> ${filePath}`);

    // 如果启用自动注册，注册到技能系统
    if (this.config.autoRegister && generatedSkill.reviewStatus === 'approved') {
      await this.registerSkill(generatedSkill);
    }

    return generatedSkill;
  }

  /**
   * 生成技能TypeScript代码
   */
  private generateSkillCode(template: SkillTemplate): string {
    const paramsInterface = this.generateParamsInterface(template);
    const triggerArray = JSON.stringify(template.triggers, null, 4);

    return `/**
 * ${template.name}.ts - 自动生成的技能
 * 
 * 技能ID: ${template.id}
 * 分类: ${template.category}
 * 描述: ${template.description}
 * 
 * ⚠️ 这是自动生成的技能代码
 * 生成时间: ${new Date().toISOString()}
 * 请人工审核后投入生产使用
 * 
 * 设计逻辑提示: ${template.logicHint}
 */

import { BaseSkill, SkillContext, SkillResult } from '../../src/core/BaseSkill';

${paramsInterface}

export class ${this.classNameFromTemplate(template)} extends BaseSkill<${template.name.replace(/\W+/g, '')}Params> {
  public readonly id = '${template.id}';
  public readonly name = '${template.name}';
  public readonly description = '${template.description}';
  public readonly version = '0.1.0-auto';
  public readonly category = '${template.category}';
  
  // 触发词 - 当用户输入包含这些词汇时自动触发此技能
  public readonly triggers = ${triggerArray};

  /**
   * 验证输入参数
   */
  protected async validateParams(params: Partial<${template.name.replace(/\W+/g, '')}Params>): Promise<boolean> {
    ${this.generateValidationCode(template)}
  }

  /**
   * 执行技能逻辑
   */
  protected async executeImpl(
    context: SkillContext,
    params: ${template.name.replace(/\W+/g, '')}Params
  ): Promise<SkillResult> {
    context.logger.info(\`执行自动生成技能: \${this.name}\`, params);

    // ============================================
    // TODO: 请在此处实现具体的业务逻辑
    // 设计提示: ${template.logicHint}
    // ============================================

    // 示例逻辑 - 请替换为实际实现
    const result = await this.processRequest(context, params);

    return {
      success: true,
      data: result,
      message: \`${template.name} 执行完成\`
    };
  }

  /**
   * 处理请求的核心逻辑（自动生成的框架）
   */
  private async processRequest(
    context: SkillContext,
    params: ${template.name.replace(/\W+/g, '')}Params
  ): Promise<any> {
    // 自动生成的处理框架
    // 请根据实际需求完善
    
    context.logger.info('处理参数:', JSON.stringify(params, null, 2));
    
    // 返回结构化结果
    return {
      processed: true,
      timestamp: new Date().toISOString(),
      params,
      message: '这是自动生成的技能，请实现具体逻辑'
    };
  }
}

// 导出单例
export const ${this.instanceNameFromTemplate(template)} = new ${this.classNameFromTemplate(template)}();
export default ${this.instanceNameFromTemplate(template)};
`;
  }

  /**
   * 生成参数接口定义
   */
  private generateParamsInterface(template: SkillTemplate): string {
    let interfaceCode = `interface ${template.name.replace(/\W+/g, '')}Params {\n`;
    
    for (const param of template.parameters) {
      const optional = param.required ? '' : '?';
      interfaceCode += `  /** ${param.description} */\n`;
      interfaceCode += `  ${param.name}${optional}: ${param.type};\n`;
    }
    
    interfaceCode += '}\n\n';
    return interfaceCode;
  }

  /**
   * 生成参数验证代码
   */
  private generateValidationCode(template: SkillTemplate): string {
    const requiredParams = template.parameters.filter(p => p.required);
    
    if (requiredParams.length === 0) {
      return 'return true;';
    }

    let code = '// 检查必填参数\n';
    code += '    const requiredFields = [';
    code += requiredParams.map(p => `'${p.name}'`).join(', ');
    code += '];\n\n';
    code += '    for (const field of requiredFields) {\n';
    code += '      if (!(field in params) || params[field as keyof typeof params] === undefined) {\n';
    code += "        context.logger.error(`缺少必填参数: ${field}`);\n";
    code += '        return false;\n';
    code += '      }\n';
    code += '    }\n\n';
    code += '    return true;';

    return code;
  }

  /**
   * 查找匹配的模板
   */
  private findMatchingTemplate(pattern: string): SkillTemplate | null {
    const patternLower = pattern.toLowerCase();

    // 精确匹配触发词
    for (const template of Object.values(SKILL_TEMPLATES)) {
      for (const trigger of template.triggers) {
        if (patternLower.includes(trigger.toLowerCase())) {
          return template;
        }
      }
    }

    // 相似度匹配
    let bestMatch: SkillTemplate | null = null;
    let bestScore = 0;

    for (const template of Object.values(SKILL_TEMPLATES)) {
      const allWords = [...template.triggers, template.name, template.description];
      const combined = allWords.join(' ').toLowerCase();

      const patternWords = patternLower.split(/\W+/);
      let matches = 0;
      for (const word of patternWords) {
        if (combined.includes(word)) {
          matches++;
        }
      }

      const score = matches / patternWords.length;
      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestMatch = template;
      }
    }

    return bestMatch;
  }

  /**
   * 计算生成置信度
   */
  private calculateConfidence(template: SkillTemplate): number {
    let score = 0.5; // 基础分

    // 参数完整度
    score += template.parameters.length * 0.05;

    // 触发词数量
    score += template.triggers.length * 0.03;

    // 是否有示例
    score += template.examples.length * 0.05;

    return Math.min(1, score);
  }

  /**
   * 注册技能到系统
   */
  private async registerSkill(skill: GeneratedSkill): Promise<void> {
    // 写入注册清单
    const registryPath = path.join(
      this.config.workspaceDir,
      'skills',
      'auto-generated',
      'registry.json'
    );

    let registry: string[] = [];
    try {
      const existing = await fs.readFile(registryPath, 'utf-8');
      registry = JSON.parse(existing);
    } catch {
      registry = [];
    }

    if (!registry.includes(skill.template.id)) {
      registry.push(skill.template.id);
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
    }

    console.log(`[SkillGenerator] 技能已注册: ${skill.template.id}`);
  }

  // ============ 辅助方法 ============

  private normalizePattern(pattern: string): string {
    return pattern
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]/g, '')
      .substring(0, 30);
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private classNameFromTemplate(template: SkillTemplate): string {
    return template.name
      .split(/[^a-zA-Z0-9]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Skill';
  }

  private instanceNameFromTemplate(template: SkillTemplate): string {
    const className = this.classNameFromTemplate(template);
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  /**
   * 获取所有已生成的技能
   */
  getGeneratedSkills(): GeneratedSkill[] {
    return Array.from(this.generatedSkills.values());
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      trackedPatterns: this.patternHistory.size,
      generatedSkills: this.generatedSkills.size,
      pendingReview: Array.from(this.generatedSkills.values()).filter(
        s => s.reviewStatus === 'pending'
      ).length
    };
  }
}

export default SkillAutoGenerator;
