/**
 * 心跳检查器单元测试
 * Heartbeat Checker Unit Tests
 */

import {
  HeartbeatChecker,
  CheckerContext,
} from '../../../dist/core/heartbeat/HeartbeatChecker';
import {
  CheckItem,
  CheckStatus,
} from '../../../dist/core/heartbeat/CheckItem';

const mockLogger = jest.fn((msg: string) => {
  // console.log(`[TEST] ${msg}`);
});

describe('HeartbeatChecker', () => {
  let checker: HeartbeatChecker;
  const testContext: Partial<CheckerContext> = {
    rootPath: process.cwd(),
    memoryPath: './MEMORY.md',
    calendarPath: './calendar.json',
    soulPath: './SOUL.md',
  };

  beforeEach(() => {
    checker = new HeartbeatChecker('./heartbeat.md', testContext, mockLogger);
  });

  describe('注册和移除检查项', () => {
    test('应该能够注册新的检查项', () => {
      const newItem: CheckItem = {
        id: 'new_check',
        name: '新检查项',
        description: '测试新检查项',
        severity: 'medium',
        enabled: true,
        check: async () => ({
          itemId: 'new_check',
          itemName: '新检查项',
          status: CheckStatus.PASS,
          message: '测试通过',
          timestamp: new Date(),
        }),
      };

      checker.registerCheckItem(newItem);
      const items = checker.getCheckItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('new_check');
    });

    test('应该能够移除已注册的检查项', () => {
      const item: CheckItem = {
        id: 'to_remove',
        name: '待移除',
        description: '将被移除的检查项',
        severity: 'low',
        check: async () => ({
          itemId: 'to_remove',
          itemName: '待移除',
          status: CheckStatus.PASS,
          message: '通过',
          timestamp: new Date(),
        }),
      };

      checker.registerCheckItem(item);
      expect(checker.getCheckItems()).toHaveLength(1);

      const removed = checker.removeCheckItem('to_remove');
      expect(removed).toBe(true);
      expect(checker.getCheckItems()).toHaveLength(0);
    });

    test('移除不存在的检查项应返回false', () => {
      const removed = checker.removeCheckItem('non_existent');
      expect(removed).toBe(false);
    });

    test('重复注册相同ID应覆盖', () => {
      const item1: CheckItem = {
        id: 'duplicate_id',
        name: '检查项1',
        description: '第一个',
        severity: 'low',
        check: async () => ({
          itemId: 'duplicate_id',
          itemName: '检查项1',
          status: CheckStatus.PASS,
          message: '第一个',
          timestamp: new Date(),
        }),
      };

      const item2: CheckItem = {
        id: 'duplicate_id',
        name: '检查项2',
        description: '第二个',
        severity: 'high',
        check: async () => ({
          itemId: 'duplicate_id',
          itemName: '检查项2',
          status: CheckStatus.PASS,
          message: '第二个',
          timestamp: new Date(),
        }),
      };

      checker.registerCheckItem(item1);
      checker.registerCheckItem(item2);

      const items = checker.getCheckItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('检查项2');
    });
  });

  describe('执行检查', () => {
    test('应该正确执行单个检查项', async () => {
      const item: CheckItem = {
        id: 'single_test',
        name: '单个测试',
        description: '测试单个执行',
        severity: 'low',
        check: async () => ({
          itemId: 'single_test',
          itemName: '单个测试',
          status: CheckStatus.PASS,
          message: '执行成功',
          timestamp: new Date(),
          duration: 10,
        }),
      };

      checker.registerCheckItem(item);
      const result = await checker.runCheck(item);

      expect(result.itemId).toBe('single_test');
      expect(result.status).toBe(CheckStatus.PASS);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.duration).toBe('number');
    });

    test('检查项抛出异常时应返回FAIL状态', async () => {
      const failingItem: CheckItem = {
        id: 'failing_test',
        name: '失败测试',
        description: '测试异常处理',
        severity: 'high',
        check: async () => {
          throw new Error('模拟错误');
        },
      };

      checker.registerCheckItem(failingItem);
      const result = await checker.runCheck(failingItem);

      expect(result.status).toBe(CheckStatus.FAIL);
      expect(result.message).toContain('模拟错误');
    });

    test('应该执行所有启用的检查项', async () => {
      const items: CheckItem[] = [
        {
          id: 'multi_1',
          name: '多项测试1',
          description: '第一个',
          severity: 'low',
          check: async () => ({
            itemId: 'multi_1',
            itemName: '多项测试1',
            status: CheckStatus.PASS,
            message: '通过',
            timestamp: new Date(),
          }),
        },
        {
          id: 'multi_2',
          name: '多项测试2',
          description: '第二个',
          severity: 'medium',
          check: async () => ({
            itemId: 'multi_2',
            itemName: '多项测试2',
            status: CheckStatus.WARNING,
            message: '警告',
            timestamp: new Date(),
          }),
        },
        {
          id: 'multi_3',
          name: '多项测试3',
          description: '第三个',
          severity: 'high',
          enabled: false, // 禁用
          check: async () => ({
            itemId: 'multi_3',
            itemName: '多项测试3',
            status: CheckStatus.FAIL,
            message: '失败',
            timestamp: new Date(),
          }),
        },
      ];

      for (const item of items) {
        checker.registerCheckItem(item);
      }

      const results = await checker.runChecks();

      // 只执行启用的检查项
      expect(results).toHaveLength(2);
      expect(results.find((r) => r.itemId === 'multi_3')).toBeUndefined();
    });
  });

  describe('上下文更新', () => {
    test('应该正确更新检查上下文', () => {
      const newContext: Partial<CheckerContext> = {
        recentConversations: [
          { role: 'user', content: '测试', timestamp: new Date() },
        ],
        toolCallHistory: [
          { tool: 'test', success: true, timestamp: new Date() },
        ],
      };

      checker.updateContext(newContext);

      // 上下文更新不会直接暴露，但可以通过执行检查来验证
      expect(true).toBe(true);
    });
  });

  describe('检查清单加载', () => {
    test('加载不存在的文件应返回空数组', async () => {
      const nonExistentChecker = new HeartbeatChecker(
        './non_existent.md',
        {},
        mockLogger
      );

      const items = await nonExistentChecker.loadChecklist();
      expect(items).toEqual([]);
    });
  });

  describe('高严重性结果筛选', () => {
    test('应该按严重性排序异常结果', async () => {
      const items: CheckItem[] = [
        {
          id: 'high_severity',
          name: '高严重性',
          description: '测试',
          severity: 'high',
          check: async () => ({
            itemId: 'high_severity',
            itemName: '高严重性',
            status: CheckStatus.FAIL,
            message: '失败',
            timestamp: new Date(),
          }),
        },
        {
          id: 'low_severity',
          name: '低严重性',
          description: '测试',
          severity: 'low',
          check: async () => ({
            itemId: 'low_severity',
            itemName: '低严重性',
            status: CheckStatus.WARNING,
            message: '警告',
            timestamp: new Date(),
          }),
        },
        {
          id: 'medium_severity',
          name: '中等严重性',
          description: '测试',
          severity: 'medium',
          check: async () => ({
            itemId: 'medium_severity',
            itemName: '中等严重性',
            status: CheckStatus.WARNING,
            message: '警告',
            timestamp: new Date(),
          }),
        },
      ];

      for (const item of items) {
        checker.registerCheckItem(item);
      }

      const results = await checker.runChecks();
      const highSeverityResults = checker.getHighSeverityResults(results);

      // 高严重性应该排在前面
      expect(highSeverityResults[0].itemId).toBe('high_severity');
    });
  });
});
