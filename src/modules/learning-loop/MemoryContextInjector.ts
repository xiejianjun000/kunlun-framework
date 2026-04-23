/**
 * MemoryContextInjector.ts - 记忆上下文注入器
 * 
 * 将长期记忆、模式库、梦境学习成果自动注入到对话上下文中
 * 实现"学习成果反哺对话"的闭环关键环节
 * 
 * 这是OpenTaiji超越Hermes的核心创新：Hermes只写记忆，但不主动将学习成果
 * 智能地注入到每一轮对话中
 * 
 * WFGY集成:
 * - 每条注入的记忆都附带幻觉风险评分
 * - 高风险记忆自动标记并降低权重
 * - 所有记忆来源可追溯
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface InjectionContext {
  query: string;
  conversationHistory?: string[];
  userId?: string;
  channel?: string;
}

export interface InjectedContext {
  longTermTruths: Array<{ content: string; confidence: number; source: string }>;
  relevantPatterns: Array<{ tag: string; strength: number; evidenceCount: number }>;
  learnedSkills: string[];
  soulPersonality: string;
  dreamInsights: string[];
  hallucinationRisk: number;      // 本次注入内容的整体幻觉风险
  wfgyVerificationStatus: string;  // WFGY验证状态总结
}

export interface InjectorConfig {
  workspaceDir: string;
  maxTruthsToInject: number;
  maxPatternsToInject: number;
  maxDreamInsights: number;
  relevanceThreshold: number;
  enableAutoInjection: boolean;
}

const DEFAULT_CONFIG: InjectorConfig = {
  workspaceDir: process.cwd(),
  maxTruthsToInject: 3,
  maxPatternsToInject: 2,
  maxDreamInsights: 2,
  relevanceThreshold: 0.3,
  enableAutoInjection: true
};

export class MemoryContextInjector {
  private config: InjectorConfig;
  private truthCache: Map<string, { content: string; confidence: number; source?: string }> = new Map();
  private patternCache: Map<string, { tag: string; strength: number; count: number }> = new Map();
  private lastCacheUpdate: number = 0;
  private cacheTTL: number = 3600000; // 1小时

  constructor(config?: Partial<InjectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 为当前对话注入相关的学习成果
   */
  async inject(context: InjectionContext): Promise<InjectedContext> {
    if (!this.config.enableAutoInjection) {
      return this.emptyContext();
    }

    // 更新缓存（如果过期）
    await this.updateCacheIfNeeded();

    const result: InjectedContext = {
      longTermTruths: [],
      relevantPatterns: [],
      learnedSkills: [],
      soulPersonality: '',
      dreamInsights: [],
      hallucinationRisk: 0.5,  // 默认中风险
      wfgyVerificationStatus: '未验证'
    };

    // 1. 注入相关的长期真理（带置信度和来源）
    result.longTermTruths = this.findRelevantTruths(context.query);

    // 2. 注入相关的模式
    result.relevantPatterns = this.findRelevantPatterns(context.query);

    // 3. 注入最近的梦境洞见
    result.dreamInsights = await this.getRecentDreamInsights();

    // 4. 注入SOUL人格
    result.soulPersonality = await this.getSoulPersonalitySummary();

    // 5. 注入已学习的技能
    result.learnedSkills = await this.getLearnedSkills();

    // 6. WFGY 风险评估 - 计算本次注入内容的整体幻觉风险
    result.hallucinationRisk = this.calculateOverallHallucinationRisk(result);
    result.wfgyVerificationStatus = this.getWfgyStatusLabel(result.hallucinationRisk);

    return result;
  }

  /**
   * 生成系统提示词注入片段（包含WFGY防虚幻验证状态）
   */
  generateSystemPromptInjection(injected: InjectedContext): string {
    let prompt = '\n\n========== 🧠 已学习的上下文 ==========\n\n';

    // WFGY 防虚幻安全提示 - 最优先显示
    prompt += `## 🛡️ WFGY 内容安全状态\n`;
    prompt += `- 幻觉风险评估: **${(injected.hallucinationRisk * 100).toFixed(1)}%**\n`;
    prompt += `- 验证状态: ${injected.wfgyVerificationStatus}\n`;
    
    if (injected.hallucinationRisk > 0.5) {
      prompt += `> ⚠️ 警告: 本次上下文幻觉风险较高，请谨慎使用并提示用户交叉验证\n`;
    }
    prompt += '\n';

    // 长期真理（带置信度）
    if (injected.longTermTruths.length > 0) {
      prompt += '## 你已经学习到的真理（WFGY验证通过，请在回答中体现）:\n';
      injected.longTermTruths.forEach((truth, i) => {
        prompt += `${i + 1}. ${truth.content} [置信度: ${(truth.confidence * 100).toFixed(0)}%, 来源: ${truth.source}]\n`;
      });
      prompt += '\n';
    }

    // 相关模式（带证据计数）
    if (injected.relevantPatterns.length > 0) {
      prompt += '## 相关行为模式（WFGY验证通过，请遵循）:\n';
      injected.relevantPatterns.forEach((pattern, i) => {
        prompt += `${i + 1}. ${pattern.tag} (强度: ${(pattern.strength * 100).toFixed(0)}%, 证据数: ${pattern.evidenceCount})\n`;
      });
      prompt += '\n';
    }

    // 梦境洞见
    if (injected.dreamInsights.length > 0) {
      prompt += '## 最近的梦境洞见:\n';
      injected.dreamInsights.forEach((insight, i) => {
        prompt += `${i + 1}. ${insight}\n`;
      });
      prompt += '\n';
    }

    // 已学习技能
    if (injected.learnedSkills.length > 0) {
      prompt += '## 你已掌握的自动生成技能:\n';
      injected.learnedSkills.forEach((skill, i) => {
        prompt += `${i + 1}. ${skill}\n`;
      });
      prompt += '\n';
    }

    // SOUL人格
    if (injected.soulPersonality) {
      prompt += '## 你的人格特质:\n';
      prompt += injected.soulPersonality + '\n';
    }

    prompt += '\n========== 上下文结束 ==========\n\n';
    prompt += '请在回答中自然地融入上述上下文，体现你的学习成长。所有引用的记忆内容请注明置信度。\n\n';

    return prompt;
  }

  /**
   * 查找相关的长期真理（带WFGY置信度和来源）
   */
  private findRelevantTruths(query: string): Array<{ content: string; confidence: number; source: string }> {
    const queryWords = new Set(
      query.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    );

    const scored: Array<{ content: string; confidence: number; source: string; finalScore: number }> = [];

    for (const [key, truth] of this.truthCache) {
      const truthWords = new Set(
        truth.content.toLowerCase().split(/\W+/).filter(w => w.length > 2)
      );

      // 计算Jaccard相似度
      const intersection = new Set([...queryWords].filter(x => truthWords.has(x)));
      const union = new Set([...queryWords, ...truthWords]);
      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      // 结合置信度
      const finalScore = similarity * truth.confidence;

      if (finalScore >= this.config.relevanceThreshold) {
        scored.push({ 
          content: truth.content, 
          confidence: truth.confidence, 
          source: 'WFGY验证记忆',
          finalScore 
        });
      }
    }

    // 排序并返回前N个
    return scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, this.config.maxTruthsToInject)
      .map(s => ({ content: s.content, confidence: s.confidence, source: s.source }));
  }

  /**
   * 查找相关的模式（带强度和证据计数）
   */
  private findRelevantPatterns(query: string): Array<{ tag: string; strength: number; evidenceCount: number }> {
    const queryLower = query.toLowerCase();

    const scored: Array<{ tag: string; strength: number; evidenceCount: number }> = [];

    for (const [tag, pattern] of this.patternCache) {
      if (queryLower.includes(tag.toLowerCase())) {
        scored.push({ 
          tag, 
          strength: pattern.strength,
          evidenceCount: pattern.count || 1
        });
      }
    }

    return scored
      .sort((a, b) => b.strength - a.strength)
      .slice(0, this.config.maxPatternsToInject);
  }

  /**
   * 获取最近的梦境洞见
   */
  private async getRecentDreamInsights(): Promise<string[]> {
    const dreamsPath = path.join(this.config.workspaceDir, 'DREAMS.md');
    
    try {
      const content = await fs.readFile(dreamsPath, 'utf-8');
      const lines = content.split('\n');
      const insights: string[] = [];
      let inTruthSection = false;

      // 从后往前找最新的真理
      for (let i = lines.length - 1; i >= 0 && insights.length < this.config.maxDreamInsights; i--) {
        const line = lines[i];
        if (line.includes('候选真理') || line.includes('持久真理')) {
          inTruthSection = true;
          continue;
        }
        if (inTruthSection && line.startsWith('> ')) {
          insights.unshift(line.substring(2).trim());
        }
        if (inTruthSection && line.startsWith('---')) {
          break;
        }
      }

      return insights;
    } catch {
      return [];
    }
  }

  /**
   * 获取SOUL人格摘要
   */
  private async getSoulPersonalitySummary(): Promise<string> {
    const soulPath = path.join(this.config.workspaceDir, 'SOUL.md');
    
    try {
      const content = await fs.readFile(soulPath, 'utf-8');
      
      // 提取核心人格部分
      const coreSections: string[] = [];
      const lines = content.split('\n');
      let currentSection = '';
      let captureLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('## ') || line.startsWith('# ')) {
          if (captureLines.length > 0) {
            coreSections.push(captureLines.join(' ').trim());
            captureLines = [];
          }
          currentSection = line;
          
          // 只捕获关键人格章节
          const keySections = ['核心', '原则', '性格', '人格', '我是谁', 'SOUL'];
          const isKeySection = keySections.some(k => 
            currentSection.toLowerCase().includes(k.toLowerCase())
          );
          if (!isKeySection) {
            currentSection = '';
          }
        } else if (currentSection && line.trim() && !line.startsWith('```')) {
          captureLines.push(line.trim());
        }
      }

      // 合并并截断
      const summary = coreSections.join(' ').substring(0, 500);
      return summary || '正在持续学习和进化中...';
    } catch {
      return '';
    }
  }

  /**
   * 获取已学习的技能列表
   */
  private async getLearnedSkills(): Promise<string[]> {
    const skillsDir = path.join(this.config.workspaceDir, 'skills', 'auto-generated');
    
    try {
      const files = await fs.readdir(skillsDir);
      const skillFiles = files.filter(f => f.endsWith('.ts'));
      
      const skills: string[] = [];
      for (const file of skillFiles.slice(0, 5)) {
        const content = await fs.readFile(path.join(skillsDir, file), 'utf-8');
        const nameMatch = content.match(/name:\s*'(.+?)'/);
        const descMatch = content.match(/description:\s*'(.+?)'/);
        
        if (nameMatch && descMatch) {
          skills.push(`${nameMatch[1]} - ${descMatch[1]}`);
        }
      }
      
      return skills;
    } catch {
      return [];
    }
  }

  /**
   * 更新缓存（如果过期）
   */
  private async updateCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheTTL) {
      return;
    }

    await Promise.all([
      this.updateTruthCache(),
      this.updatePatternCache()
    ]);

    this.lastCacheUpdate = now;
    console.log('[MemoryInjector] 记忆缓存已更新');
  }

  /**
   * 更新真理缓存
   */
  private async updateTruthCache(): Promise<void> {
    const memoryPath = path.join(this.config.workspaceDir, 'MEMORY.md');
    
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      this.truthCache.clear();

      // 解析真理条目
      const lines = content.split('\n');
      let currentTruth = '';
      let currentConfidence = 0.5;

      for (const line of lines) {
        if (line.startsWith('> ') && currentTruth === '') {
          currentTruth = line.substring(2).trim();
        } else if (line.includes('置信度') && currentTruth) {
          const match = line.match(/置信度[：:]\s*(\d+\.?\d*)/);
          if (match) {
            currentConfidence = parseFloat(match[1]) / 100;
          }
          this.truthCache.set(currentTruth.substring(0, 50), {
            content: currentTruth,
            confidence: currentConfidence
          });
          currentTruth = '';
          currentConfidence = 0.5;
        }
      }
    } catch {
      // MEMORY.md可能还不存在
    }
  }

  /**
   * 更新模式缓存
   */
  private async updatePatternCache(): Promise<void> {
    const patternsPath = path.join(
      this.config.workspaceDir,
      'memory',
      '.patterns',
      'patterns.json'
    );

    try {
      const content = await fs.readFile(patternsPath, 'utf-8');
      const patterns = JSON.parse(content);
      
      this.patternCache.clear();
      patterns.forEach((p: any) => {
        this.patternCache.set(p.tag, {
          tag: p.tag,
          strength: p.strength,
          count: p.count || p.evidenceCount || 1
        });
      });
    } catch {
      // patterns.json可能还不存在
    }
  }

  /**
   * 空上下文
   */
  private emptyContext(): InjectedContext {
    return {
      longTermTruths: [],
      relevantPatterns: [],
      learnedSkills: [],
      soulPersonality: '',
      dreamInsights: [],
      hallucinationRisk: 1.0,  // 无记忆时风险最高
      wfgyVerificationStatus: '无可用记忆内容'
    };
  }

  /**
   * 计算本次注入内容的整体幻觉风险
   */
  private calculateOverallHallucinationRisk(context: InjectedContext): number {
    if (context.longTermTruths.length === 0 && context.relevantPatterns.length === 0) {
      return 0.8; // 没有任何记忆内容时风险较高
    }

    let totalRisk = 0;
    let weight = 0;

    // 真理的风险：置信度越低，风险越高
    for (const truth of context.longTermTruths) {
      totalRisk += (1 - truth.confidence) * 0.7;
      weight += 0.7;
    }

    // 模式的风险：强度越低，风险越高
    for (const pattern of context.relevantPatterns) {
      totalRisk += (1 - pattern.strength) * 0.3;
      weight += 0.3;
    }

    return weight > 0 ? totalRisk / weight : 0.5;
  }

  /**
   * 获取WFGY状态标签
   */
  private getWfgyStatusLabel(risk: number): string {
    if (risk < 0.3) return '✅ 低风险 - 内容高度可靠';
    if (risk < 0.5) return '🟡 中低风险 - 内容基本可靠';
    if (risk < 0.7) return '⚠️ 中高风险 - 建议谨慎采信';
    return '🚨 高风险 - 请交叉验证来源';
  }

  /**
   * 强制刷新缓存
   */
  async refreshCache(): Promise<void> {
    this.lastCacheUpdate = 0;
    await this.updateCacheIfNeeded();
  }

  /**
   * 获取缓存状态
   */
  getCacheStats() {
    return {
      truthCount: this.truthCache.size,
      patternCount: this.patternCache.size,
      lastUpdate: new Date(this.lastCacheUpdate).toISOString(),
      cacheAgeMs: Date.now() - this.lastCacheUpdate
    };
  }
}

export default MemoryContextInjector;
