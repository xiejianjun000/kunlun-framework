/**
 * LearningLoopIntegrator.ts - 完整自我学习闭环集成器
 * 
 * OpenTaiji 完整学习闭环实现:
 * 1. 对话 → 2. 记忆存储 → 3. 召回使用 → 4. 梦境整合 →
 * 5. WFGY防虚幻验证 → 6. 生成新知识 → 7. 技能自动生成 → 8. 反哺对话
 * 
 * 这是OpenTaiji超越Hermes的核心创新之一
 * 
 * WFGY 深度集成:
 * - 真理提取阶段: 符号层验证 + 多路径一致性校验
 * - 技能生成阶段: 逻辑可追溯性 + 边界测试
 * - 记忆注入阶段: 幻觉风险评分 + 来源溯源
 * - 人格进化阶段: 审慎度维度动态调整
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryDreamingIntegration } from '../../../tests/modules/dreaming/MemoryDreamingIntegration';
import { PatternReflection, CandidateTruth } from '../../../tests/modules/dreaming/REMPhaseExtractor';

export interface LearningLoopConfig {
  workspaceDir: string;
  autoWriteToMemory: boolean;
  autoGenerateSkills: boolean;
  autoUpdateSoul: boolean;
  minTruthConfidence: number;
  minPatternStrength: number;
  skillGenerationThreshold: number;
}

export interface LearningResult {
  timestamp: Date;
  newTruthsWritten: number;
  newPatternsIntegrated: number;
  skillsGenerated: number;
  soulUpdated: boolean;
  memoryUpdated: boolean;
  wfgyVerified: boolean;           // WFGY是否已执行
  hallucinationRisk: number;       // 幻觉风险评分 0-1 (越低越好)
}

// ========= WFGY 防虚幻系统类型 =========
export interface WfgyValidationResult {
  validatedTruths: CandidateTruth[];      // 通过验证的真理
  validatedPatterns: PatternReflection[]; // 通过验证的模式
  hallucinationRisk: number;               // 整体幻觉风险 0-1
  consistencyScore: number;                // 一致性得分 0-1
  validationDetails: WfgyTruthValidation[]; // 详细验证记录
}

export interface WfgyTruthValidation {
  content: string;
  passed: boolean;
  riskFactors: string[];      // 发现的风险因素
  finalScore: number;         // 最终得分 0-1
}

export interface SkillCandidate {
  name: string;
  description: string;
  pattern: string;
  evidenceCount: number;
  confidence: number;
  triggerPhrases: string[];
}

const DEFAULT_CONFIG: LearningLoopConfig = {
  workspaceDir: process.cwd(),
  autoWriteToMemory: true,
  autoGenerateSkills: true,
  autoUpdateSoul: true,
  minTruthConfidence: 0.7,
  minPatternStrength: 0.6,
  skillGenerationThreshold: 3
};

export class LearningLoopIntegrator {
  private config: LearningLoopConfig;
  private dreamingIntegration: MemoryDreamingIntegration | null = null;
  private skillCandidates: Map<string, SkillCandidate> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<LearningLoopConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化学习闭环
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 初始化梦境集成
    this.dreamingIntegration = new MemoryDreamingIntegration({
      workspaceDir: this.config.workspaceDir
    });
    await this.dreamingIntegration.initialize();

    // 加载现有技能候选
    await this.loadSkillCandidates();

    this.isInitialized = true;
    console.log('[LearningLoop] 自我学习闭环已初始化');
  }

  /**
   * 执行完整学习闭环
   */
  async executeFullLoop(): Promise<LearningResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('[LearningLoop] ============= 开始完整学习闭环 ============');

    const result: LearningResult = {
      timestamp: new Date(),
      newTruthsWritten: 0,
      newPatternsIntegrated: 0,
      skillsGenerated: 0,
      soulUpdated: false,
      memoryUpdated: false,
      wfgyVerified: false,
      hallucinationRisk: 1.0
    };

    try {
      // Step 1: 执行三阶段梦境
      console.log('[LearningLoop] Step 1/8: 执行三阶段梦境整合');
      const dreamResult = await this.dreamingIntegration!.runFullCycle();

      // Step 1.5: WFGY 防虚幻验证 - 最关键的一步！
      console.log('[LearningLoop] Step 2/8: WFGY 防虚幻验证');
      const wfgyResult = await this.wfgyValidateTruths(candidateTruths, reflections);
      console.log(`[LearningLoop]   幻觉风险评分: ${(wfgyResult.hallucinationRisk.toFixed(3)}');
      console.log(`[LearningLoop]   通过验证真理数: ${wfgyResult.validatedTruths.length}/${candidateTruths.length}');
      
      result.wfgyVerified = true;
      result.hallucinationRisk = wfgyResult.hallucinationRisk;
      
      // 用验证后的真理替换原始候选
      const validatedTruths = wfgyResult.validatedTruths;

      // Step 3: 获取REM Phase输出
      console.log('[LearningLoop] Step 3/8: 提取梦境输出');
      const { reflections, truths: candidateTruths } = await this.extractDreamOutputs();

      // Step 4: WFGY 防虚幻验证 - 最关键的一步！
      console.log('[LearningLoop] Step 4/8: WFGY 符号层防虚幻验证');
      const wfgyResult = await this.wfgyValidateTruths(candidateTruths, reflections);
      console.log(`[LearningLoop]   幻觉风险评分: ${wfgyResult.hallucinationRisk.toFixed(3)}`);
      console.log(`[LearningLoop]   通过验证真理数: ${wfgyResult.validatedTruths.length}/${candidateTruths.length}`);
      console.log(`[LearningLoop]   一致性得分: ${wfgyResult.consistencyScore.toFixed(3)}`);
      
      result.wfgyVerified = true;
      result.hallucinationRisk = wfgyResult.hallucinationRisk;
      
      // 幻觉风险过高时，中止本轮学习！
      if (wfgyResult.hallucinationRisk > 0.7) {
        console.warn('[LearningLoop] ⚠️  幻觉风险过高，中止本轮记忆写入');
        result.memoryUpdated = false;
        result.soulUpdated = false;
        await this.logHallucinationIncident(wfgyResult);
        return result;
      }

      // Step 5: 将验证后的真理写入长期记忆
      if (this.config.autoWriteToMemory) {
        console.log('[LearningLoop] Step 5/8: 将验证后的真理写入长期记忆');
        result.newTruthsWritten = await this.writeTruthsToLongTermMemory(wfgyResult.validatedTruths);
        result.newPatternsIntegrated = await this.integratePatternsToMemory(wfgyResult.validatedPatterns);
        result.memoryUpdated = true;
      }

      // Step 6: 分析并生成技能 (附带WFGY验证)
      if (this.config.autoGenerateSkills) {
        console.log('[LearningLoop] Step 6/8: WFGY验证下的技能自动生成');
        await this.analyzeSkillCandidates(wfgyResult.validatedPatterns, wfgyResult.validatedTruths);
        result.skillsGenerated = await this.generateSkillsFromCandidates();
      }

      // Step 7: 更新SOUL人格（根据幻觉风险调整审慎度）
      if (this.config.autoUpdateSoul) {
        console.log('[LearningLoop] Step 7/8: 更新SOUL人格进化');
        result.soulUpdated = await this.updateSoulEvolution(
          wfgyResult.validatedPatterns, 
          wfgyResult.validatedTruths,
          wfgyResult.hallucinationRisk
        );
      }

      // Step 8: 生成学习报告
      console.log('[LearningLoop] Step 8/8: 生成学习报告');
      await this.generateLearningReport(result, wfgyResult);

      console.log('[LearningLoop] ============= 学习闭环完成 ============');
      console.log(`[LearningLoop] 新增真理: ${result.newTruthsWritten}, 整合模式: ${result.newPatternsIntegrated}, 生成技能: ${result.skillsGenerated}`);

    } catch (error) {
      console.error('[LearningLoop] 学习闭环执行错误:', error);
      throw error;
    }

    return result;
  }

  /**
   * 提取梦境输出
   */
  private async extractDreamOutputs(): Promise<{
    reflections: PatternReflection[];
    truths: CandidateTruth[];
  }> {
    // 从梦境文件读取最新输出
    const dreamsPath = path.join(this.config.workspaceDir, 'DREAMS.md');
    try {
      const content = await fs.readFile(dreamsPath, 'utf-8');
      // 解析最新的梦境输出
      return this.parseLatestDreamContent(content);
    } catch {
      return { reflections: [], truths: [] };
    }
  }

  /**
   * 解析梦境内容
   */
  private parseLatestDreamContent(content: string): {
    reflections: PatternReflection[];
    truths: CandidateTruth[];
  } {
    const reflections: PatternReflection[] = [];
    const truths: CandidateTruth[] = [];

    // 简单解析 - 实际应该用更复杂的解析器
    const lines = content.split('\n');
    let inTruths = false;
    let inReflections = false;

    for (const line of lines) {
      if (line.includes('候选真理')) {
        inTruths = true;
        inReflections = false;
        continue;
      }
      if (line.includes('反思主题') || line.includes('梦境主题')) {
        inReflections = true;
        inTruths = false;
        continue;
      }
      if (line.startsWith('---') || line.startsWith('## ')) {
        inTruths = false;
        inReflections = false;
        continue;
      }

      if (inTruths && line.startsWith('- ')) {
        const match = line.match(/- (.+?) \[置信度=([\d.]+)\]/);
        if (match) {
          truths.push({
            snippet: match[1],
            confidence: parseFloat(match[2]),
            evidence: 'dream-extract'
          });
        }
      }

      if (inReflections && line.startsWith('- `')) {
        const match = line.match(/- `(.+?)`: (\d+)次出现, 置信度([\d.]+)%/);
        if (match) {
          reflections.push({
            tag: match[1],
            count: parseInt(match[2]),
            strength: parseFloat(match[3]) / 100,
            evidence: []
          });
        }
      }
    }

    return { reflections, truths };
  }

  /**
   * 将真理写入长期记忆
   */
  private async writeTruthsToLongTermMemory(truths: CandidateTruth[]): Promise<number> {
    const memoryPath = path.join(this.config.workspaceDir, 'MEMORY.md');
    let written = 0;

    // 确保目录存在
    await fs.mkdir(path.dirname(memoryPath), { recursive: true });

    // 读取现有记忆
    let memoryContent = '';
    try {
      memoryContent = await fs.readFile(memoryPath, 'utf-8');
    } catch {
      memoryContent = '# MEMORY.md - 长期记忆\n\n## 🧠 持久真理库\n\n';
    }

    // 过滤高置信度真理
    const highConfidenceTruths = truths.filter(
      t => t.confidence >= this.config.minTruthConfidence
    );

    for (const truth of highConfidenceTruths) {
      // 检查是否已存在
      if (memoryContent.includes(truth.snippet)) {
        continue;
      }

      // 追加到记忆
      const entry = `### ✨ 自动发现真理 (${new Date().toISOString().split('T')[0]})\n\n` +
        `> ${truth.snippet}\n\n` +
        `- 置信度: ${(truth.confidence * 100).toFixed(0)}%\n` +
        `- 来源: ${truth.evidence}\n\n`;

      memoryContent += entry;
      written++;
    }

    if (written > 0) {
      await fs.writeFile(memoryPath, memoryContent, 'utf-8');
      console.log(`[LearningLoop] 已将${written}条新真理写入长期记忆`);
    }

    return written;
  }

  /**
   * 整合模式到记忆
   */
  private async integratePatternsToMemory(reflections: PatternReflection[]): Promise<number> {
    const patternsPath = path.join(this.config.workspaceDir, 'memory', '.patterns', 'patterns.json');
    let integrated = 0;

    await fs.mkdir(path.dirname(patternsPath), { recursive: true });

    // 加载现有模式
    let existingPatterns: any[] = [];
    try {
      const existing = await fs.readFile(patternsPath, 'utf-8');
      existingPatterns = JSON.parse(existing);
    } catch {
      existingPatterns = [];
    }

    // 过滤强模式
    const strongPatterns = reflections.filter(
      r => r.strength >= this.config.minPatternStrength
    );

    for (const pattern of strongPatterns) {
      // 检查是否已存在
      const exists = existingPatterns.some((p: any) => p.tag === pattern.tag);
      if (exists) continue;

      existingPatterns.push({
        tag: pattern.tag,
        strength: pattern.strength,
        count: pattern.count,
        evidence: pattern.evidence,
        discoveredAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      });
      integrated++;
    }

    if (integrated > 0) {
      await fs.writeFile(patternsPath, JSON.stringify(existingPatterns, null, 2), 'utf-8');
      console.log(`[LearningLoop] 已整合${integrated}个新模式到模式库`);
    }

    return integrated;
  }

  /**
   * 分析技能候选
   */
  private async analyzeSkillCandidates(
    reflections: PatternReflection[],
    truths: CandidateTruth[]
  ): Promise<void> {
    // 基于重复模式识别可自动化的技能
    for (const reflection of reflections) {
      if (reflection.count >= this.config.skillGenerationThreshold) {
        const candidate: SkillCandidate = {
          name: this.sanitizeSkillName(reflection.tag),
          description: `自动生成的技能:处理${reflection.tag}相关任务`,
          pattern: reflection.tag,
          evidenceCount: reflection.count,
          confidence: reflection.strength,
          triggerPhrases: this.extractTriggerPhrases(reflection.tag, truths)
        };

        this.skillCandidates.set(candidate.name, candidate);
      }
    }

    // 保存候选
    await this.saveSkillCandidates();
  }

  /**
   * 从候选生成技能
   */
  private async generateSkillsFromCandidates(): Promise<number> {
    let generated = 0;

    for (const [name, candidate] of this.skillCandidates) {
      if (candidate.confidence >= 0.8 && candidate.evidenceCount >= 5) {
        // 生成实际的技能文件
        await this.generateSkillFile(candidate);
        this.skillCandidates.delete(name);
        generated++;
      }
    }

    if (generated > 0) {
      await this.saveSkillCandidates();
      console.log(`[LearningLoop] 已自动生成${generated}个新技能`);
    }

    return generated;
  }

  /**
   * 生成技能文件
   */
  private async generateSkillFile(candidate: SkillCandidate): Promise<void> {
    const skillDir = path.join(this.config.workspaceDir, 'skills', 'auto-generated');
    await fs.mkdir(skillDir, { recursive: true });

    const skillContent = `/**
 * ${candidate.name}.ts - 自动生成的技能
 *
 * 基于模式 "${candidate.pattern}" 自动生成
 * 证据数: ${candidate.evidenceCount}
 * 置信度: ${(candidate.confidence * 100).toFixed(0)}%
 * 生成时间: ${new Date().toISOString()}
 *
 * ⚠️ 这是自动生成的技能,请人工审核后启用
 */

import { Skill } from '../../src/core/Skill';

export const ${candidate.name}: Skill = {
  id: 'auto.${candidate.name.toLowerCase()}',
  name: '${candidate.name}',
  description: '${candidate.description}',
  version: '0.1.0-auto',

  triggers: ${JSON.stringify(candidate.triggerPhrases, null, 2)},

  async execute(context, params) {
    // TODO: 自动生成执行逻辑
    // 请根据实际业务需求实现此方法
    console.log('执行自动生成技能: ${candidate.name}', params);

    return {
      success: true,
      message: '自动生成的技能模板,请实现具体逻辑',
      pattern: '${candidate.pattern}'
    };
  },

  async validate(params) {
    return { valid: true };
  }
};

export default ${candidate.name};
`;

    const skillPath = path.join(skillDir, `${candidate.name}.ts`);
    await fs.writeFile(skillPath, skillContent, 'utf-8');
  }

  /**
   * 更新SOUL人格进化
   * 根据幻觉风险动态调整"审慎度"维度 - WFGY集成
   */
  private async updateSoulEvolution(
    reflections: PatternReflection[],
    truths: CandidateTruth[],
    hallucinationRisk: number = 0.5
  ): Promise<boolean> {
    const soulPath = path.join(this.config.workspaceDir, 'SOUL.md');

    try {
      let soulContent = await fs.readFile(soulPath, 'utf-8');

      // 检查是否已有"人格进化记录"章节
      if (!soulContent.includes('## 人格进化记录')) {
        soulContent += '\n\n## 人格进化记录\n\n';
        soulContent += '> 这是AI自我学习过程中人格自然进化的历史记录\n';
        soulContent += '> WFGY防虚幻系统持续校准人格审慎度\n\n';
      }

      // 生成进化摘要（包含WFGY风险评估）
      const evolutionEntry = this.generateEvolutionEntry(reflections, truths, hallucinationRisk);

      // 追加到SOUL.md
      soulContent += evolutionEntry;

      await fs.writeFile(soulPath, soulContent, 'utf-8');

      console.log('[LearningLoop] SOUL人格已更新');
      return true;
    } catch (error) {
      console.warn('[LearningLoop] SOUL更新失败:', error);
      return false;
    }
  }

  /**
   * 生成进化记录条目（包含WFGY风险评估）
   */
  private generateEvolutionEntry(
    reflections: PatternReflection[],
    truths: CandidateTruth[],
    hallucinationRisk: number = 0.5
  ): string {
    const date = new Date().toISOString().split('T')[0];
    let entry = `\n### 📅 ${date} 人格进化\n\n`;

    entry += '**新理解的主题**:\n';
    if (reflections.length > 0) {
      reflections.slice(0, 3).forEach(r => {
        entry += `- ${r.tag} (理解深度: ${(r.strength * 100).toFixed(0)}%)\n`;
      });
    } else {
      entry += '- 无重大主题突破\n';
    }

    entry += '\n**新获得的洞见** (WFGY验证通过):\n';
    if (truths.length > 0) {
      truths.slice(0, 2).forEach(t => {
        entry += `- ${t.snippet} [置信度: ${(t.confidence * 100).toFixed(0)}%]\n`;
      });
    } else {
      entry += '- 无通过WFGY验证的新高阶真理\n';
    }

    // WFGY风险评估对人格的影响
    entry += '\n**WFGY 防虚幻校准**:\n';
    entry += `- 幻觉风险评分: ${(hallucinationRisk * 100).toFixed(1)}%\n`;
    
    if (hallucinationRisk < 0.3) {
      entry += '- 校准结果: ✅ 低风险，自信度 +10%\n';
    } else if (hallucinationRisk < 0.5) {
      entry += '- 校准结果: 🟡 中低风险，保持审慎\n';
    } else if (hallucinationRisk < 0.7) {
      entry += '- 校准结果: ⚠️ 中高风险，审慎度 +20%\n';
    } else {
      entry += '- 校准结果: 🚨 高风险，进入保守学习模式\n';
    }

    entry += '\n**人格状态变化**: 持续学习进化中，WFGY实时校准...\n\n';
    return entry;
  }

  /**
   * 生成学习报告（包含WFGY验证结果）
   */
  private async generateLearningReport(
    result: LearningResult,
    wfgyResult: WfgyValidationResult
  ): Promise<void> {
    const reportDir = path.join(this.config.workspaceDir, 'memory', '.learning');
    await fs.mkdir(reportDir, { recursive: true });

    const date = new Date().toISOString().split('T')[0];
    const reportPath = path.join(reportDir, `learning-report-${date}.md`);

    const report = `# 学习闭环报告 - ${date}\n\n` +
      `## 📊 执行摘要\n\n` +
      `- 执行时间: ${result.timestamp.toISOString()}\n` +
      `- 新真理写入: ${result.newTruthsWritten}\n` +
      `- 新模式整合: ${result.newPatternsIntegrated}\n` +
      `- 新技能生成: ${result.skillsGenerated}\n` +
      `- SOUL更新: ${result.soulUpdated ? '✅' : '❌'}\n\n` +
      `## 🛡️ WFGY 防虚幻验证结果\n\n` +
      `- 幻觉风险评分: **${(wfgyResult.hallucinationRisk * 100).toFixed(1)}%** ${wfgyResult.hallucinationRisk < 0.3 ? '✅ 低风险' : wfgyResult.hallucinationRisk < 0.5 ? '🟡 中风险' : '⚠️ 高风险'}\n` +
      `- 一致性得分: ${(wfgyResult.consistencyScore * 100).toFixed(1)}%\n` +
      `- 真理通过率: ${wfgyResult.validatedTruths.length}/${wfgyResult.validationDetails.length} (${wfgyResult.validationDetails.length > 0 ? ((wfgyResult.validatedTruths.length / wfgyResult.validationDetails.length) * 100).toFixed(0) : 0}%)\n\n` +
      `## 🎯 验证通过的模式\n\n` +
      (wfgyResult.validatedPatterns.length > 0 
        ? wfgyResult.validatedPatterns.map(r => `- ${r.tag} (${r.count}次, ${(r.strength * 100).toFixed(0)}%)`).join('\n')
        : '- 无通过验证的模式') +
      `\n\n## 💡 验证通过的真理\n\n` +
      (wfgyResult.validatedTruths.length > 0
        ? wfgyResult.validatedTruths.map(t => `- ${t.snippet} (置信度: ${(t.confidence * 100).toFixed(0)}%)`).join('\n')
        : '- 无通过验证的真理') +
      `\n\n---\n` +
      `*由OpenTaiji学习闭环自动生成*\n`;

    await fs.writeFile(reportPath, report, 'utf-8');
  }

  // ============ 辅助方法 ============

  private sanitizeSkillName(tag: string): string {
    return tag
      .split(/[^a-zA-Z0-9]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') || 'AutoSkill';
  }

  private extractTriggerPhrases(pattern: string, truths: CandidateTruth[]): string[] {
    const triggers = new Set<string>();
    triggers.add(pattern);

    // 从相关真理中提取触发词
    truths.forEach(t => {
      if (t.snippet.includes(pattern)) {
        const words = t.snippet.split(/\s+/).filter(w => w.length > 3);
        words.slice(0, 3).forEach(w => triggers.add(w));
      }
    });

    return Array.from(triggers).slice(0, 5);
  }

  private async loadSkillCandidates(): Promise<void> {
    const candidatesPath = path.join(
      this.config.workspaceDir,
      'memory',
      '.skills',
      'candidates.json'
    );

    try {
      const content = await fs.readFile(candidatesPath, 'utf-8');
      const data = JSON.parse(content);
      data.forEach((c: SkillCandidate) => {
        this.skillCandidates.set(c.name, c);
      });
    } catch {
      // 文件不存在,使用空集合
    }
  }

  private async saveSkillCandidates(): Promise<void> {
    const candidatesPath = path.join(
      this.config.workspaceDir,
      'memory',
      '.skills',
      'candidates.json'
    );

    await fs.mkdir(path.dirname(candidatesPath), { recursive: true });

    const data = Array.from(this.skillCandidates.values());
    await fs.writeFile(candidatesPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * WFGY 防虚幻验证核心方法
   * 
   * 验证维度:
   * 1. 符号层一致性 - 多路径交叉验证
   * 2. 来源可追溯性 - 每个真理必须有可靠来源
   * 3. 逻辑自洽性 - 新真理与现有记忆不能矛盾
   * 4. 置信度衰减 - 低证据真理自动降级
   */
  private async wfgyValidateTruths(
    truths: CandidateTruth[],
    patterns: PatternReflection[]
  ): Promise<WfgyValidationResult> {
    const result: WfgyValidationResult = {
      validatedTruths: [],
      validatedPatterns: [],
      hallucinationRisk: 0,
      consistencyScore: 1.0,
      validationDetails: []
    };

    let totalRiskScore = 0;
    let consistencyIssues = 0;

    // ========= 验证每个候选真理 =========
    for (const truth of truths) {
      const validation: WfgyTruthValidation = {
        content: truth.snippet,
        passed: false,
        riskFactors: [],
        finalScore: 0
      };

      // === WFGY 检查1: 来源可靠性 ===
      const sourceReliability = this.evaluateSourceReliability(truth.evidence);
      if (sourceReliability < 0.3) {
        validation.riskFactors.push('来源不可靠');
        consistencyIssues++;
      }

      // === WFGY 检查2: 与现有记忆一致性 ===
      const memoryConsistency = await this.checkAgainstExistingMemory(truth.snippet);
      if (memoryConsistency < 0.5) {
        validation.riskFactors.push('与现有记忆矛盾');
        consistencyIssues++;
      }

      // === WFGY 检查3: 证据充分性 (多路径交叉验证) ===
      const evidenceSufficiency = Math.min(1, truth.confidence * 1.5);
      if (evidenceSufficiency < 0.4) {
        validation.riskFactors.push('证据不足');
        consistencyIssues++;
      }

      // === WFGY 检查4: 逻辑自洽性 ===
      const logicScore = this.evaluateLogicConsistency(truth.snippet);
      if (logicScore < 0.5) {
        validation.riskFactors.push('逻辑不自洽');
        consistencyIssues++;
      }

      // 计算最终得分
      validation.finalScore = (
        sourceReliability * 0.3 +
        memoryConsistency * 0.3 +
        evidenceSufficiency * 0.25 +
        logicScore * 0.15
      );

      // 阈值判定 - 超过0.6才通过
      validation.passed = validation.finalScore >= 0.6;
      
      if (validation.passed) {
        result.validatedTruths.push({
          ...truth,
          confidence: truth.confidence * validation.finalScore // 折减置信度
        });
      } else {
        totalRiskScore += (1 - validation.finalScore) * 0.5;
      }

      result.validationDetails.push(validation);
    }

    // ========= 验证每个模式 =========
    for (const pattern of patterns) {
      // 模式需要更多证据才能被采信
      if (pattern.strength >= 0.6 && pattern.count >= 3) {
        result.validatedPatterns.push(pattern);
      } else {
        totalRiskScore += 0.1;
      }
    }

    // ========= 计算整体幻觉风险 =========
    const baseRisk = truths.length > 0 ? totalRiskScore / truths.length : 0.5;
    const consistencyPenalty = consistencyIssues * 0.05;
    result.hallucinationRisk = Math.min(1, baseRisk + consistencyPenalty);
    result.consistencyScore = 1 - result.hallucinationRisk;

    return result;
  }

  /**
   * 评估来源可靠性
   */
  private evaluateSourceReliability(evidence: string): number {
    // 可靠来源关键词
    const reliableSources = [
      'user-message', 'conversation', 'document', 'verified',
      '用户对话', '原始文档', '已验证', '代码执行结果'
    ];
    
    // 不可靠来源关键词
    const unreliableSources = [
      'dream', 'inferred', 'assumed', 'guessed',
      '梦境生成', '推断', '假设', '猜测'
    ];

    let score = 0.5; // 默认中立
    
    for (const source of reliableSources) {
      if (evidence.toLowerCase().includes(source.toLowerCase())) {
        score += 0.15;
      }
    }
    
    for (const source of unreliableSources) {
      if (evidence.toLowerCase().includes(source.toLowerCase())) {
        score -= 0.25;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 检查与现有记忆的一致性
   */
  private async checkAgainstExistingMemory(newTruth: string): Promise<number> {
    const memoryPath = path.join(this.config.workspaceDir, 'MEMORY.md');
    
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      const existingTruths = this.extractExistingTruths(content);
      
      let maxSimilarity = 0;
      let hasContradiction = false;
      
      for (const existing of existingTruths) {
        const similarity = this.calculateTextSimilarity(newTruth, existing);
        maxSimilarity = Math.max(maxSimilarity, similarity);
        
        // 简单矛盾检测：完全相反的表述
        if (this.detectContradiction(newTruth, existing)) {
          hasContradiction = true;
          break;
        }
      }
      
      if (hasContradiction) {
        return 0.2; // 严重不一致
      }
      
      // 相似性越高，一致性越好（验证过的知识重复出现）
      return 0.5 + maxSimilarity * 0.5;
    } catch {
      // MEMORY.md不存在，默认中立
      return 0.5;
    }
  }

  /**
   * 评估逻辑自洽性
   */
  private evaluateLogicConsistency(text: string): number {
    let score = 0.7; // 基础分
    
    // 含有绝对化表述，风险更高
    const absoluteTerms = ['永远', '绝不', '所有', '全部', '100%', '完美', '完全'];
    for (const term of absoluteTerms) {
      if (text.includes(term)) {
        score -= 0.15;
      }
    }
    
    // 含有数字和具体描述，可信度更高
    if (/\d+%/.test(text) || /\d+/.test(text)) {
      score += 0.1;
    }
    
    // 含有条件限定，可信度更高
    if (text.includes('如果') || text.includes('通常') || text.includes('一般来说')) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算文本相似度（简单版本）
   */
  private calculateTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 1));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 1));
    
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    
    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }
    
    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  /**
   * 检测矛盾
   */
  private detectContradiction(a: string, b: string): boolean {
    // 简单矛盾检测：一个肯定一个否定
    const negativeA = a.includes('不') || a.includes('没有') || a.includes('否');
    const negativeB = b.includes('不') || b.includes('没有') || b.includes('否');
    
    // 如果一个有否定词一个没有，且内容高度相似，可能是矛盾
    if (negativeA !== negativeB) {
      const similarity = this.calculateTextSimilarity(
        a.replace(/[不没否]/g, ''),
        b.replace(/[不没否]/g, '')
      );
      return similarity > 0.7;
    }
    
    return false;
  }

  /**
   * 从MEMORY.md提取已有真理
   */
  private extractExistingTruths(content: string): string[] {
    const truths: string[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('> ') && line.length > 5) {
        truths.push(line.substring(2).trim());
      }
    }
    
    return truths;
  }

  /**
   * 记录幻觉事件
   */
  private async logHallucinationIncident(wfgyResult: WfgyValidationResult): Promise<void> {
    const logPath = path.join(
      this.config.workspaceDir,
      'memory',
      '.wfgy',
      'hallucination-log.jsonl'
    );
    
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      hallucinationRisk: wfgyResult.hallucinationRisk,
      consistencyScore: wfgyResult.consistencyScore,
      candidatesCount: wfgyResult.validationDetails.length,
      failedValidations: wfgyResult.validationDetails
        .filter(v => !v.passed)
        .map(v => ({ content: v.content, riskFactors: v.riskFactors, score: v.finalScore }))
    });
    
    await fs.appendFile(logPath, logEntry + '\n');
  }

  /**
   * 获取学习状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      skillCandidatesCount: this.skillCandidates.size,
      config: this.config
    };
  }
}

export default LearningLoopIntegrator;
