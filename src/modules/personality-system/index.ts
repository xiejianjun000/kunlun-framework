/**
 * 人格系统模块索引
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

// 核心类
export { PersonalitySystem } from './PersonalitySystem';
export { PersonalityModel } from './PersonalityModel';
export { PersonalityDistiller } from './PersonalityDistiller';
export { PersonalityUpdater } from './PersonalityUpdater';

// 行为分析
export { BehaviorCollector } from './behavior/BehaviorCollector';
export { BehaviorAnalyzer } from './behavior/BehaviorAnalyzer';
export { PatternExtractor } from './behavior/PatternExtractor';

// 特质提取
export { TraitExtractor } from './trait/TraitExtractor';
export { CommunicationStyleExtractor } from './trait/CommunicationStyleExtractor';
export { DecisionStyleExtractor } from './trait/DecisionStyleExtractor';
export { LearningStyleExtractor } from './trait/LearningStyleExtractor';

// 验证
export { PersonalityValidator } from './validation/PersonalityValidator';
export { TraitConstraintChecker } from './validation/TraitConstraintChecker';

// 快照
export { PersonalitySnapshotManager } from './snapshot/PersonalitySnapshot';
export { PersonalityReporter } from './snapshot/PersonalityReporter';
