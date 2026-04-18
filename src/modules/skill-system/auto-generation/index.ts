/**
 * Skill Auto Generation System - 技能自动生成系统
 * 
 * 提供"任务完成 → LLM分析 → 生成SKILL.md → 下次自动调用"的完整闭环
 */

export * from './types';
export { TaskPatternAnalyzer } from './TaskPatternAnalyzer';
export { SkillAutoGenerator } from './SkillAutoGenerator';
export { SkillEvolutionTracker } from './SkillEvolutionTracker';

// Re-export hooks
export { TaskCompletionHook } from '../../../core/actor/hooks/TaskCompletionHook';
export { ActorSkillIntegration, InMemorySkillLibrary } from '../../../core/actor/hooks/ActorSkillIntegration';

// ============ 快速使用示例 ============

/**
 * 示例1: 基本使用
 * 
 * ```typescript
 * import { SkillAutoGenerator } from './auto-generation';
 * import { TaskTrajectory } from './auto-generation/types';
 * 
 * const generator = new SkillAutoGenerator();
 * 
 * // 从任务轨迹生成技能
 * const result = await generator.generateFromTrajectory(trajectory);
 * 
 * if (result.success) {
 *   console.log(`技能已生成: ${result.skill?.skillName}`);
 * }
 * ```
 */

/**
 * 示例2: 集成到Actor系统
 * 
 * ```typescript
 * import { ActorSkillIntegration, InMemorySkillLibrary } from './auto-generation';
 * import { SkillAutoGenerator } from './auto-generation';
 * 
 * const generator = new SkillAutoGenerator();
 * const library = new InMemorySkillLibrary();
 * const integration = new ActorSkillIntegration(generator, library);
 * 
 * // 开始任务
 * integration.startTaskExecution(context, taskInput);
 * 
 * // 记录工具调用
 * integration.recordToolExecution(toolId, toolName, args, result, success, duration);
 * 
 * // 结束任务（自动触发技能生成检查）
 * await integration.endTaskExecution(context, output, success, metrics);
 * ```
 */

/**
 * 示例3: 使用进化追踪
 * 
 * ```typescript
 * import { SkillEvolutionTracker } from './auto-generation';
 * 
 * const tracker = new SkillEvolutionTracker('./data/evolution');
 * 
 * // 记录使用
 * await tracker.recordUsage(patternId, taskId, success, execTime, tokens);
 * 
 * // 添加用户反馈
 * await tracker.addFeedback(patternId, 4, '很好用！');
 * 
 * // 获取统计
 * const stats = await tracker.getPatternStats(patternId);
 * ```
 */

// ============ 版本信息 ============

export const AUTO_GENERATION_VERSION = '1.0.0';
export const SKILL_TEMPLATE_VERSION = '1.0.0';
