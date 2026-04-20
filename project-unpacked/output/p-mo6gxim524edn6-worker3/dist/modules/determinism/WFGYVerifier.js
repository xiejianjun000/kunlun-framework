"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WFGYVerifier = void 0;
/**
 * WFGY (Whole Field Grammar Yielding) 符号层验证器
 * 基于符号规则和知识库对输出进行验证，防止模型输出不符合符号规范的内容
 */
class WFGYVerifier {
    constructor(config) {
        this.name = 'WFGYVerifier';
        this.version = '1.0.0';
        this.symbolRegex = null;
        this.ready = false;
        this.rules = config?.rules || [];
        this.knowledgeBase = new Map();
        if (config?.knowledgeBase) {
            for (const entry of config.knowledgeBase) {
                this.knowledgeBase.set(entry.symbol, entry);
            }
        }
        this.minimumScore = config?.minimumScore ?? 0.7;
        this.symbolRegex = null;
        this.ready = true;
    }
    /**
     * 添加符号规则
     * @param rule 符号规则
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * 移除符号规则
     * @param ruleId 规则ID
     */
    removeRule(ruleId) {
        const initialLength = this.rules.length;
        this.rules = this.rules.filter(r => r.id !== ruleId);
        return this.rules.length < initialLength;
    }
    /**
     * 添加知识库条目
     * @param entry 知识库条目
     */
    addKnowledgeEntry(entry) {
        this.knowledgeBase.set(entry.symbol, entry);
        this.symbolRegex = null; // Invalidate regex cache
    }
    /**
     * 移除知识库条目
     * @param symbol 符号
     */
    removeKnowledgeEntry(symbol) {
        const deleted = this.knowledgeBase.delete(symbol);
        if (deleted) {
            this.symbolRegex = null; // Invalidate regex cache
        }
        return deleted;
    }
    /**
     * 检查验证器是否就绪
     */
    isReady() {
        return this.ready;
    }
    /**
     * 对内容执行完整验证
     * @param content 需要验证的内容
     * @param options 验证选项
     */
    async verify(content, options) {
        const wfgyResult = this.verifySymbols(content);
        // 从知识库匹配来源
        const sources = [];
        if (content != null) {
            const symbolsFound = this.extractSymbols(String(content));
            for (const symbol of symbolsFound) {
                const entry = this.knowledgeBase.get(symbol);
                if (entry?.source) {
                    sources.push(entry.source);
                }
            }
        }
        return {
            verified: wfgyResult.symbolConsistency >= this.minimumScore && wfgyResult.valid,
            confidence: wfgyResult.symbolConsistency,
            sources,
            hallucinationRisk: 1 - wfgyResult.symbolConsistency,
            consistencyScore: wfgyResult.symbolConsistency,
            message: this.buildVerificationMessage(wfgyResult)
        };
    }
    /**
     * 执行符号层验证
     * @param content 需要验证的内容
     */
    verifySymbols(content) {
        // Defensive check for null/undefined
        if (content == null) {
            return {
                valid: false,
                matchedRules: 0,
                violatedRules: this.rules.length > 0 ? this.rules.length : 1,
                symbolConsistency: 0,
                details: [{
                        rule: 'null-content',
                        passed: false,
                        message: 'Content cannot be null or undefined'
                    }]
            };
        }
        const contentStr = String(content);
        if (this.rules.length === 0) {
            return {
                valid: true,
                matchedRules: 0,
                violatedRules: 0,
                symbolConsistency: 1.0,
                details: []
            };
        }
        let matchedRules = 0;
        let violatedRules = 0;
        let totalWeight = 0;
        let passedWeight = 0;
        const details = [];
        for (const rule of this.rules) {
            const weight = rule.weight ?? 1.0;
            totalWeight += weight;
            let matched;
            if (typeof rule.pattern === 'function') {
                matched = rule.pattern(contentStr);
            }
            else {
                matched = rule.pattern.test(contentStr);
            }
            if (matched === rule.expected) {
                matchedRules++;
                passedWeight += weight;
                details.push({
                    rule: rule.id,
                    passed: true
                });
            }
            else {
                violatedRules++;
                details.push({
                    rule: rule.id,
                    passed: false,
                    message: rule.violationMessage
                });
            }
        }
        const symbolConsistency = totalWeight > 0 ? passedWeight / totalWeight : 1.0;
        const valid = symbolConsistency >= this.minimumScore && violatedRules === 0;
        return {
            valid,
            matchedRules,
            violatedRules,
            symbolConsistency,
            details
        };
    }
    /**
     * 从内容中提取已知符号
     * @param content 内容
     */
    extractSymbols(content) {
        if (this.knowledgeBase.size === 0) {
            return [];
        }
        // Lazy compile regex matching all symbols
        if (!this.symbolRegex) {
            const symbols = Array.from(this.knowledgeBase.keys())
                .map(s => s.replace(/[.*+?^${}(\[\])\\|]/g, '\\$&')) // Escape regex special chars
                .join('|');
            this.symbolRegex = new RegExp(symbols, 'g');
        }
        const matches = content.match(this.symbolRegex) || [];
        // Deduplicate and return
        return Array.from(new Set(matches));
    }
    /**
     * 构建验证结果消息
     */
    buildVerificationMessage(result) {
        if (result.valid) {
            return `WFGY验证通过，${result.matchedRules} 条规则匹配，一致性 ${(result.symbolConsistency * 100).toFixed(1)}%`;
        }
        else {
            return `WFGY验证失败，${result.violatedRules} 条规则违反，一致性 ${(result.symbolConsistency * 100).toFixed(1)}%`;
        }
    }
    /**
     * 获取当前所有规则
     */
    getRules() {
        return [...this.rules];
    }
    /**
     * 获取知识库大小
     */
    getKnowledgeBaseSize() {
        return this.knowledgeBase.size;
    }
}
exports.WFGYVerifier = WFGYVerifier;
