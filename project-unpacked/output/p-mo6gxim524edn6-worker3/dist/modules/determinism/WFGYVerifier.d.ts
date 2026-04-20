import { IDeterminismSystem, DeterminismResult, DeterminismOptions, WFGYVerificationResult, SourceReference } from './interfaces/IDeterminismSystem';
/**
 * WFGY符号规则定义
 */
export interface WFGYRule {
    /**
     * 规则ID
     */
    id: string;
    /**
     * 规则名称
     */
    name: string;
    /**
     * 规则描述
     */
    description: string;
    /**
     * 匹配模式（正则表达式或函数）
     */
    pattern: RegExp | ((content: string) => boolean);
    /**
     * 期望结果：true表示应该匹配，false表示不应该匹配
     */
    expected: boolean;
    /**
     * 规则权重 (0-1)，默认1.0
     */
    weight?: number;
    /**
     * 违规消息
     */
    violationMessage?: string;
}
/**
 * WFGY符号层知识库条目
 */
export interface WFGYKnowledgeEntry {
    /**
     * 符号标识符
     */
    symbol: string;
    /**
     * 符号含义
     */
    meaning: string;
    /**
     * 允许的上下文
     */
    allowedContexts: string[];
    /**
     * 禁止的上下文
     */
    forbiddenContexts?: string[];
    /**
     * 参考来源
     */
    source: SourceReference;
}
/**
 * WFGYVerifier配置选项
 */
export interface WFGYVerifierConfig {
    /**
     * 符号规则列表
     */
    rules?: WFGYRule[];
    /**
     * 知识库条目
     */
    knowledgeBase?: WFGYKnowledgeEntry[];
    /**
     * 最低通过分数 (0-1)，默认0.7
     */
    minimumScore?: number;
}
/**
 * WFGY (Whole Field Grammar Yielding) 符号层验证器
 * 基于符号规则和知识库对输出进行验证，防止模型输出不符合符号规范的内容
 */
export declare class WFGYVerifier implements IDeterminismSystem {
    readonly name: string;
    readonly version: string;
    private rules;
    private knowledgeBase;
    private minimumScore;
    private symbolRegex;
    private ready;
    constructor(config?: WFGYVerifierConfig);
    /**
     * 添加符号规则
     * @param rule 符号规则
     */
    addRule(rule: WFGYRule): void;
    /**
     * 移除符号规则
     * @param ruleId 规则ID
     */
    removeRule(ruleId: string): boolean;
    /**
     * 添加知识库条目
     * @param entry 知识库条目
     */
    addKnowledgeEntry(entry: WFGYKnowledgeEntry): void;
    /**
     * 移除知识库条目
     * @param symbol 符号
     */
    removeKnowledgeEntry(symbol: string): boolean;
    /**
     * 检查验证器是否就绪
     */
    isReady(): boolean;
    /**
     * 对内容执行完整验证
     * @param content 需要验证的内容
     * @param options 验证选项
     */
    verify(content: string | null | undefined, options?: Partial<DeterminismOptions>): Promise<DeterminismResult>;
    /**
     * 执行符号层验证
     * @param content 需要验证的内容
     */
    verifySymbols(content: string | null | undefined): WFGYVerificationResult;
    /**
     * 从内容中提取已知符号
     * @param content 内容
     */
    private extractSymbols;
    /**
     * 构建验证结果消息
     */
    private buildVerificationMessage;
    /**
     * 获取当前所有规则
     */
    getRules(): WFGYRule[];
    /**
     * 获取知识库大小
     */
    getKnowledgeBaseSize(): number;
}
