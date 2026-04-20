import { TemplateEngine } from '../../../../src/modules/outcome-scheduler/TemplateEngine';

describe('TemplateEngine', () => {
  it('should register and retrieve templates', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate('test', 'Hello {{name}}');
    
    expect(engine.hasTemplate('test')).toBe(true);
    expect(engine.getTemplateNames()).toContain('test');
  });

  it('should render registered template', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate('greeting', 'Hello {{name}}! You are {{age}} years old.');
    
    const result = engine.renderTemplate('greeting', { name: 'World', age: 42 });
    expect(result).toBe('Hello World! You are 42 years old.');
  });

  it('should render string directly', () => {
    const engine = new TemplateEngine();
    const result = engine.renderString('Hello {{name}}', { name: 'Charlie' });
    expect(result).toBe('Hello Charlie');
  });

  it('should support nested paths', () => {
    const engine = new TemplateEngine();
    const result = engine.renderString('{{user.name}} is {{user.age}}', {
      user: {
        name: 'Charlie',
        age: 30
      }
    });
    expect(result).toBe('Charlie is 30');
  });

  it('should return empty for missing variables', () => {
    const engine = new TemplateEngine();
    const result = engine.renderString('Hello {{missing}}', {});
    expect(result).toBe('Hello ');
  });

  it('should remove template', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate('test', 'hello');
    expect(engine.removeTemplate('test')).toBe(true);
    expect(engine.hasTemplate('test')).toBe(false);
  });

  it('should clear all templates', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate('test1', 'hello');
    engine.registerTemplate('test2', 'world');
    engine.clearTemplates();
    expect(engine.getTemplateNames()).toHaveLength(0);
  });
});
