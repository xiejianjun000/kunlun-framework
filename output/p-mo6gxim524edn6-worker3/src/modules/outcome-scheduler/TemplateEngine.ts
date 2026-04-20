import { TemplateVariables } from './interfaces/IOutcomeScheduler';

/**
 * 简单的模板引擎实现
 * 支持 {{variable}} 占位符替换
 * 如果有Handlebars依赖，可以直接替换为完整Handlebars
 */
export class TemplateEngine {
  private templates: Map<string, string> = new Map();

  constructor() {
    // 可以预加载模板
  }

  /**
   * 注册模板
   */
  registerTemplate(name: string, content: string): void {
    this.templates.set(name, content);
  }

  /**
   * 移除模板
   */
  removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * 渲染已注册的模板
   */
  renderTemplate(name: string, variables: TemplateVariables): string {
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
  renderString(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      const trimmedKey = key.trim();
      return this.getValue(variables, trimmedKey);
    });
  }

  /**
   * 支持点路径取值
   */
  private getValue(variables: TemplateVariables, path: string): string {
    let current: unknown = variables;
    const parts = path.split('.');
    
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (current == null) {
      return '';
    }

    return String(current);
  }

  /**
   * 检查模板是否存在
   */
  hasTemplate(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * 获取所有模板名称
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * 清空所有模板
   */
  clearTemplates(): void {
    this.templates.clear();
  }
}
