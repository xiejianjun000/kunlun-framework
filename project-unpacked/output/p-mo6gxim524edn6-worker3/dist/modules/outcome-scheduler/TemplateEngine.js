"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
/**
 * 简单的模板引擎实现
 * 支持 {{variable}} 占位符替换
 * 如果有Handlebars依赖，可以直接替换为完整Handlebars
 */
class TemplateEngine {
    constructor() {
        this.templates = new Map();
        // 可以预加载模板
    }
    /**
     * 注册模板
     */
    registerTemplate(name, content) {
        this.templates.set(name, content);
    }
    /**
     * 移除模板
     */
    removeTemplate(name) {
        return this.templates.delete(name);
    }
    /**
     * 渲染已注册的模板
     */
    renderTemplate(name, variables) {
        const template = this.templates.get(name);
        if (!template) {
            throw new Error(`Template "${name}" not found`);
        }
        return this.renderString(template, variables);
    }
    /**
     * 直接渲染字符串模板
     * 支持 {{variableName}} 语法
     */
    renderString(template, variables) {
        return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const trimmedKey = key.trim();
            return this.getValue(variables, trimmedKey);
        });
    }
    /**
     * 支持点路径取值
     */
    getValue(variables, path) {
        let current = variables;
        const parts = path.split('.');
        for (const part of parts) {
            if (current == null || typeof current !== 'object') {
                return '';
            }
            current = current[part];
        }
        if (current == null) {
            return '';
        }
        return String(current);
    }
    /**
     * 检查模板是否存在
     */
    hasTemplate(name) {
        return this.templates.has(name);
    }
    /**
     * 获取所有模板名称
     */
    getTemplateNames() {
        return Array.from(this.templates.keys());
    }
    /**
     * 清空所有模板
     */
    clearTemplates() {
        this.templates.clear();
    }
}
exports.TemplateEngine = TemplateEngine;
