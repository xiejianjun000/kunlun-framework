/**
 * ContextEngine 单元测试
 * Context Engine Unit Tests
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  // 类型
  ConversationRequest,
  MemoryContext,
  SkillContext,
  PersonalityContext,
  KnowledgeContext,
  ContextPriority,
  ContextSource,
  InjectionStrategy,
  ConversationMessage,
  estimateTokens,
  // 引擎
  ContextEngine,
  createContextEngine,
  createDefaultEngine,
  EngineState,
  // 扫描器
  ContextScanner,
  createContextScanner,
  // 组装器
  ContextAssembler,
  createContextAssembler,
  // 注入器
  ContextInjector,
  createContextInjector,
  // 便捷函数
  processWithContext,
} from '../../src/core/context';

describe('ContextEngine', () => {
  // ============== 类型测试 ==============

  describe('Type Definitions', () => {
    test('estimateTokens should calculate token count correctly', () => {
      // 纯英文
      const english = 'Hello world';
      expect(estimateTokens(english)).toBeGreaterThan(0);

      // 纯中文
      const chinese = '你好世界';
      expect(estimateTokens(chinese)).toBeGreaterThan(0);

      // 混合
      const mixed = 'Hello 你好 World 世界';
      expect(estimateTokens(mixed)).toBeGreaterThan(0);
    });

    test('ConversationRequest should have required fields', () => {
      const request: ConversationRequest = {
        userId: 'user-123',
        message: 'Hello',
      };

      expect(request.userId).toBe('user-123');
      expect(request.message).toBe('Hello');
    });

    test('MemoryContext should have correct structure', () => {
      const memory: MemoryContext = {
        id: 'mem-1',
        content: 'User prefers markdown format',
        type: 'preference',
        relevanceScore: 0.9,
        importanceScore: 0.8,
        priority: ContextPriority.HIGH,
        source: ContextSource.MEMORY,
      };

      expect(memory.id).toBeDefined();
      expect(memory.content).toBeDefined();
      expect(memory.relevanceScore).toBeLessThanOrEqual(1);
    });
  });

  // ============== ContextScanner 测试 ==============

  describe('ContextScanner', () => {
    let scanner: ContextScanner;

    beforeEach(() => {
      scanner = createContextScanner({
        memorySearchLimit: 5,
        skillSearchLimit: 3,
        enablePersonality: true,
        enableKnowledge: true,
        enableHistory: true,
      });
    });

    test('should create scanner with config', () => {
      expect(scanner).toBeInstanceOf(ContextScanner);
    });

    test('should build system context', () => {
      const system = scanner['buildSystemContext']();
      
      expect(system.systemName).toBe('OpenTaiji');
      expect(system.currentTime).toBeInstanceOf(Date);
      expect(system.timezone).toBeDefined();
    });

    test('should build history context', () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there', timestamp: Date.now() },
      ];

      const historyContext = scanner['buildHistoryContext'](history);
      
      expect(historyContext).toHaveLength(2);
      expect(historyContext[0].role).toBe('user');
    });

    test('should handle empty history', () => {
      const historyContext = scanner['buildHistoryContext'](undefined);
      expect(historyContext).toHaveLength(0);
    });

    test('should scan without bound systems', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Test message',
      };

      const result = await scanner.scan(request);
      
      expect(result).toBeDefined();
      expect(result.memories).toEqual([]);
      expect(result.skills).toEqual([]);
      expect(result.personality).toBeNull();
      expect(result.system).toBeDefined();
      expect(result.metadata.sourcesScanned).toContain(ContextSource.SYSTEM);
    });

    test('should track scan metadata', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Test',
      };

      const result = await scanner.scan(request);
      
      expect(result.metadata.scanStartTime).toBeInstanceOf(Date);
      expect(result.metadata.scanEndTime).toBeInstanceOf(Date);
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============== ContextAssembler 测试 ==============

  describe('ContextAssembler', () => {
    let assembler: ContextAssembler;

    beforeEach(() => {
      assembler = createContextAssembler({
        defaultTokenBudget: 8000,
        priorityWeights: {
          memory: 0.3,
          skill: 0.25,
          personality: 0.15,
          knowledge: 0.2,
          history: 0.1,
        },
      });
    });

    test('should create assembler with config', () => {
      expect(assembler).toBeInstanceOf(ContextAssembler);
    });

    test('should assemble empty context', () => {
      const raw = {
        memory: [],
        skills: [],
        personality: null,
        knowledge: [],
        system: {
          systemName: 'Test',
          currentTime: new Date(),
        },
        history: [],
      };

      const result = assembler.assemble(raw, 8000);
      
      expect(result.context).toBeDefined();
      expect(result.context.id).toBeDefined();
      expect(result.context.memories).toEqual([]);
      expect(result.context.skills).toEqual([]);
    });

    test('should include system context', () => {
      const raw = {
        memory: [],
        skills: [],
        personality: null,
        knowledge: [],
        system: {
          systemName: 'TestSystem',
          version: '1.0.0',
          currentTime: new Date(),
          timezone: 'UTC',
        },
        history: [],
      };

      const result = assembler.assemble(raw, 8000);
      
      expect(result.context.system).toBeDefined();
      expect(result.context.system?.systemName).toBe('TestSystem');
    });

    test('should handle personality context', () => {
      const personality: PersonalityContext = {
        userId: 'user-1',
        dimensions: { personality: 0.7 },
        communicationStyle: 'casual' as any,
        preferences: { responseStyle: 'detailed' },
        source: ContextSource.PERSONALITY,
      };

      const raw = {
        memory: [],
        skills: [],
        personality,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
      };

      const result = assembler.assemble(raw, 8000);
      
      expect(result.context.personality).toBeDefined();
      expect(result.context.personality?.userId).toBe('user-1');
    });

    test('should calculate token allocation', () => {
      const raw = {
        memory: [],
        skills: [],
        personality: null,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
      };

      const result = assembler.assemble(raw, 8000);
      
      expect(result.context.tokenAllocation).toBeDefined();
      expect(result.context.tokenAllocation.systemPrompt).toBeGreaterThan(0);
      expect(result.context.tokenAllocation.memory).toBeGreaterThan(0);
      expect(result.context.tokenAllocation.skills).toBeGreaterThan(0);
    });

    test('should respect token budget', () => {
      const memories: MemoryContext[] = Array(10).fill(null).map((_, i) => ({
        id: `mem-${i}`,
        content: `This is a long memory content that should be truncated if needed to fit within the token budget ${i}`,
        type: 'general',
        relevanceScore: 0.9,
        importanceScore: 0.8,
        priority: ContextPriority.MEDIUM,
        source: ContextSource.MEMORY,
        estimatedTokens: 500,
      }));

      const raw = {
        memory: memories,
        skills: [],
        personality: null,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
      };

      const budget = 2000; // 小预算
      const result = assembler.assemble(raw, budget);
      
      // 应该只选择部分记忆
      expect(result.context.memories.length).toBeLessThan(memories.length);
      // 总token应该接近预算
      expect(result.context.totalTokens).toBeLessThanOrEqual(budget * 1.1);
    });

    test('should track truncated items', () => {
      const raw = {
        memory: Array(20).fill(null).map((_, i) => ({
          id: `mem-${i}`,
          content: `Memory ${i}`,
          type: 'test',
          relevanceScore: 0.5,
          importanceScore: 0.5,
          priority: ContextPriority.MEDIUM,
          source: ContextSource.MEMORY,
          estimatedTokens: 100,
        })),
        skills: [],
        personality: null,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
      };

      const result = assembler.assemble(raw, 1000);
      
      // 应该有被截断的项目
      expect(result.truncatedItems.length).toBeGreaterThan(0);
    });
  });

  // ============== ContextInjector 测试 ==============

  describe('ContextInjector', () => {
    let injector: ContextInjector;

    beforeEach(() => {
      injector = createContextInjector(InjectionStrategy.SEQUENTIAL);
    });

    test('should create injector with default strategy', () => {
      expect(injector).toBeInstanceOf(ContextInjector);
    });

    test('should inject empty context', () => {
      const prompt = 'You are a helpful assistant.';
      
      const context: any = {
        memories: [],
        skills: [],
        personality: null,
        knowledge: [],
        system: null,
        history: [],
        tokenAllocation: {
          systemPrompt: 10,
          memory: 0,
          skills: 0,
          personality: 0,
          knowledge: 0,
          history: 0,
          reserved: 500,
        },
      };

      const result = injector.inject(prompt, context);
      
      expect(result.prompt).toBe(prompt);
      expect(result.actualTokens).toBeGreaterThan(0);
      // truncated可能为true或false，取决于实际token计算
      expect(typeof result.truncated).toBe('boolean');
    });

    test('should inject with CONTEXT placeholder', () => {
      const prompt = 'You are an assistant.\n\n{{CONTEXT}}\n\nUser: Hello';
      
      const context: any = {
        memories: [],
        skills: [],
        personality: null,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
        tokenAllocation: {
          systemPrompt: 10,
          memory: 0,
          skills: 0,
          personality: 0,
          knowledge: 0,
          history: 0,
          reserved: 500,
        },
      };

      const result = injector.inject(prompt, context);
      
      expect(result.prompt).not.toContain('{{CONTEXT}}');
      expect(result.prompt).toContain('System');
    });

    test('should format memory correctly', () => {
      const memories: MemoryContext[] = [
        {
          id: 'mem-1',
          content: 'User prefers dark mode',
          type: 'preference',
          relevanceScore: 0.9,
          importanceScore: 0.8,
          priority: ContextPriority.HIGH,
          source: ContextSource.MEMORY,
        },
      ];

      const formatted = injector['formatMemory'](memories);
      
      expect(formatted).toContain('Relevant Memories');
      expect(formatted).toContain('User prefers dark mode');
    });

    test('should format skills correctly', () => {
      const skills: SkillContext[] = [
        {
          id: 'skill-1',
          name: 'Code Review',
          description: 'Reviews code for bugs and style issues',
          matchScore: 0.95,
          priority: ContextPriority.HIGH,
          source: ContextSource.SKILL,
        },
      ];

      const formatted = injector['formatSkills'](skills);
      
      expect(formatted).toContain('Available Skills');
      expect(formatted).toContain('Code Review');
      expect(formatted).toContain('Reviews code');
    });

    test('should format personality correctly', () => {
      const personality: PersonalityContext = {
        userId: 'user-1',
        dimensions: { personality: 0.8 },
        communicationStyle: 'casual' as any,
        preferences: { responseStyle: 'concise' },
        source: ContextSource.PERSONALITY,
      };

      const formatted = injector['formatPersonality'](personality);
      
      expect(formatted).toContain('User Profile');
      expect(formatted).toContain('casual');
      expect(formatted).toContain('concise');
    });

    test('should format system correctly', () => {
      const system = {
        systemName: 'TestSystem',
        version: '2.0.0',
        currentTime: new Date('2024-01-15T10:30:00Z'),
        timezone: 'America/New_York',
      };

      const formatted = injector['formatSystem'](system);
      
      expect(formatted).toContain('System Information');
      expect(formatted).toContain('TestSystem');
      expect(formatted).toContain('2.0.0');
    });

    test('should use different injection strategies', () => {
      const prompt = 'You are an assistant.';
      
      const context: any = {
        memories: [
          { id: 'mem-1', content: 'Test memory', type: 'test', relevanceScore: 0.8, importanceScore: 0.7, priority: ContextPriority.MEDIUM, source: ContextSource.MEMORY, estimatedTokens: 10 }
        ],
        skills: [
          { id: 'skill-1', name: 'Test', description: 'Test skill', matchScore: 0.8, priority: ContextPriority.MEDIUM, source: ContextSource.SKILL, estimatedTokens: 10 }
        ],
        personality: null,
        knowledge: [],
        system: { systemName: 'Test', currentTime: new Date() },
        history: [],
        tokenAllocation: {
          systemPrompt: 10,
          memory: 100,
          skills: 100,
          personality: 0,
          knowledge: 0,
          history: 0,
          reserved: 500,
        },
      };

      const strategies = [
        InjectionStrategy.SEQUENTIAL,
        InjectionStrategy.CHUNKED,
        InjectionStrategy.INTERPOLATED,
        InjectionStrategy.HIERARCHICAL,
        InjectionStrategy.COMPRESSED,
      ];

      strategies.forEach((strategy) => {
        const result = injector.injectWithStrategy(prompt, context, strategy);
        expect(result.prompt).toBeDefined();
        expect(result.actualTokens).toBeGreaterThan(0);
      });
    });
  });

  // ============== ContextEngine 集成测试 ==============

  describe('ContextEngine', () => {
    let engine: ContextEngine;

    beforeEach(async () => {
      engine = createContextEngine({
        defaultTokenBudget: 8000,
        memorySearchLimit: 5,
        skillSearchLimit: 3,
      });
      await engine.initialize();
    });

    afterEach(async () => {
      await engine.destroy();
    });

    test('should create engine', () => {
      expect(engine).toBeInstanceOf(ContextEngine);
    });

    test('should be in initialized state after init', () => {
      expect(engine.getState()).toBe(EngineState.INITIALIZED);
    });

    test('should process simple request', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Hello, how are you?',
        tokenBudget: 4000,
      };

      const result = await engine.processRequest(request);
      
      expect(result).toBeDefined();
      expect(result.prompt).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.injection).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalTime).toBeGreaterThan(0);
    });

    test('should track processing stats', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Test message',
        tokenBudget: 4000,
      };

      const result = await engine.processRequest(request);
      
      expect(result.stats.scanTime).toBeGreaterThanOrEqual(0);
      expect(result.stats.assembleTime).toBeGreaterThanOrEqual(0);
      expect(result.stats.tokensUsed).toBeGreaterThan(0);
      expect(result.stats.tokenBudgetUsage).toBeGreaterThan(0);
    });

    test('should use custom system prompt', async () => {
      const customPrompt = 'You are a specialized code reviewer. {{CONTEXT}}';
      
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Review this code',
        systemPrompt: customPrompt,
        tokenBudget: 4000,
      };

      const result = await engine.processRequest(request);
      
      expect(result.prompt).toContain('code reviewer');
    });

    test('should handle history', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Continue the conversation',
        history: [
          { role: 'user', content: 'First message', timestamp: Date.now() - 1000 },
          { role: 'assistant', content: 'First response', timestamp: Date.now() },
        ],
        tokenBudget: 4000,
      };

      const result = await engine.processRequest(request);
      
      expect(result.context.history).toBeDefined();
    });

    test('should process with quick method', async () => {
      const result = await engine.process('user-1', 'Quick test message', {
        tokenBudget: 4000,
      });

      expect(result).toBeDefined();
      expect(result.prompt).toBeDefined();
    });

    test('should batch process requests', async () => {
      const requests: ConversationRequest[] = [
        { userId: 'user-1', message: 'Message 1', tokenBudget: 4000 },
        { userId: 'user-2', message: 'Message 2', tokenBudget: 4000 },
      ];

      const results = await engine.processBatch(requests);
      
      expect(results).toHaveLength(2);
      results.forEach((r: any) => {
        expect(r.prompt).toBeDefined();
      });
    });

    test('should register event handlers', async () => {
      let scanStartCalled = false;
      let processCompleteCalled = false;

      engine.on({
        onScanStart: () => { scanStartCalled = true; },
        onProcessComplete: () => { processCompleteCalled = true; },
      });

      await engine.process('user-1', 'Test', { tokenBudget: 4000 });

      expect(scanStartCalled).toBe(true);
      expect(processCompleteCalled).toBe(true);
    });

    test('should report stats', async () => {
      await engine.process('user-1', 'Test', { tokenBudget: 4000 });
      
      const stats = engine.getStats();
      
      expect(stats.requestCount).toBe(1);
      expect(stats.state).toBeDefined();
    });
  });

  // ============== 便捷函数测试 ==============

  describe('Convenience Functions', () => {
    test('createDefaultEngine should create engine with defaults', () => {
      const engine = createDefaultEngine();
      expect(engine).toBeInstanceOf(ContextEngine);
    });

    test('processWithContext should work without systems', async () => {
      const request: ConversationRequest = {
        userId: 'user-1',
        message: 'Test',
        tokenBudget: 4000,
      };

      const result = await processWithContext(request);
      
      expect(result).toBeDefined();
      expect(result.prompt).toBeDefined();
    });
  });
});
