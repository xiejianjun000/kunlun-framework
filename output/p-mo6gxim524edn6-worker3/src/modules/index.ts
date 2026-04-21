/**
 * OpenTaiji - 太极生两仪 · 确定性与随机性的阴阳平衡
 * 生产级多智能体操作系统
 *
 * 基于 OpenClaw (Claude Code) 架构移植
 *
 * 四大核心引擎：
 * 🐲 青龙 - Actor 运行时引擎 (原系统已有)
 * 🦅 朱雀 - 人格系统引擎 (待实现)
 * 🐢 玄武 - 记忆系统引擎 (本次新增)
 * 🐯 白虎 - 进化系统引擎 (本次新增)
 *
 * 本次新增的核心系统：
 * ✅ WFGY 防幻觉系统 - 五重验证 (原系统已有，本次新增深度集成)
 * ✅ 记忆系统 - 三层记忆架构 + WFGY 深度集成
 * ✅ 梦境系统 - 五阶段记忆合成 + WFGY 验证
 * ✅ 图谱系统 - Wiki 知识图谱 + WFGY 质量保证
 */

// ===== WFGY 防幻觉系统 =====
export * from './determinism/interfaces/IDeterminismSystem';
export * from './determinism/DeterminismSystem';
export * from './determinism/WFGYVerifier';
export * from './determinism/SelfConsistencyChecker';
export * from './determinism/SourceTracer';
export * from './determinism/HallucinationDetector';

// ===== 记忆系统 =====
export * from './memory/interfaces/IMemorySystem';
export * from './memory/MemorySystem';
export * from './memory/embeddings';
export * from './memory/hybrid-search';

// ===== 梦境系统 =====
export * from './dreaming/interfaces/IDreamingSystem';
export * from './dreaming/DreamingSystem';
export * from './dreaming/phases/Phase1Clustering';
export * from './dreaming/phases/Phase2Narrative';
export * from './dreaming/phases/Phase3Synthesis';
export * from './dreaming/phases/Phase4Repair';
export * from './dreaming/phases/Phase5Integration';

// ===== 知识图谱系统 =====
export * from './wiki/interfaces/IWikiSystem';
export * from './wiki/WikiSystem';

// ===== OpenTaiji 完整系统入口 =====
export * from './OpenTaijiSystem';
