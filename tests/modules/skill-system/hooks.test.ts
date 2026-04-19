/**
 * 技能钩子测试
 * Skill Hooks Tests
 */

import { SkillHooks, HookEvent } from '../../../dist/modules/skill-system/hooks/SkillHooks';

describe('SkillHooks', () => {
  let hooks: SkillHooks;

  beforeEach(() => {
    hooks = new SkillHooks();
  });

  afterEach(async () => {
    await hooks.destroy();
  });

  describe('register', () => {
    it('should register a hook', async () => {
      const fn = jest.fn();
      hooks.register(HookEvent.BEFORE_INSTALL, fn);
      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });
      expect(fn).toHaveBeenCalled();
    });

    it('should support multiple hooks for same event', async () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      hooks.register(HookEvent.AFTER_INSTALL, fn1);
      hooks.register(HookEvent.AFTER_INSTALL, fn2);

      await hooks.trigger(HookEvent.AFTER_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        installInfo: {
          skillId: 'skill1',
          installPath: '/path',
          installedAt: new Date(),
          dependencies: [],
        },
        success: true,
        timestamp: new Date(),
      });

      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });
  });

  describe('specific event hooks', () => {
    it('should support onBeforeInstall', async () => {
      const fn = jest.fn();
      hooks.onBeforeInstall(fn);

      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'npm://test',
        timestamp: new Date(),
      });

      expect(fn).toHaveBeenCalled();
    });

    it('should support onAfterInstall', async () => {
      const fn = jest.fn();
      hooks.onAfterInstall(fn);

      await hooks.trigger(HookEvent.AFTER_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        installInfo: {
          skillId: 'skill1',
          installPath: '/path',
          installedAt: new Date(),
          dependencies: [],
        },
        success: true,
        timestamp: new Date(),
      });

      expect(fn).toHaveBeenCalled();
    });

    it('should support onBeforeExecute', async () => {
      const fn = jest.fn();
      hooks.onBeforeExecute(fn);

      await hooks.trigger(HookEvent.BEFORE_EXECUTE, {
        executionId: 'test',
        skillId: 'skill1',
        input: { arg: 'value' },
        timestamp: new Date(),
      });

      expect(fn).toHaveBeenCalled();
    });

    it('should support onAfterExecute', async () => {
      const fn = jest.fn();
      hooks.onAfterExecute(fn);

      await hooks.trigger(HookEvent.AFTER_EXECUTE, {
        executionId: 'test',
        skillId: 'skill1',
        result: {
          output: 'result',
          status: 'success',
          duration: 100,
        },
        success: true,
        timestamp: new Date(),
      });

      expect(fn).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should unregister a hook', async () => {
      const fn = jest.fn();
      hooks.register(HookEvent.BEFORE_INSTALL, fn);
      hooks.unregister(HookEvent.BEFORE_INSTALL, fn);

      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });

      expect(fn).not.toHaveBeenCalled();
    });

    it('should unregister all hooks for an event', async () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      hooks.register(HookEvent.BEFORE_INSTALL, fn1);
      hooks.register(HookEvent.BEFORE_INSTALL, fn2);
      hooks.unregisterAll(HookEvent.BEFORE_INSTALL);

      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle hook errors gracefully', async () => {
      const errorFn = jest.fn().mockRejectedValue(new Error('Hook error'));
      const continueFn = jest.fn();

      hooks.onBeforeInstall(errorFn);
      hooks.onBeforeInstall(continueFn);

      // 应该不抛出错误，继续执行其他钩子
      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });

      expect(continueFn).toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('should track hook execution stats', async () => {
      hooks.onBeforeInstall(jest.fn());

      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });

      const stats = hooks.getStats();
      expect(stats[HookEvent.BEFORE_INSTALL].success).toBe(1);
    });

    it('should reset stats', async () => {
      hooks.onBeforeInstall(jest.fn());

      await hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId: 'test',
        skillId: 'skill1',
        source: 'test',
        timestamp: new Date(),
      });

      hooks.resetStats();
      const stats = hooks.getStats();
      expect(stats[HookEvent.BEFORE_INSTALL].success).toBe(0);
    });
  });
});
