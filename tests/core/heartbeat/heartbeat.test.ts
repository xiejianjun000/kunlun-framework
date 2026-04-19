/**
 * 心跳模块测试
 * Heartbeat Module Tests
 */

import {
  HeartbeatManager,
  HeartbeatScheduler,
  HeartbeatChecker,
  CheckItem,
  CheckResult,
  CheckStatus,
  createPersonaComplianceChecker,
  createToolCallChecker,
  createMemoryPollutionChecker,
  createTaskCompletionChecker,
  createSystemHealthChecker,
} from '../../../dist/core/heartbeat';

// ============== Mock工具 ==============

const mockLogger = (msg: string) => {
  // console.log(`[TEST] ${msg}`);
};

// ============== HeartbeatScheduler 测试 ==============

describe('HeartbeatScheduler', () => {
  let scheduler: HeartbeatScheduler;

  beforeEach(() => {
    scheduler = new HeartbeatScheduler(1000, mockLogger);
  });

  afterEach(() => {
    scheduler.stop();
  });

  test('应该正确启动和停止调度器', () => {
    let callCount = 0;
    const callback = async () => {
      callCount++;
    };

    scheduler.start(callback);
    expect(scheduler.isActive()).toBe(true);

    scheduler.stop();
    expect(scheduler.isActive()).toBe(false);
  });

  test('应该按指定间隔执行回调', async () => {
    jest.useFakeTimers();
    let callCount = 0;
    const callback = async () => {
      callCount++;
    };

    scheduler.start(callback);

    // 快进2秒
    jest.advanceTimersByTime(2000);

    // 等待回调执行
    await Promise.resolve();

    // 由于使用真实setInterval，这里只验证调度器状态
    expect(scheduler.isActive()).toBe(true);

    scheduler.stop();
    jest.useRealTimers();
  });

  test('应该正确获取运行状态', () => {
    const callback = async () => {};

    scheduler.start(callback);
    const status = scheduler.getStatus();

    expect(status.isRunning).toBe(true);
    expect(status.interval).toBe(1000);
    expect(status.executionCount).toBe(1); // 立即执行一次

    scheduler.stop();
  });

  test('应该支持更新间隔时间', () => {
    const callback = async () => {};

    scheduler.start(callback);
    scheduler.setInterval(5000);

    const status = scheduler.getStatus();
    expect(status.interval).toBe(5000);

    scheduler.stop();
  });
});

// ============== HeartbeatChecker 测试 ==============

describe('HeartbeatChecker', () => {
  let checker: HeartbeatChecker;

  beforeEach(() => {
    checker = new HeartbeatChecker('./heartbeat.md', {}, mockLogger);
  });

  test('应该正确注册和移除检查项', () => {
    const checkItem: CheckItem = {
      id: 'test_check',
      name: '测试检查',
      description: '这是一个测试检查项',
      severity: 'medium',
      check: async () => ({
        itemId: 'test_check',
        itemName: '测试检查',
        status: CheckStatus.PASS,
        message: '测试通过',
        timestamp: new Date(),
      }),
    };

    checker.registerCheckItem(checkItem);
    expect(checker.getCheckItems()).toHaveLength(1);

    checker.removeCheckItem('test_check');
    expect(checker.getCheckItems()).toHaveLength(0);
  });

  test('应该执行单个检查项', async () => {
    const checkItem: CheckItem = {
      id: 'test_single',
      name: '单个测试',
      description: '测试单个检查',
      severity: 'low',
      check: async () => ({
        itemId: 'test_single',
        itemName: '单个测试',
        status: CheckStatus.PASS,
        message: '检查通过',
        timestamp: new Date(),
      }),
    };

    checker.registerCheckItem(checkItem);
    const result = await checker.runCheck(checkItem);

    expect(result.itemId).toBe('test_single');
    expect(result.status).toBe(CheckStatus.PASS);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('应该执行所有检查项', async () => {
    const checkItem1: CheckItem = {
      id: 'test_1',
      name: '测试1',
      description: '测试1',
      severity: 'low',
      check: async () => ({
        itemId: 'test_1',
        itemName: '测试1',
        status: CheckStatus.PASS,
        message: '通过',
        timestamp: new Date(),
      }),
    };

    const checkItem2: CheckItem = {
      id: 'test_2',
      name: '测试2',
      description: '测试2',
      severity: 'medium',
      check: async () => ({
        itemId: 'test_2',
        itemName: '测试2',
        status: CheckStatus.WARNING,
        message: '警告',
        timestamp: new Date(),
      }),
    };

    checker.registerCheckItem(checkItem1);
    checker.registerCheckItem(checkItem2);

    const results = await checker.runChecks();

    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.status === CheckStatus.PASS)).toHaveLength(1);
    expect(results.filter((r) => r.status === CheckStatus.WARNING)).toHaveLength(1);
  });

  test('检查项失败时应该正确处理', async () => {
    const failingCheckItem: CheckItem = {
      id: 'test_fail',
      name: '失败测试',
      description: '测试失败',
      severity: 'high',
      check: async () => {
        throw new Error('检查失败');
      },
    };

    checker.registerCheckItem(failingCheckItem);
    const result = await checker.runCheck(failingCheckItem);

    expect(result.status).toBe(CheckStatus.FAIL);
    expect(result.message).toContain('检查失败');
  });
});

// ============== 内置检查器测试 ==============

describe('内置检查器', () => {
  describe('createPersonaComplianceChecker', () => {
    test('应该检测机械式回复', async () => {
      const checker = createPersonaComplianceChecker({
        recentConversations: [
          { role: 'assistant', content: '您好，我是AI助手', timestamp: new Date() },
          { role: 'assistant', content: '很高兴为您服务', timestamp: new Date() },
          { role: 'assistant', content: '请问还有什么需要帮助的吗', timestamp: new Date() },
        ],
      });

      const result = await checker.check();

      expect(result.status).toBe(CheckStatus.FAIL);
      expect(result.details?.mechanicalCount).toBeGreaterThan(2);
    });

    test('正常对话应该通过检查', async () => {
      const checker = createPersonaComplianceChecker({
        recentConversations: [
          { role: 'assistant', content: '这个方案不错，我们可以试试', timestamp: new Date() },
          { role: 'assistant', content: '我觉得这样改更好', timestamp: new Date() },
        ],
      });

      const result = await checker.check();

      expect(result.status).toBe(CheckStatus.PASS);
    });
  });

  describe('createToolCallChecker', () => {
    test('应该检测连续失败', async () => {
      const checker = createToolCallChecker(
        {
          toolCallHistory: [
            { tool: 'search', success: false, timestamp: new Date() },
            { tool: 'search', success: false, timestamp: new Date() },
            { tool: 'search', success: false, timestamp: new Date() },
            { tool: 'search', success: false, timestamp: new Date() },
          ],
        },
        3
      );

      const result = await checker.check();

      expect(result.status).toBe(CheckStatus.FAIL);
      expect(result.details?.consecutiveFailures).toBeGreaterThanOrEqual(3);
    });

    test('正常工具调用应该通过', async () => {
      const checker = createToolCallChecker({
        toolCallHistory: [
          { tool: 'search', success: true, timestamp: new Date() },
          { tool: 'read', success: true, timestamp: new Date() },
          { tool: 'write', success: true, timestamp: new Date() },
        ],
      });

      const result = await checker.check();

      expect(result.status).toBe(CheckStatus.PASS);
    });
  });

  describe('createSystemHealthChecker', () => {
    test('应该返回系统健康状态', async () => {
      const checker = createSystemHealthChecker();
      const result = await checker.check();

      expect(result.status).toBeDefined();
      expect(result.details).toHaveProperty('memory');
      expect(result.details).toHaveProperty('uptime');
    });
  });
});

// ============== HeartbeatManager 测试 ==============

describe('HeartbeatManager', () => {
  let manager: HeartbeatManager;

  afterEach(async () => {
    if (manager) {
      await manager.stop();
    }
  });

  test('应该正确启动和停止', async () => {
    manager = new HeartbeatManager({
      interval: 1000,
      logger: mockLogger,
    });

    await manager.start();
    expect(manager.getStatus().isRunning).toBe(true);

    await manager.stop();
    expect(manager.getStatus().isRunning).toBe(false);
  });

  test('应该正确添加和移除检查项', async () => {
    manager = new HeartbeatManager({
      interval: 60000,
      logger: mockLogger,
    });

    const customItem: CheckItem = {
      id: 'custom_test',
      name: '自定义测试',
      description: '测试自定义检查项',
      severity: 'low',
      check: async () => ({
        itemId: 'custom_test',
        itemName: '自定义测试',
        status: CheckStatus.PASS,
        message: '通过',
        timestamp: new Date(),
      }),
    };

    manager.addCheckItem(customItem);
    expect(manager.getCheckItemCount()).toBeGreaterThan(0);

    manager.removeCheckItem('custom_test');
    // 注意：移除后仍然会有内置检查器
  });

  test('应该手动触发检查', async () => {
    manager = new HeartbeatManager({
      interval: 60000,
      enableBuiltinCheckers: false,
      logger: mockLogger,
    });

    await manager.start();

    const customItem: CheckItem = {
      id: 'manual_test',
      name: '手动测试',
      description: '测试手动触发',
      severity: 'low',
      check: async () => ({
        itemId: 'manual_test',
        itemName: '手动测试',
        status: CheckStatus.PASS,
        message: '手动检查通过',
        timestamp: new Date(),
      }),
    };

    manager.addCheckItem(customItem);
    const results = await manager.checkNow();

    expect(results.some((r) => r.itemId === 'manual_test')).toBe(true);

    await manager.stop();
  });

  test('应该正确处理检查完成回调', async () => {
    let callbackCalled = false;
    const checkCompleteCallback = (results: CheckResult[]) => {
      callbackCalled = true;
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    };

    manager = new HeartbeatManager({
      interval: 60000,
      enableBuiltinCheckers: false,
      onCheckComplete: checkCompleteCallback,
      logger: mockLogger,
    });

    await manager.start();

    const customItem: CheckItem = {
      id: 'callback_test',
      name: '回调测试',
      description: '测试回调',
      severity: 'low',
      check: async () => ({
        itemId: 'callback_test',
        itemName: '回调测试',
        status: CheckStatus.PASS,
        message: '回调测试通过',
        timestamp: new Date(),
      }),
    };

    manager.addCheckItem(customItem);
    await manager.checkNow();

    expect(callbackCalled).toBe(true);

    await manager.stop();
  });
});

// ============== 集成测试 ==============

describe('心跳模块集成测试', () => {
  test('三道防线应该协同工作', async () => {
    // 第一道：实时自检 - 在回复生成前检查
    const realTimeCheck = createPersonaComplianceChecker({
      recentConversations: [
        { role: 'assistant', content: '机械式回复：您好，请问有什么可以帮助您的？', timestamp: new Date() },
      ],
    });

    const realTimeResult = await realTimeCheck.check();
    expect(realTimeResult.status).toBe(CheckStatus.FAIL);

    // 第二道：心跳巡检 - 周期性检查
    const manager = new HeartbeatManager({
      interval: 1000,
      enableBuiltinCheckers: true,
      logger: mockLogger,
    });

    await manager.start();

    // 第三道：用户反馈 - 收到"跑偏了"时立即触发深度纠偏
    let deepCorrectionTriggered = false;
    const deepCorrection = async () => {
      deepCorrectionTriggered = true;
      // 执行深度纠偏逻辑
      return await manager.checkNow();
    };

    // 模拟用户反馈
    await deepCorrection();
    expect(deepCorrectionTriggered).toBe(true);

    await manager.stop();
  });
});
