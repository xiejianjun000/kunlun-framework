/**
 * SoulEvolutionEngine.ts - 人格进化引擎
 * 
 * OpenTaiji最独特的创新：AI人格的持续自我进化
 * 
 * Hermes只有记忆，但没有"人格"概念。OpenTaiji实现：
 * 1. 从对话中学习用户偏好 → 2. 形成人格特质 → 3. 更新SOUL.md →
 * 4. 注入对话上下文 → 5. 回答越来越符合用户期待的人格
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface PersonalityTrait {
  name: string;
  value: number; // 0-1
  description: string;
  evidenceCount: number;
  lastUpdated: Date;
}

export interface EvolutionRecord {
  timestamp: Date;
  traitsUpdated: string[];
  insightsGained: string[];
  summary: string;
}

export interface SoulEvolutionConfig {
  workspaceDir: string;
  autoUpdateSoul: boolean;
  traitDecayRate: number; // 特质衰减率 (每天)
  minEvidenceForTrait: number;
  evolutionThreshold: number;
}

const DEFAULT_CONFIG: SoulEvolutionConfig = {
  workspaceDir: process.cwd(),
  autoUpdateSoul: true,
  traitDecayRate: 0.05,
  minEvidenceForTrait: 3,
  evolutionThreshold: 0.6
};

// 人格特质维度（基于Big Five但适配AI助手场景）
const PERSONALITY_DIMENSIONS: Record<string, {
  keywords: string[];
  description: string;
  opposite: string;
}> = {
  warmth: {
    keywords: ['友好', '温暖', '亲切', '热情', '温柔', '贴心', '关心', '体贴'],
    description: '待人友好温暖，有共情能力',
    opposite: '冷漠'
  },
  professionalism: {
    keywords: ['专业', '严谨', '认真', '负责', '准确', '可靠', '仔细', '审慎'],
    description: '做事专业严谨，值得信赖',
    opposite: '随意'
  },
  creativity: {
    keywords: ['创意', '想象', '灵感', '新颖', '独特', '艺术', '创新', '脑洞'],
    description: '富有创造力和想象力',
    opposite: '保守'
  },
  directness: {
    keywords: ['直接', '爽快', '干脆', '坦率', '直白', '不啰嗦', '简洁'],
    description: '沟通直接高效，不绕弯子',
    opposite: '委婉'
  },
  humor: {
    keywords: ['幽默', '搞笑', '有趣', '玩笑', '逗', '轻松', '活泼', '梗'],
    description: '有幽默感，说话轻松有趣',
    opposite: '严肃'
  },
  patience: {
    keywords: ['耐心', '细致', '慢慢来', '不着急', '详细', '详尽', '一步步'],
    description: '有耐心，讲解详细',
    opposite: '急躁'
  },
  adventurous: {
    keywords: ['冒险', '尝试', '探索', '新鲜', '挑战', '突破', '创新'],
    description: '愿意尝试新事物，不墨守成规',
    opposite: '保守'
  },
  empathy: {
    keywords: ['理解', '共情', '心疼', '安慰', '支持', '鼓励', '抱抱', '没事'],
    description: '能理解用户情绪，给予情感支持',
    opposite: '理性'
  }
};

export class SoulEvolutionEngine {
  private config: SoulEvolutionConfig;
  private traits: Map<string, PersonalityTrait> = new Map();
  private evolutionHistory: EvolutionRecord[] = [];
  private conversationEvidence: Map<string, string[]> = new Map();

  constructor(config?: Partial<SoulEvolutionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeTraits();
  }

  /**
   * 初始化人格特质
   */
  private initializeTraits(): void {
    for (const [name, meta] of Object.entries(PERSONALITY_DIMENSIONS)) {
      this.traits.set(name, {
        name,
        value: 0.5, // 初始中立值
        description: meta.description,
        evidenceCount: 0,
        lastUpdated: new Date()
      });
    }
  }

  /**
   * 从对话中学习人格偏好
   */
  async learnFromConversation(
    userMessage: string,
    assistantResponse: string,
    userFeedback?: string
  ): Promise<void> {
    // 分析用户消息中的人格关键词
    const userKeywords = this.extractPersonalityKeywords(userMessage);

    // 分析助手回复中的人格关键词
    const assistantKeywords = this.extractPersonalityKeywords(assistantResponse);

    // 如果有用户反馈，加强学习
    const feedbackMultiplier = this.calculateFeedbackMultiplier(userFeedback);

    // 更新特质证据
    for (const keyword of [...userKeywords, ...assistantKeywords]) {
      const trait = this.findTraitForKeyword(keyword);
      if (trait) {
        this.addEvidence(trait, userMessage, feedbackMultiplier);
      }
    }

    console.log(
      `[SoulEngine] 从对话学习: 用户=${userKeywords.length}词, ` +
      `助手=${assistantKeywords.length}词, 反馈系数=${feedbackMultiplier}`
    );
  }

  /**
   * 从近期学习中进化人格
   */
  async evolveFromRecentLearning(): Promise<EvolutionRecord> {
    const now = new Date();
    const updatedTraits: string[] = [];
    const insights: string[] = [];

    // 应用特质衰减（遗忘曲线）
    this.applyTraitDecay();

    // 更新每个特质的值
    for (const [name, trait] of this.traits) {
      if (trait.evidenceCount >= this.config.minEvidenceForTrait) {
        // 计算新的特质值（朝向证据指向的方向调整）
        const targetValue = Math.min(1, 0.5 + trait.evidenceCount * 0.05);
        const oldValue = trait.value;
        const newValue = oldValue + (targetValue - oldValue) * 0.3; // 渐进调整

        if (Math.abs(newValue - oldValue) > 0.05) {
          trait.value = newValue;
          trait.lastUpdated = now;
          updatedTraits.push(name);

          const direction = newValue > oldValue ? '增强' : '减弱';
          insights.push(
            `${trait.name}: ${direction} (${(oldValue * 100).toFixed(0)}% → ${(newValue * 100).toFixed(0)}%)`
          );
        }
      }
    }

    // 生成进化记录
    const record: EvolutionRecord = {
      timestamp: now,
      traitsUpdated: updatedTraits,
      insightsGained: insights,
      summary: this.generateEvolutionSummary(updatedTraits, insights)
    };

    this.evolutionHistory.push(record);

    // 如果有显著变化，更新SOUL.md
    if (updatedTraits.length > 0 && this.config.autoUpdateSoul) {
      await this.writeEvolutionToSoul(record);
    }

    console.log(
      `[SoulEngine] 人格进化完成: ${updatedTraits.length}个特质更新, ` +
      `${insights.length}条新洞见`
    );

    return record;
  }

  /**
   * 将进化写入SOUL.md
   */
  private async writeEvolutionToSoul(record: EvolutionRecord): Promise<void> {
    const soulPath = path.join(this.config.workspaceDir, 'SOUL.md');

    try {
      let soulContent = await fs.readFile(soulPath, 'utf-8');

      // 确保有进化记录章节
      if (!soulContent.includes('## 人格进化记录')) {
        soulContent += '\n\n## 人格进化记录\n\n';
        soulContent += '> 以下记录了AI在与用户互动过程中的人格自然进化过程。\n';
        soulContent += '> 这些变化反映了用户的偏好和互动模式。\n\n';
      }

      // 格式化进化记录
      const dateStr = record.timestamp.toISOString().split('T')[0];
      let entry = `\n### 📅 ${dateStr} 进化记录\n\n`;

      entry += '**更新的人格特质**:\n';
      if (record.traitsUpdated.length > 0) {
        record.traitsUpdated.forEach(traitName => {
          const trait = this.traits.get(traitName);
          if (trait) {
            entry += `- ✨ ${trait.name}: ${(trait.value * 100).toFixed(0)}% - ${trait.description}\n`;
          }
        });
      } else {
        entry += '- 无显著特质变化\n';
      }

      entry += '\n**学习洞见**:\n';
      if (record.insightsGained.length > 0) {
        record.insightsGained.forEach(insight => {
          entry += `- 💡 ${insight}\n`;
        });
      }

      entry += '\n**摘要**:\n';
      entry += `> ${record.summary}\n\n`;

      // 追加到文件末尾
      soulContent += entry;

      await fs.writeFile(soulPath, soulContent, 'utf-8');

      console.log('[SoulEngine] 已将进化记录写入SOUL.md');
    } catch (error) {
      console.warn('[SoulEngine] 写入SOUL.md失败:', error);
    }
  }

  /**
   * 生成进化摘要
   */
  private generateEvolutionSummary(traits: string[], insights: string[]): string {
    if (traits.length === 0) {
      return '本次学习周期中没有显著的人格变化，继续保持现有风格与用户互动。';
    }

    const traitNames = traits
      .map(t => PERSONALITY_DIMENSIONS[t]?.description || t)
      .join('、');

    return `在与用户的互动中，我逐渐调整了自己的沟通风格，在${traitNames}等方面有了新的理解。这些变化让我能够更好地适应用户的偏好，提供更贴心的服务。`;
  }

  /**
   * 应用特质衰减（遗忘曲线）
   */
  private applyTraitDecay(): void {
    const now = new Date();
    const msPerDay = 86400000;

    for (const trait of this.traits.values()) {
      const daysSinceUpdate = (now.getTime() - trait.lastUpdated.getTime()) / msPerDay;
      const decayFactor = Math.pow(1 - this.config.traitDecayRate, daysSinceUpdate);

      // 向0.5回归（中立状态）
      const decayTowardsNeutral = (trait.value - 0.5) * decayFactor + 0.5;
      trait.value = Math.max(0, Math.min(1, decayTowardsNeutral));
    }
  }

  /**
   * 提取人格关键词
   */
  private extractPersonalityKeywords(text: string): string[] {
    const keywords: string[] = [];
    const textLower = text.toLowerCase();

    for (const [, meta] of Object.entries(PERSONALITY_DIMENSIONS)) {
      for (const keyword of meta.keywords) {
        if (textLower.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }

    return [...new Set(keywords)]; // 去重
  }

  /**
   * 查找关键词对应的特质
   */
  private findTraitForKeyword(keyword: string): string | null {
    for (const [name, meta] of Object.entries(PERSONALITY_DIMENSIONS)) {
      if (meta.keywords.includes(keyword)) {
        return name;
      }
    }
    return null;
  }

  /**
   * 添加证据
   */
  private addEvidence(trait: string, evidence: string, multiplier: number): void {
    const traitData = this.traits.get(trait);
    if (!traitData) return;

    // 记录证据
    if (!this.conversationEvidence.has(trait)) {
      this.conversationEvidence.set(trait, []);
    }
    this.conversationEvidence.get(trait)!.push(evidence);

    // 增加证据计数（乘以反馈系数）
    traitData.evidenceCount += 1 * multiplier;
    traitData.lastUpdated = new Date();
  }

  /**
   * 计算反馈乘数
   */
  private calculateFeedbackMultiplier(feedback?: string): number {
    if (!feedback) return 1;

    const feedbackLower = feedback.toLowerCase();

    // 正面反馈增强学习
    if (['好', '棒', '赞', '喜欢', '不错', '对', '是', '谢谢', '感谢'].some(
      w => feedbackLower.includes(w)
    )) {
      return 1.5;
    }

    // 负面反馈反向学习
    if (['不好', '不对', '错', '讨厌', '不喜欢', '不要', '别'].some(
      w => feedbackLower.includes(w)
    )) {
      return 0.5;
    }

    return 1;
  }

  /**
   * 获取当前人格画像
   */
  getPersonalityProfile(): {
    traits: PersonalityTrait[];
    dominantTraits: string[];
    summary: string;
  } {
    const traits = Array.from(this.traits.values())
      .sort((a, b) => b.value - a.value);

    const dominantTraits = traits
      .filter(t => t.value >= this.config.evolutionThreshold)
      .map(t => t.name);

    // 生成摘要
    let summary = '当前人格画像: ';
    if (dominantTraits.length > 0) {
      const dominantNames = dominantTraits
        .slice(0, 3)
        .map(t => PERSONALITY_DIMENSIONS[t]?.description || t)
        .join('、');
      summary += `主要表现为${dominantNames}`;
    } else {
      summary += '处于中立状态，正在持续学习用户偏好';
    }

    return {
      traits,
      dominantTraits,
      summary
    };
  }

  /**
   * 生成系统提示词中的人格注入
   */
  generatePersonalityPrompt(): string {
    const profile = this.getPersonalityProfile();

    let prompt = '\n\n## 🎭 你的人格特质（请在回答中体现）\n\n';

    // 主导特质
    if (profile.dominantTraits.length > 0) {
      prompt += '你最显著的特质是: ';
      prompt += profile.dominantTraits
        .map(t => PERSONALITY_DIMENSIONS[t]?.description || t)
        .join('、');
      prompt += '。\n\n';
    }

    // 各维度详细
    prompt += '各维度表现:\n';
    profile.traits.slice(0, 5).forEach(trait => {
      const level = trait.value >= 0.7 ? '高' : trait.value >= 0.5 ? '中' : '低';
      prompt += `- ${PERSONALITY_DIMENSIONS[trait.name]?.description || trait.name}: ${level} (${(trait.value * 100).toFixed(0)}%)\n`;
    });

    prompt += '\n请在回答中自然体现这些人格特质，保持一致性。\n';

    return prompt;
  }

  /**
   * 获取进化历史
   */
  getEvolutionHistory(): EvolutionRecord[] {
    return [...this.evolutionHistory].reverse();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const profile = this.getPersonalityProfile();
    return {
      traitsTracked: this.traits.size,
      dominantTraits: profile.dominantTraits.length,
      totalEvidence: Array.from(this.traits.values()).reduce((sum, t) => sum + t.evidenceCount, 0),
      evolutionRecords: this.evolutionHistory.length,
      lastEvolution: this.evolutionHistory.length > 0
        ? this.evolutionHistory[this.evolutionHistory.length - 1].timestamp
        : null
    };
  }
}

export default SoulEvolutionEngine;
