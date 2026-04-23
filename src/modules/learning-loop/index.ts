/**
 * OpenTaiji 自我学习闭环模块
 * 
 * 这是OpenTaiji区别于Hermes的核心创新：
 * 
 * Hermes的闭环: 对话 → 记忆 → 梦境 → DREAMS.md (结束)
 * OpenTaiji的闭环: 对话 → 记忆 → 梦境 → 提取真理 → 写入长期记忆 →
 *                注入对话上下文 → 技能自动生成 → SOUL人格进化 → 对话
 * 
 * 主要组件:
 * - LearningLoopIntegrator: 完整闭环编排器
 * - MemoryContextInjector: 记忆上下文智能注入
 * - SkillAutoGenerator: 技能自动生成引擎（进阶版）
 * - SoulEvolutionEngine: 人格进化引擎
 */

export { LearningLoopIntegrator } from './LearningLoopIntegrator';
export { MemoryContextInjector } from './MemoryContextInjector';
export { SkillAutoGenerator } from './SkillAutoGenerator';
export { SoulEvolutionEngine } from './SoulEvolutionEngine';

// 类型导出
export type {
  LearningLoopConfig,
  LearningResult,
  SkillCandidate
} from './LearningLoopIntegrator';

export type {
  InjectionContext,
  InjectedContext,
  InjectorConfig
} from './MemoryContextInjector';

export type {
  SkillGenerationConfig,
  GeneratedSkill,
  SkillTemplate
} from './SkillAutoGenerator';

export type {
  SoulEvolutionConfig,
  PersonalityTrait
} from './SoulEvolutionEngine';

/**
 * 快速创建完整学习闭环
 */
export function createCompleteLearningLoop(workspaceDir: string) {
  const integrator = new LearningLoopIntegrator({ workspaceDir });
  const injector = new MemoryContextInjector({ workspaceDir });
  const skillGenerator = new SkillAutoGenerator({ workspaceDir });
  const soulEngine = new SoulEvolutionEngine({ workspaceDir });

  return {
    integrator,
    injector,
    skillGenerator,
    soulEngine,

    /**
     * 执行单次完整学习循环
     */
    async executeFullCycle() {
      // 1. 执行梦境整合和真理提取
      const learningResult = await integrator.executeFullLoop();

      // 2. 刷新记忆注入器缓存
      await injector.refreshCache();

      // 3. 生成技能（如果有足够强的模式）
      const skillsResult = await skillGenerator.generateSkillsFromRecentPatterns();

      // 4. 进化人格
      const soulResult = await soulEngine.evolveFromRecentLearning();

      return {
        learning: learningResult,
        skills: skillsResult,
        soul: soulResult
      };
    },

    /**
     * 为对话注入学习成果
     */
    async injectToConversation(query: string) {
      const context = await injector.inject({ query });
      return injector.generateSystemPromptInjection(context);
    }
  };
}

export default {
  LearningLoopIntegrator,
  MemoryContextInjector,
  SkillAutoGenerator,
  SoulEvolutionEngine,
  createCompleteLearningLoop
};
