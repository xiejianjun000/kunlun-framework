import { IDeterminismSystem, DeterminismResult, DeterminismOptions, WFGYVerificationResult, SelfConsistencyResult, SourceTraceResult, HallucinationDetectionResult } from './interfaces/IDeterminismSystem';
import { WFGYVerifier } from './WFGYVerifier';
import { SelfConsistencyChecker } from './SelfConsistencyChecker';
import { SourceTracer } from './SourceTracer';
import { HallucinationDetector } from './HallucinationDetector';
import type { WFGYVerifierConfig, WFGYRule, WFGYKnowledgeEntry } from './WFGYVerifier';
import type { SelfConsistencyCheckerConfig } from './SelfConsistencyChecker';
import type { SourceTracerConfig, KnowledgeIndexEntry } from './SourceTracer';
import type { HallucinationDetectorConfig } from './HallucinationDetector';
/**
 * 确定性系统总配置
 */
export interface DeterminismSystemConfig {
    /**
     * WFGY验证器配置
     */
    wfgy?: WFGYVerifierConfig;
    /**
     * 自一致性检查器配置
     */
    consistency?: SelfConsistencyCheckerConfig;
    /**
     * 溯源器配置
     */
    sourceTrace?: SourceTracerConfig;
    /**
     * 幻觉检测器配置
     */
    hallucination?: HallucinationDetectorConfig;
}
/**
 * 综合确定性系统 - WFGY防幻觉系统主入口
 *
 * 整合所有防幻觉组件：
 * - WFGY符号层验证：基于规则和知识库验证输出符号一致性
 * - 自一致性检查：多路径采样投票验证一致性
 * - 知识溯源：每个结论追溯知识来源
 * - 幻觉检测：综合评分判断幻觉风险
 */
export declare class DeterminismSystem implements IDeterminismSystem {
    readonly name: string;
    readonly version: string;
    readonly wfgyVerifier: WFGYVerifier;
    readonly consistencyChecker: SelfConsistencyChecker;
    readonly sourceTracer: SourceTracer;
    readonly hallucinationDetector: HallucinationDetector;
    private ready;
    constructor(config?: DeterminismSystemConfig);
    /**
     * 检查系统是否就绪
     */
    isReady(): boolean;
    /**
     * 完整的确定性验证
     * @param content 需要验证的内容
     * @param options 验证选项
     * @param samples 可选的多路径采样结果（用于自一致性检查）
     */
    verify(content: string | null | undefined, options?: Partial<DeterminismOptions>, samples?: (string | null | undefined)[]): Promise<DeterminismResult>;
    /**
     * 只执行WFGY符号层验证
     */
    verifySymbols(content: string | null | undefined): WFGYVerificationResult;
    /**
     * 只执行自一致性检查
     */
    checkConsistency(samples: (string | null | undefined)[]): SelfConsistencyResult;
    /**
     * 只执行知识溯源
     */
    trace(content: string | null | undefined): SourceTraceResult;
    /**
     * 只执行幻觉检测
     */
    detectHallucination(content: string | null | undefined, options?: Partial<DeterminismOptions>, samples?: (string | null | undefined)[]): HallucinationDetectionResult;
    /**
     * 添加WFGY规则
     */
    addWFGYRule(rule: WFGYRule): void;
    /**
     * 移除WFGY规则
     */
    removeWFGYRule(ruleId: string): boolean;
    /**
     * 添加WFGY知识库条目
     */
    addWFGYKnowledge(entry: WFGYKnowledgeEntry): void;
    /**
     * 移除WFGY知识库条目
     */
    removeWFGYKnowledge(symbol: string): boolean;
    /**
     * 获取所有WFGY规则
     */
    getWFGYRles(): WFGYRule[];
    /**
     * 添加知识条目到溯源索引
     */
    addKnowledgeEntry(entry: KnowledgeIndexEntry): void;
    /**
     * 批量添加知识条目
     */
    addKnowledgeEntries(entries: KnowledgeIndexEntry[]): void;
    /**
     * 移除知识条目
     */
    removeKnowledgeEntry(id: string): boolean;
    /**
     * 获取知识索引大小
     */
    getKnowledgeIndexSize(): number;
    /**
     * 清空知识索引
     */
    clearKnowledgeIndex(): void;
    /**
     * 设置幻觉检测阈值
     */
    setHallucinationThreshold(threshold: number): void;
    /**
     * 设置一致性通过阈值
     */
    setConsistencyThreshold(threshold: number): void;
}
