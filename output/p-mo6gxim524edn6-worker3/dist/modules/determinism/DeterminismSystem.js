"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterminismSystem = void 0;
const WFGYVerifier_1 = require("./WFGYVerifier");
const SelfConsistencyChecker_1 = require("./SelfConsistencyChecker");
const SourceTracer_1 = require("./SourceTracer");
const HallucinationDetector_1 = require("./HallucinationDetector");
/**
 * 综合确定性系统 - WFGY防幻觉系统主入口
 *
 * 整合所有防幻觉组件：
 * - WFGY符号层验证：基于规则和知识库验证输出符号一致性
 * - 自一致性检查：多路径采样投票验证一致性
 * - 知识溯源：每个结论追溯知识来源
 * - 幻觉检测：综合评分判断幻觉风险
 */
class DeterminismSystem {
    constructor(config) {
        this.name = 'DeterminismSystem';
        this.version = '1.0.0';
        this.ready = true;
        this.wfgyVerifier = new WFGYVerifier_1.WFGYVerifier(config?.wfgy);
        this.consistencyChecker = new SelfConsistencyChecker_1.SelfConsistencyChecker(config?.consistency);
        this.sourceTracer = new SourceTracer_1.SourceTracer(config?.sourceTrace);
        this.hallucinationDetector = new HallucinationDetector_1.HallucinationDetector(config?.hallucination);
        // 注入组件引用到幻觉检测器
        this.hallucinationDetector.setWFGYVerifier(this.wfgyVerifier);
        this.hallucinationDetector.setConsistencyChecker(this.consistencyChecker);
        this.hallucinationDetector.setSourceTracer(this.sourceTracer);
    }
    /**
     * 检查系统是否就绪
     */
    isReady() {
        return this.ready &&
            this.wfgyVerifier.isReady() &&
            this.consistencyChecker.isReady() &&
            this.sourceTracer.isReady() &&
            this.hallucinationDetector.isReady();
    }
    /**
     * 完整的确定性验证
     * @param content 需要验证的内容
     * @param options 验证选项
     * @param samples 可选的多路径采样结果（用于自一致性检查）
     */
    async verify(content, options, samples) {
        return this.hallucinationDetector.verify(content, options, samples);
    }
    /**
     * 只执行WFGY符号层验证
     */
    verifySymbols(content) {
        return this.wfgyVerifier.verifySymbols(content);
    }
    /**
     * 只执行自一致性检查
     */
    checkConsistency(samples) {
        return this.consistencyChecker.checkConsistency(samples);
    }
    /**
     * 只执行知识溯源
     */
    trace(content) {
        return this.sourceTracer.trace(content);
    }
    /**
     * 只执行幻觉检测
     */
    detectHallucination(content, options, samples) {
        return this.hallucinationDetector.detect(content, options, samples);
    }
    // ===== 便捷方法：WFGY 操作 =====
    /**
     * 添加WFGY规则
     */
    addWFGYRule(rule) {
        this.wfgyVerifier.addRule(rule);
    }
    /**
     * 移除WFGY规则
     */
    removeWFGYRule(ruleId) {
        return this.wfgyVerifier.removeRule(ruleId);
    }
    /**
     * 添加WFGY知识库条目
     */
    addWFGYKnowledge(entry) {
        this.wfgyVerifier.addKnowledgeEntry(entry);
    }
    /**
     * 移除WFGY知识库条目
     */
    removeWFGYKnowledge(symbol) {
        return this.wfgyVerifier.removeKnowledgeEntry(symbol);
    }
    /**
     * 获取所有WFGY规则
     */
    getWFGYRles() {
        return this.wfgyVerifier.getRules();
    }
    // ===== 便捷方法：知识溯源 =====
    /**
     * 添加知识条目到溯源索引
     */
    addKnowledgeEntry(entry) {
        this.sourceTracer.addEntry(entry);
    }
    /**
     * 批量添加知识条目
     */
    addKnowledgeEntries(entries) {
        this.sourceTracer.addEntries(entries);
    }
    /**
     * 移除知识条目
     */
    removeKnowledgeEntry(id) {
        return this.sourceTracer.removeEntry(id);
    }
    /**
     * 获取知识索引大小
     */
    getKnowledgeIndexSize() {
        return this.sourceTracer.getIndexSize();
    }
    /**
     * 清空知识索引
     */
    clearKnowledgeIndex() {
        this.sourceTracer.clearIndex();
    }
    // ===== 配置 =====
    /**
     * 设置幻觉检测阈值
     */
    setHallucinationThreshold(threshold) {
        this.hallucinationDetector.setDefaultThreshold(threshold);
    }
    /**
     * 设置一致性通过阈值
     */
    setConsistencyThreshold(threshold) {
        this.consistencyChecker.setPassThreshold(threshold);
    }
}
exports.DeterminismSystem = DeterminismSystem;
