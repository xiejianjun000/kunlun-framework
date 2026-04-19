/**
 * TaskPatternAnalyzer - 任务模式分析器
 * 
 * 核心功能：
 * - 提取任务关键步骤
 * - 识别可复用模式
 * - 评估模式价值（频率、复杂度）
 * - 生成技能建议
 */

import {
  TaskTrajectory,
  ToolCall,
  SkillPattern,
  PatternStep,
  PatternAnalysisResult,
  PatternInput,
  PatternOutput,
  GeneratorConfig,
} from './types';

export class TaskPatternAnalyzer {
  private config: GeneratorConfig;
  private toolCallTemplates: Map<string, PatternStep[]> = new Map();

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.initializeTemplates();
  }

  /**
   * 初始化工具调用模板库
   */
  private initializeTemplates(): void {
    // 通用文件操作模式
    this.toolCallTemplates.set('file_operations', [
      { stepId: 'read', order: 1, description: '读取文件内容', toolName: 'read_file' },
      { stepId: 'modify', order: 2, description: '修改文件内容', toolName: 'edit_file' },
      { stepId: 'verify', order: 3, description: '验证修改结果', toolName: 'read_file' },
    ]);

    // API调用模式
    this.toolCallTemplates.set('api_calls', [
      { stepId: 'prepare', order: 1, description: '准备请求参数' },
      { stepId: 'execute', order: 2, description: '执行API调用', toolName: 'fetch_web' },
      { stepId: 'parse', order: 3, description: '解析响应数据' },
    ]);

    // 搜索模式
    this.toolCallTemplates.set('search_operations', [
      { stepId: 'query', order: 1, description: '构建搜索查询', toolName: 'search_web' },
      { stepId: 'filter', order: 2, description: '过滤结果' },
      { stepId: 'extract', order: 3, description: '提取关键信息' },
    ]);
  }

  /**
   * 分析任务轨迹，提取模式
   */
  async analyzeTrajectory(trajectory: TaskTrajectory): Promise<SkillPattern | null> {
    // 1. 检查是否满足生成条件
    const analysisResult = await this.shouldGenerateSkill(trajectory);
    
    if (!analysisResult.shouldGenerate) {
      return null;
    }

    // 2. 提取关键步骤
    const steps = this.extractSteps(trajectory.toolCalls);
    
    // 3. 识别输入输出
    const inputs = this.extractInputs(trajectory);
    const outputs = this.extractOutputs(trajectory);

    // 4. 生成模式
    const pattern: SkillPattern = {
      patternId: this.generatePatternId(trajectory),
      name: analysisResult.suggestedName || this.generatePatternName(trajectory),
      description: analysisResult.suggestedDescription || this.generateDescription(trajectory),
      triggerConditions: this.extractTriggerConditions(trajectory),
      steps,
      inputs,
      outputs,
      examples: this.generateExamples(trajectory),
      pitfalls: this.identifyPitfalls(steps),
      prerequisites: this.extractPrerequisites(trajectory),
      estimatedComplexity: analysisResult.estimatedComplexity,
      frequencyScore: analysisResult.estimatedFrequency,
      confidence: analysisResult.confidence,
      tags: analysisResult.suggestedTags || this.extractTags(trajectory),
      relatedPatterns: analysisResult.similarPatterns || [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return pattern;
  }

  /**
   * 判断是否应该生成技能
   */
  async shouldGenerateSkill(trajectory: TaskTrajectory): Promise<PatternAnalysisResult> {
    // 基本条件检查
    if (trajectory.toolCalls.length < this.config.minToolCalls) {
      return {
        shouldGenerate: false,
        confidence: 0,
        reason: `Tool calls count (${trajectory.toolCalls.length}) below threshold (${this.config.minToolCalls})`,
        estimatedComplexity: 0,
        estimatedFrequency: 0,
      };
    }

    if (!trajectory.success) {
      return {
        shouldGenerate: false,
        confidence: 0,
        reason: 'Task was not successful',
        estimatedComplexity: 0,
        estimatedFrequency: 0,
      };
    }

    // 计算复杂度
    const complexity = this.calculateComplexity(trajectory);
    
    // 计算频率分数（基于相似工具调用模式）
    const frequency = this.calculateFrequencyScore(trajectory);

    // 计算置信度
    const confidence = this.calculateConfidence(trajectory, complexity, frequency);

    // 判断是否值得生成
    const shouldGenerate = confidence >= this.config.confidenceThreshold;

    return {
      shouldGenerate,
      confidence,
      reason: shouldGenerate 
        ? `Confidence (${confidence}) meets threshold (${this.config.confidenceThreshold})`
        : `Confidence (${confidence}) below threshold (${this.config.confidenceThreshold})`,
      suggestedName: this.generatePatternName(trajectory),
      suggestedDescription: this.generateDescription(trajectory),
      suggestedTriggers: this.generateTriggers(trajectory),
      suggestedTags: this.extractTags(trajectory),
      estimatedComplexity: complexity,
      estimatedFrequency: frequency,
    };
  }

  /**
   * 提取任务步骤
   */
  private extractSteps(toolCalls: ToolCall[]): PatternStep[] {
    const steps: PatternStep[] = [];
    
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const step: PatternStep = {
        stepId: `step_${i + 1}`,
        order: i + 1,
        description: this.describeToolCall(call),
        toolName: call.toolName,
        expectedOutput: this.estimateOutput(call),
      };

      // 添加条件判断
      if (i > 0) {
        step.conditions = [this.getConditionForStep(call, toolCalls[i - 1])];
      }

      steps.push(step);
    }

    return steps;
  }

  /**
   * 描述工具调用
   */
  private describeToolCall(call: ToolCall): string {
    const action = this.getActionVerb(call.toolName);
    const target = this.extractTarget(call);
    return `${action} ${target}`;
  }

  /**
   * 获取动作动词
   */
  private getActionVerb(toolName: string): string {
    const actionMap: Record<string, string> = {
      read_file: '读取',
      write_file: '写入',
      edit_file: '编辑',
      delete_file: '删除',
      search_web: '搜索',
      fetch_web: '获取',
      bash: '执行',
      mkdir: '创建目录',
      cp: '复制',
      mv: '移动',
      rm: '删除',
      grep: '查找',
      parse_file: '解析',
      image_generate: '生成图片',
      create_podcast: '创建播客',
    };

    return actionMap[toolName] || '处理';
  }

  /**
   * 提取目标
   */
  private extractTarget(call: ToolCall): string {
    const args = call.arguments;
    if (args.file_path) return String(args.file_path);
    if (args.url) return String(args.url);
    if (args.command) return String(args.command).substring(0, 50);
    if (args.query) return String(args.query);
    return '资源';
  }

  /**
   * 估算输出
   */
  private estimateOutput(call: ToolCall): string {
    if (call.toolName.includes('read') || call.toolName.includes('get')) {
      return '返回文件内容或数据';
    }
    if (call.toolName.includes('write') || call.toolName.includes('create')) {
      return '返回成功状态';
    }
    if (call.toolName.includes('search')) {
      return '返回搜索结果列表';
    }
    return '返回操作结果';
  }

  /**
   * 获取步骤条件
   */
  private getConditionForStep(current: ToolCall, previous: ToolCall): string {
    if (current.toolName === 'read_file' && previous.toolName === 'bash') {
      return '基于上一步执行结果选择文件';
    }
    if (current.toolName === 'edit_file' && previous.toolName === 'read_file') {
      return '基于读取的内容进行编辑';
    }
    return '无特殊条件';
  }

  /**
   * 提取输入
   */
  private extractInputs(trajectory: TaskTrajectory): PatternInput[] {
    const inputs: PatternInput[] = [];
    const firstCall = trajectory.toolCalls[0];

    if (firstCall?.arguments) {
      for (const [key, value] of Object.entries(firstCall.arguments)) {
        inputs.push({
          name: key,
          type: typeof value === 'string' ? 'string' : typeof value,
          description: `输入参数: ${key}`,
          required: true,
        });
      }
    }

    // 添加任务描述作为隐式输入
    inputs.push({
      name: 'taskDescription',
      type: 'string',
      description: '用户任务描述',
      required: true,
    });

    return inputs;
  }

  /**
   * 提取输出
   */
  private extractOutputs(trajectory: TaskTrajectory): PatternOutput[] {
    const outputs: PatternOutput[] = [];
    const lastCall = trajectory.toolCalls[trajectory.toolCalls.length - 1];

    if (lastCall?.result) {
      outputs.push({
        name: 'result',
        type: 'unknown',
        description: '任务执行结果',
      });
    }

    outputs.push({
      name: 'success',
      type: 'boolean',
      description: '是否成功完成',
    });

    return outputs;
  }

  /**
   * 提取触发条件
   */
  private extractTriggerConditions(trajectory: TaskTrajectory): SkillPattern['triggerConditions'] {
    const conditions: SkillPattern['triggerConditions'] = [];
    const taskInput = trajectory.taskInput.toLowerCase();

    // 关键词触发
    const keywords = this.extractKeywords(taskInput);
    for (const keyword of keywords.slice(0, 5)) {
      conditions.push({
        type: 'keyword',
        value: keyword,
        weight: 0.8,
      });
    }

    // 语义触发（基于领域）
    if (trajectory.metadata?.domain) {
      conditions.push({
        type: 'semantic',
        value: trajectory.metadata.domain,
        weight: 0.6,
      });
    }

    return conditions;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      '请', '帮我', '我想', '需要', '一个', '这个', '那个', '的', '了', '是',
      '我', '你', '他', '她', '它', '们', '在', '有', '和', '与', '或', '以及',
    ]);

    const words = text
      .replace(/[^\w\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));

    // 统计词频
    const freq: Record<string, number> = {};
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }

    // 返回按频率排序的关键词
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * 生成示例
   */
  private generateExamples(trajectory: TaskTrajectory): string[] {
    const examples: string[] = [];
    
    // 基于任务输入生成示例
    if (trajectory.taskInput) {
      examples.push(trajectory.taskInput);
    }

    // 基于相似模式生成变体
    const keywords = this.extractKeywords(trajectory.taskInput);
    if (keywords.length > 0) {
      examples.push(`帮我${keywords[0]}相关的任务`);
    }

    return examples.slice(0, 3);
  }

  /**
   * 识别陷阱
   */
  private identifyPitfalls(steps: PatternStep[]): string[] {
    const pitfalls: string[] = [];

    for (const step of steps) {
      if (step.toolName === 'bash') {
        pitfalls.push('注意命令执行的权限和安全性');
      }
      if (step.toolName === 'write_file') {
        pitfalls.push('写入前确认目标路径是否存在');
      }
      if (step.toolName === 'edit_file') {
        pitfalls.push('编辑前先备份原文件');
      }
    }

    return [...new Set(pitfalls)];
  }

  /**
   * 提取前置条件
   */
  private extractPrerequisites(trajectory: TaskTrajectory): string[] {
    const prereqs: string[] = [];
    const steps = this.extractSteps(trajectory.toolCalls);

    for (const step of steps) {
      if (step.toolName === 'read_file') {
        prereqs.push('确认文件存在且可读');
      }
      if (step.toolName === 'edit_file') {
        prereqs.push('确认有文件写入权限');
      }
      if (step.toolName === 'fetch_web') {
        prereqs.push('确认网络连接正常');
      }
    }

    return [...new Set(prereqs)];
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(trajectory: TaskTrajectory): number {
    let complexity = 0;

    // 工具调用数量
    complexity += Math.min(trajectory.toolCalls.length * 0.1, 0.3);

    // 条件分支
    const hasConditionals = trajectory.toolCalls.some(
      call => call.arguments && Object.keys(call.arguments).length > 2
    );
    if (hasConditionals) complexity += 0.2;

    // 错误处理
    const hasErrorHandling = trajectory.toolCalls.some(
      call => call.error || !call.success
    );
    if (hasErrorHandling) complexity += 0.2;

    // 元数据复杂度
    if (trajectory.metadata?.complexity === 'high') {
      complexity += 0.3;
    } else if (trajectory.metadata?.complexity === 'medium') {
      complexity += 0.15;
    }

    return Math.min(complexity, 1);
  }

  /**
   * 计算频率分数
   */
  private calculateFrequencyScore(trajectory: TaskTrajectory): number {
    // 基于工具调用序列的相似性
    const toolSequence = trajectory.toolCalls.map(c => c.toolName).join(',');
    
    // 简单的启发式评估
    let score = 0.5;

    // 常见模式加分
    const commonPatterns = ['read_file,edit_file', 'search_web,fetch_web', 'bash,mkdir,cp'];
    if (commonPatterns.some(p => toolSequence.includes(p))) {
      score += 0.2;
    }

    // 任务类别
    if (trajectory.metadata?.category) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    trajectory: TaskTrajectory,
    complexity: number,
    frequency: number
  ): number {
    let confidence = 0;

    // 成功率基础分
    if (trajectory.success) {
      confidence += 0.4;
    }

    // Token使用效率
    const avgTokensPerCall = trajectory.tokenUsage / Math.max(trajectory.toolCalls.length, 1);
    if (avgTokensPerCall < 5000) {
      confidence += 0.2;
    }

    // 执行时间效率
    const avgTimePerCall = trajectory.executionTime / Math.max(trajectory.toolCalls.length, 1);
    if (avgTimePerCall < 30) {
      confidence += 0.2;
    }

    // 复杂度平衡
    if (complexity >= 0.3 && complexity <= 0.7) {
      confidence += 0.15;
    }

    // 频率加成
    confidence += frequency * 0.1;

    return Math.min(confidence, 1);
  }

  /**
   * 生成模式ID
   */
  private generatePatternId(trajectory: TaskTrajectory): string {
    const timestamp = Date.now().toString(36);
    const hash = this.simpleHash(trajectory.taskInput.substring(0, 20));
    return `pattern_${hash}_${timestamp}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成模式名称
   */
  private generatePatternName(trajectory: TaskTrajectory): string {
    const keywords = this.extractKeywords(trajectory.taskInput);
    const firstTool = trajectory.toolCalls[0]?.toolName || 'task';
    const action = this.getActionVerb(firstTool);
    
    if (keywords.length > 0) {
      return `${action}${keywords[0]}任务`;
    }
    
    return `${action}任务`;
  }

  /**
   * 生成描述
   */
  private generateDescription(trajectory: TaskTrajectory): string {
    const keywords = this.extractKeywords(trajectory.taskInput);
    const toolCount = trajectory.toolCalls.length;
    
    return `自动生成的${keywords[0] || '通用'}任务技能，` +
           `包含${toolCount}个步骤，能够高效完成相关任务。`;
  }

  /**
   * 生成触发词
   */
  private generateTriggers(trajectory: TaskTrajectory): string[] {
    const triggers: string[] = [];
    const keywords = this.extractKeywords(trajectory.taskInput);
    
    for (const keyword of keywords.slice(0, 3)) {
      triggers.push(`"${keyword}"相关任务`);
      triggers.push(`帮我${keyword}`);
    }

    return [...new Set(triggers)];
  }

  /**
   * 提取标签
   */
  private extractTags(trajectory: TaskTrajectory): string[] {
    const tags: string[] = [];
    
    // 基于工具
    for (const call of trajectory.toolCalls) {
      if (call.toolName.includes('file')) tags.push('文件操作');
      if (call.toolName.includes('web') || call.toolName.includes('fetch')) tags.push('网络请求');
      if (call.toolName.includes('bash')) tags.push('命令执行');
      if (call.toolName.includes('image')) tags.push('图像处理');
      if (call.toolName.includes('podcast')) tags.push('音频生成');
    }

    // 基于元数据
    if (trajectory.metadata?.category) {
      tags.push(trajectory.metadata.category);
    }
    if (trajectory.metadata?.domain) {
      tags.push(trajectory.metadata.domain);
    }

    return [...new Set(tags)].slice(0, 5);
  }
}

export default TaskPatternAnalyzer;
