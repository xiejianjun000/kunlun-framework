import { TemplateVariables } from './interfaces/IOutcomeScheduler';
/**
 * 简单的模板引擎实现
 * 支持 {{variable}} 占位符替换
 * 如果有Handlebars依赖，可以直接替换为完整Handlebars
 */
export declare class TemplateEngine {
    private templates;
    constructor();
    /**
     * 注册模板
     */
    registerTemplate(name: string, content: string): void;
    /**
     * 移除模板
     */
    removeTemplate(name: string): boolean;
    /**
     * 渲染已注册的模板
     */
    renderTemplate(name: string, variables: TemplateVariables): string;
    /**
     * 直接渲染字符串模板
     * 支持 {{variableName}} 语法
     */
    renderString(template: string, variables: TemplateVariables): string;
    /**
     * 支持点路径取值
     */
    private getValue;
    /**
     * 检查模板是否存在
     */
    hasTemplate(name: string): boolean;
    /**
     * 获取所有模板名称
     */
    getTemplateNames(): string[];
    /**
     * 清空所有模板
     */
    clearTemplates(): void;
}
