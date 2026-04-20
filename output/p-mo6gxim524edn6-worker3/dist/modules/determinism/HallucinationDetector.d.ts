import { IDeterminismSystem, DeterminismResult, DeterminismOptions, HallucinationDetectionResult } from './interfaces/IDeterminismSystem';
import { WFGYVerifier } from './WFGYVerifier';
import { SelfConsistencyChecker } from './SelfConsistencyChecker';
import { SourceTracer } from './SourceTracer';
/**
 * 幻觉检测器配置
 */
export interface HallucinationDetectorConfig {
    /**
     * 默认风险阈值，默认0.8
     */
    defaultThreshold?: number;
    /**
     * 是否启用WFGY验证
     */
    enableWFGY?: boolean;
    /**
     * 是否启用自一致性检查
     */
    enableConsistency?: boolean;
    /**
     * 是否启用溯源检查
     */
    enableSourceTrace?: boolean;
    /**
     * 各检测器权重
     */
    weights?: {
        wfgy?: number;
        consistency?: number;
        sourceTrace?: number;
    };
}
/**
 * 综合幻觉检测器
 * 整合符号层验证、自一致性检查和知识溯源，综合判断幻觉风险
 */
export declare class HallucinationDetector implements IDeterminismSystem {
    readonly name: string;
    readonly version: string;
    private defaultThreshold;
    private enableWFGY;
    private enableConsistency;
    private enableSourceTrace;
    private weights;
    private wfgyVerifier?;
    private consistencyChecker?;
    private sourceTracer?;
    private ready;
    constructor(config?: HallucinationDetectorConfig);
    /**
     * 设置WFGY验证器
     */
    setWFGYVerifier(verifier: WFGYVerifier): void;
    /**
     * 设置自一致性检查器
     */
    setConsistencyChecker(checker: SelfConsistencyChecker): void;
    /**
     * 设置溯源器
     */
    setSourceTracer(tracer: SourceTracer): void;
    /**
     * 获取WFGY验证器
     */
    getWFGYVerifier(): WFGYVerifier | undefined;
    /**
     * 获取自一致性检查器
     */
    getConsistencyChecker(): SelfConsistencyChecker | undefined;
    /**
     * 获取溯源器
     */
    getSourceTracer(): SourceTracer | undefined;
    /**
     * 检查检测器是否就绪
     */
    isReady(): boolean;
    /**
     * 综合验证内容，判断是否存在幻觉
     * @param content 需要检测的内容
     * @param samples 可选的多路径采样结果，用于自一致性检查
     */
    verify(content: string | null | undefined, options?: Partial<DeterminismOptions>, samples?: (string | null | undefined)[]): Promise<DeterminismResult>;
    /**
     * 执行幻觉检测
     * @param content 需要检测的内容
     * @param options 检测选项
     * @param samples 多路径样本
     */
    detect(content: string | null | undefined, options?: Partial<DeterminismOptions>, samples?: (string | null | undefined)[]): HallucinationDetectionResult;
    /**
     * 分段查找疑似幻觉片段
     */
    private findSuspectedSegments;
    /**
     * 设置检测阈值
     */
    setDefaultThreshold(threshold: number): void;
    /**
     * 获取当前默认阈值
     */
    getDefaultThreshold(): number;
}
