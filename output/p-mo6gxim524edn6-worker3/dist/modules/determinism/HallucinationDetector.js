"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallucinationDetector = void 0;
/**
 * 综合幻觉检测器
 * 整合符号层验证、自一致性检查和知识溯源，综合判断幻觉风险
 */
class HallucinationDetector {
    constructor(config) {
        this.name = 'HallucinationDetector';
        this.version = '1.0.0';
        this.ready = true;
        this.defaultThreshold = config?.defaultThreshold ?? 0.8;
        this.enableWFGY = config?.enableWFGY ?? true;
        this.enableConsistency = config?.enableConsistency ?? true;
        this.enableSourceTrace = config?.enableSourceTrace ?? true;
        this.weights = {
            wfgy: config?.weights?.wfgy ?? 0.4,
            consistency: config?.weights?.consistency ?? 0.3,
            sourceTrace: config?.weights?.sourceTrace ?? 0.3
        };
    }
    /**
     * 设置WFGY验证器
     */
    setWFGYVerifier(verifier) {
        this.wfgyVerifier = verifier;
    }
    /**
     * 设置自一致性检查器
     */
    setConsistencyChecker(checker) {
        this.consistencyChecker = checker;
    }
    /**
     * 设置溯源器
     */
    setSourceTracer(tracer) {
        this.sourceTracer = tracer;
    }
    /**
     * 获取WFGY验证器
     */
    getWFGYVerifier() {
        return this.wfgyVerifier;
    }
    /**
     * 获取自一致性检查器
     */
    getConsistencyChecker() {
        return this.consistencyChecker;
    }
    /**
     * 获取溯源器
     */
    getSourceTracer() {
        return this.sourceTracer;
    }
    /**
     * 检查检测器是否就绪
     */
    isReady() {
        return this.ready;
    }
    /**
     * 综合验证内容，判断是否存在幻觉
     * @param content 需要检测的内容
     * @param samples 可选的多路径采样结果，用于自一致性检查
     */
    async verify(content, options, samples) {
        const detectionResult = this.detect(content, options, samples);
        const threshold = options?.hallucinationThreshold ?? this.defaultThreshold;
        const isHighRisk = detectionResult.isHighRisk;
        return {
            verified: !isHighRisk,
            confidence: 1 - detectionResult.riskScore,
            sources: [],
            hallucinationRisk: detectionResult.riskScore,
            consistencyScore: 1 - detectionResult.riskScore,
            message: `幻觉检测完成，风险评分 ${(detectionResult.riskScore * 100).toFixed(1)}%，${isHighRisk ? '高风险' : '低风险'}`
        };
    }
    /**
     * 执行幻觉检测
     * @param content 需要检测的内容
     * @param options 检测选项
     * @param samples 多路径样本
     */
    detect(content, options, samples) {
        // Handle null/undefined content
        if (content == null) {
            return {
                riskScore: 1.0,
                suspectedSegments: [],
                isHighRisk: true
            };
        }
        let totalWeight = 0;
        let weightedScore = 0;
        const suspectedSegments = [];
        // WFGY符号层检测
        if (this.enableWFGY && this.wfgyVerifier) {
            const wfgyResult = this.wfgyVerifier.verifySymbols(content);
            const score = 1 - wfgyResult.symbolConsistency;
            const weight = this.weights.wfgy;
            weightedScore += score * weight;
            totalWeight += weight;
            // 添加违规片段作为疑似幻觉
            if (wfgyResult.details) {
                for (const detail of wfgyResult.details) {
                    if (!detail.passed) {
                        suspectedSegments.push({
                            text: detail.message || detail.rule,
                            startIndex: 0,
                            endIndex: content.length,
                            confidence: 1 - wfgyResult.symbolConsistency
                        });
                    }
                }
            }
        }
        // 自一致性检测
        if (this.enableConsistency && this.consistencyChecker && samples && samples.length >= 2) {
            const consistencyResult = this.consistencyChecker.checkConsistency(samples);
            const score = 1 - consistencyResult.score;
            const weight = this.weights.consistency;
            weightedScore += score * weight;
            totalWeight += weight;
        }
        // 知识溯源检测
        if (this.enableSourceTrace && this.sourceTracer) {
            const traceResult = this.sourceTracer.trace(content);
            const score = 1 - traceResult.coverage;
            const weight = this.weights.sourceTrace;
            weightedScore += score * weight;
            totalWeight += weight;
        }
        // 如果没有启用任何检测器，返回零风险
        if (totalWeight === 0) {
            return {
                riskScore: 0,
                suspectedSegments: [],
                isHighRisk: false
            };
        }
        const riskScore = weightedScore / totalWeight;
        const threshold = options?.hallucinationThreshold ?? this.defaultThreshold;
        const isHighRisk = riskScore >= threshold;
        // 如果高风险，尝试分割文本找出疑似片段
        if (isHighRisk && suspectedSegments.length === 0 && this.sourceTracer) {
            this.findSuspectedSegments(content, suspectedSegments, this.sourceTracer, riskScore);
        }
        return {
            riskScore,
            suspectedSegments,
            isHighRisk
        };
    }
    /**
     * 分段查找疑似幻觉片段
     */
    findSuspectedSegments(content, suspectedSegments, tracer, overallRisk) {
        // 按句子分割
        const sentences = content.split(/(?<=[。.!？!?；;])/g).filter(s => s.trim().length > 10);
        let currentIndex = 0;
        for (const sentence of sentences) {
            const startIndex = content.indexOf(sentence, currentIndex);
            if (startIndex === -1)
                continue;
            const endIndex = startIndex + sentence.length;
            const traceResult = tracer.trace(sentence);
            const sentenceRisk = 1 - traceResult.coverage;
            // 如果该句子风险高于平均，标记为疑似
            if (sentenceRisk > overallRisk && sentenceRisk > 0.5) {
                suspectedSegments.push({
                    text: sentence.trim(),
                    startIndex,
                    endIndex,
                    confidence: sentenceRisk
                });
            }
            currentIndex = endIndex;
        }
    }
    /**
     * 设置检测阈值
     */
    setDefaultThreshold(threshold) {
        this.defaultThreshold = Math.max(0, Math.min(1, threshold));
    }
    /**
     * 获取当前默认阈值
     */
    getDefaultThreshold() {
        return this.defaultThreshold;
    }
}
exports.HallucinationDetector = HallucinationDetector;
