/**
 * ContextEngine完整集成示例
 * Complete Integration Example for ContextEngine
 * 
 * 展示完整的上下文处理流程，包括：
 * - 与MemorySystem集成
 * - 与SkillSystem集成
 * - 与PersonalitySystem集成
 * - 与KnowledgeBase集成
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  // ContextEngine
  ContextEngine,
  createContextEngine,
  createFullContextEngine,
  ConversationRequest,
  ProcessedContext,
  InjectionStrategy,
  ContextEngineConfig,
  // 类型
  MemoryContext,
  SkillContext,
  PersonalityContext,
  KnowledgeContext,
  ConversationMessage,
  IMemorySystem,
  ISkillSystem,
  IPersonalitySystem,
  IKnowledgeBase,
  MemorySearchOptions,
  ContextPriority,
  ContextSource,
} from '../core/context';

// ============== 模拟系统实现 ==============

/**
 * 模拟记忆系统
 */
class MockMemorySystem implements IMemorySystem {
  private memories: MemoryContext[] = [
    {
      id: 'mem-1',
      content: 'User prefers concise responses',
      type: 'preference',
      relevanceScore: 0.95,
      importanceScore: 0.9,
      priority: ContextPriority.HIGH,
      source: ContextSource.MEMORY,
    },
    {
      id: 'mem-2',
      content: 'User is working on a React TypeScript project',
      type: 'project',
      relevanceScore: 0.85,
      importanceScore: 0.8,
      priority: ContextPriority.MEDIUM,
      source: ContextSource.MEMORY,
    },
    {
      id: 'mem-3',
      content: 'User asked about testing last week',
      type: 'conversation',
      relevanceScore: 0.6,
      importanceScore: 0.5,
      priority: ContextPriority.LOW,
      source: ContextSource.MEMORY,
    },
  ];

  async search(options: MemorySearchOptions): Promise<MemoryContext[]> {
    const query = options.query.toLowerCase();
    
    return this.memories
      .filter((m) => {
        const matchQuery = m.content.toLowerCase().includes(query) ||
                          m.type.toLowerCase().includes(query);
        const matchMinRelevance = options.minRelevance 
          ? m.relevanceScore >= options.minRelevance 
          : true;
        return matchQuery && matchMinRelevance;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.limit || 10);
  }

  async get(id: string): Promise<MemoryContext | null> {
    return this.memories.find((m) => m.id === id) || null;
  }

  async recordAccess(id: string): Promise<void> {
    const mem = this.memories.find((m) => m.id === id);
    if (mem) {
      mem.accessCount = (mem.accessCount || 0) + 1;
    }
  }
}

/**
 * 模拟技能系统
 */
class MockSkillSystem implements ISkillSystem {
  private skills: SkillContext[] = [
    {
      id: 'skill-1',
      name: 'TypeScript Expert',
      description: 'Expert in TypeScript programming language',
      matchScore: 0.95,
      priority: ContextPriority.HIGH,
      source: ContextSource.SKILL,
      triggerConditions: ['typescript', 'ts', 'type'],
      content: 'Use strict typing. Prefer interfaces over types.',
    },
    {
      id: 'skill-2',
      name: 'React Developer',
      description: 'Specialized in React.js development',
      matchScore: 0.9,
      priority: ContextPriority.HIGH,
      source: ContextSource.SKILL,
      triggerConditions: ['react', 'component', 'jsx'],
      content: 'Use functional components with hooks.',
    },
    {
      id: 'skill-3',
      name: 'Code Review',
      description: 'Reviews code for bugs and best practices',
      matchScore: 0.75,
      priority: ContextPriority.MEDIUM,
      source: ContextSource.SKILL,
      content: 'Focus on readability, performance, and error handling.',
    },
  ];

  async match(query: string, userId: string): Promise<SkillContext[]> {
    const queryLower = query.toLowerCase();
    
    return this.skills
      .filter((s) => {
        const matchName = s.name.toLowerCase().includes(queryLower);
        const matchDesc = s.description.toLowerCase().includes(queryLower);
        const matchTrigger = s.triggerConditions?.some((t) => 
          queryLower.includes(t.toLowerCase())
        );
        return matchName || matchDesc || matchTrigger;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async get(id: string): Promise<SkillContext | null> {
    return this.skills.find((s) => s.id === id) || null;
  }
}

/**
 * 模拟人格系统
 */
class MockPersonalitySystem implements IPersonalitySystem {
  private profiles: Map<string, PersonalityContext> = new Map([
    ['user-1', {
      userId: 'user-1',
      dimensions: {
        personality: 0.7,      // 外向
        perspective: 0.8,     // 开放
        worldview: 0.6,
        values: 0.5,
        lifePhilosophy: 0.7,
      },
      communicationStyle: 'casual' as any,
      learningPreference: 'visual' as any,
      expertise: ['TypeScript', 'React', 'Node.js'],
      preferences: {
        language: 'en',
        responseStyle: 'concise',
        formatting: 'markdown',
      },
      behaviorPatterns: [],
      source: ContextSource.PERSONALITY,
    }],
  ]);

  async getProfile(userId: string, tenantId?: string): Promise<PersonalityContext | null> {
    return this.profiles.get(userId) || null;
  }

  async updateProfile(profile: Partial<PersonalityContext>): Promise<void> {
    if (profile.userId) {
      const existing = this.profiles.get(profile.userId);
      if (existing) {
        this.profiles.set(profile.userId, { ...existing, ...profile });
      }
    }
  }
}

/**
 * 模拟知识库
 */
class MockKnowledgeBase implements IKnowledgeBase {
  private knowledge: KnowledgeContext[] = [
    {
      id: 'kb-1',
      title: 'TypeScript Best Practices',
      content: 'Use strict mode, enable all strict flags. Prefer interfaces for object shapes.',
      relevanceScore: 0.9,
      priority: ContextPriority.MEDIUM,
      source: ContextSource.KNOWLEDGE,
      category: 'programming',
    },
    {
      id: 'kb-2',
      title: 'React Hooks Guide',
      content: 'useState for local state, useEffect for side effects, useMemo for expensive computations.',
      relevanceScore: 0.85,
      priority: ContextPriority.MEDIUM,
      source: ContextSource.KNOWLEDGE,
      category: 'frontend',
    },
  ];

  async search(query: string, userId?: string): Promise<KnowledgeContext[]> {
    const queryLower = query.toLowerCase();
    
    return this.knowledge
      .filter((k) => {
        return k.title.toLowerCase().includes(queryLower) ||
               k.content.toLowerCase().includes(queryLower) ||
               k.category?.toLowerCase().includes(queryLower);
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async get(id: string): Promise<KnowledgeContext | null> {
    return this.knowledge.find((k) => k.id === id) || null;
  }
}

// ============== 完整示例 ==============

/**
 * 完整集成示例
 */
export async function completeIntegrationExample(): Promise<void> {
  console.log('=== ContextEngine Complete Integration Example ===\n');

  // 1. 创建模拟系统
  const memorySystem = new MockMemorySystem();
  const skillSystem = new MockSkillSystem();
  const personalitySystem = new MockPersonalitySystem();
  const knowledgeBase = new MockKnowledgeBase();

  // 2. 创建ContextEngine并绑定系统
  const engine = createFullContextEngine(
    {
      defaultTokenBudget: 8000,
      maxTokenBudget: 128000,
      memorySearchLimit: 10,
      skillSearchLimit: 5,
      minRelevanceThreshold: 0.3,
      defaultInjectionStrategy: InjectionStrategy.SEQUENTIAL,
      enablePersonality: true,
      enableKnowledge: true,
      enableHistory: true,
      historyMessageLimit: 10,
    },
    memorySystem,
    skillSystem,
    personalitySystem,
    knowledgeBase
  );

  await engine.initialize();

  // 3. 注册事件处理器
  engine.on({
    onScanStart: (request) => {
      console.log(`[Event] Scan started for: "${request.message.substring(0, 50)}..."`);
    },
    onScanComplete: (result) => {
      console.log(`[Event] Scan complete: ${result.metadata.itemsFound} items found`);
    },
    onProcessComplete: (result) => {
      console.log(`[Event] Processing complete: ${result.stats.tokensUsed} tokens used`);
    },
  });

  // 4. 创建对话请求
  const request: ConversationRequest = {
    userId: 'user-1',
    message: 'How do I implement a custom React hook in TypeScript?',
    tokenBudget: 8000,
    systemPrompt: `You are an expert TypeScript and React developer.
Your role is to provide helpful, accurate, and concise code examples.

{{CONTEXT}}

Please provide your response.`,
    history: [
      {
        role: 'user',
        content: 'I need help with TypeScript',
        timestamp: Date.now() - 60000,
      },
      {
        role: 'assistant',
        content: 'What specific TypeScript topic would you like to explore?',
        timestamp: Date.now() - 30000,
      },
    ],
    metadata: {
      channel: 'web',
      platform: 'demo',
    },
  };

  // 5. 处理请求
  console.log('\n--- Processing Request ---');
  const result = await engine.processRequest(request);

  // 6. 输出结果
  console.log('\n--- Result Summary ---');
  console.log(`Total Tokens Used: ${result.stats.tokensUsed}`);
  console.log(`Token Budget Usage: ${(result.stats.tokenBudgetUsage * 100).toFixed(1)}%`);
  console.log(`Processing Time: ${result.stats.totalTime}ms`);
  console.log(`\nMemories Found: ${result.stats.memoriesFound}`);
  console.log(`Skills Found: ${result.stats.skillsFound}`);
  console.log(`Context Memories:`);
  result.context.memories.forEach((m) => {
    console.log(`  - ${m.content.substring(0, 60)}...`);
  });
  console.log(`Context Skills:`);
  result.context.skills.forEach((s) => {
    console.log(`  - ${s.name} (${(s.matchScore * 100).toFixed(0)}%)`);
  });

  // 7. 显示注入后的Prompt
  console.log('\n--- Injected Prompt (first 500 chars) ---');
  console.log(result.prompt.substring(0, 500) + '...');

  // 8. 清理
  await engine.destroy();

  console.log('\n=== Example Complete ===');
}

/**
 * 性能基准测试
 */
export async function benchmarkExample(): Promise<void> {
  console.log('=== ContextEngine Benchmark ===\n');

  const memorySystem = new MockMemorySystem();
  const skillSystem = new MockSkillSystem();

  const engine = createContextEngine({
    defaultTokenBudget: 8000,
  });

  await engine.initialize();
  engine.bindMemorySystem(memorySystem);
  engine.bindSkillSystem(skillSystem);

  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await engine.processRequest({
      userId: 'user-1',
      message: `Test message ${i} about TypeScript and React`,
      tokenBudget: 8000,
    });
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Iterations: ${iterations}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Average Time: ${avgTime.toFixed(2)}ms per request`);
  console.log(`Throughput: ${(1000 / avgTime).toFixed(2)} requests/second`);

  await engine.destroy();
}

/**
 * 批量处理示例
 */
export async function batchProcessingExample(): Promise<void> {
  console.log('=== Batch Processing Example ===\n');

  const engine = createContextEngine({ defaultTokenBudget: 8000 });
  await engine.initialize();

  const requests: ConversationRequest[] = [
    { userId: 'user-1', message: 'TypeScript generics', tokenBudget: 4000 },
    { userId: 'user-2', message: 'React hooks', tokenBudget: 4000 },
    { userId: 'user-3', message: 'Node.js async', tokenBudget: 4000 },
    { userId: 'user-1', message: 'TypeScript interfaces', tokenBudget: 4000 },
    { userId: 'user-2', message: 'React context', tokenBudget: 4000 },
  ];

  const startTime = Date.now();
  const results = await engine.processBatch(requests);
  const totalTime = Date.now() - startTime;

  console.log(`Processed ${results.length} requests in ${totalTime}ms\n`);

  results.forEach((result, i) => {
    console.log(`Request ${i + 1}: ${result.stats.tokensUsed} tokens, ${result.stats.totalTime}ms`);
  });

  await engine.destroy();
}

// ============== 运行示例 ==============

// 取消注释以下行来运行示例：
// completeIntegrationExample();
// benchmarkExample();
// batchProcessingExample();

export {
  MockMemorySystem,
  MockSkillSystem,
  MockPersonalitySystem,
  MockKnowledgeBase,
};
