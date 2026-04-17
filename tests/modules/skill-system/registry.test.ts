/**
 * 技能注册表测试
 * Skill Registry Tests
 */

import { SkillRegistry } from '../src/modules/skill-system/core/SkillRegistry';
import { SkillLifecycleStatus } from '../src/modules/skill-system/interfaces/ISkillSystem';
import * as fs from 'fs';
import * as path from 'path';

describe('SkillRegistry', () => {
  const testRegistryPath = path.join(__dirname, 'test-registry');
  let registry: SkillRegistry;

  beforeEach(async () => {
    // 清理测试目录
    if (fs.existsSync(testRegistryPath)) {
      await fs.promises.rm(testRegistryPath, { recursive: true });
    }
    registry = new SkillRegistry({
      registryPath: testRegistryPath,
      persist: false,
    });
    await registry.initialize();
  });

  afterEach(async () => {
    await registry.destroy();
    if (fs.existsSync(testRegistryPath)) {
      await fs.promises.rm(testRegistryPath, { recursive: true });
    }
  });

  describe('register', () => {
    it('should register a new skill', async () => {
      const metadata = {
        id: 'test-skill-1',
        name: 'Test Skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      const skillInfo = await registry.register(
        metadata,
        'user1',
        'tenant1',
        '/path/to/skill'
      );

      expect(skillInfo.id).toBe(metadata.id);
      expect(skillInfo.name).toBe(metadata.name);
      expect(skillInfo.lifecycleStatus).toBe(SkillLifecycleStatus.REGISTERED);
    });

    it('should throw error when registering duplicate skill', async () => {
      const metadata = {
        id: 'test-skill-1',
        name: 'Test Skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      await registry.register(metadata, 'user1', 'tenant1', '/path/to/skill');

      await expect(
        registry.register(metadata, 'user1', 'tenant1', '/path/to/skill')
      ).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should return skill info', async () => {
      const metadata = {
        id: 'test-skill-1',
        name: 'Test Skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      await registry.register(metadata, 'user1', 'tenant1', '/path/to/skill');
      const skillInfo = registry.get('test-skill-1');

      expect(skillInfo).not.toBeNull();
      expect(skillInfo?.id).toBe(metadata.id);
    });

    it('should return null for non-existent skill', () => {
      const skillInfo = registry.get('non-existent');
      expect(skillInfo).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing skill', async () => {
      const metadata = {
        id: 'test-skill-1',
        name: 'Test Skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      await registry.register(metadata, 'user1', 'tenant1', '/path/to/skill');
      expect(registry.has('test-skill-1')).toBe(true);
    });

    it('should return false for non-existent skill', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getUserSkills', () => {
    it('should return all skills for user', async () => {
      await registry.register(
        { id: 'skill-1', name: 'Skill 1', version: '1.0.0', description: '' },
        'user1',
        'tenant1',
        '/path/1'
      );
      await registry.register(
        { id: 'skill-2', name: 'Skill 2', version: '1.0.0', description: '' },
        'user1',
        'tenant1',
        '/path/2'
      );
      await registry.register(
        { id: 'skill-3', name: 'Skill 3', version: '1.0.0', description: '' },
        'user2',
        'tenant1',
        '/path/3'
      );

      const skills = registry.getUserSkills('user1', 'tenant1');
      expect(skills).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('should find skills by name', async () => {
      await registry.register(
        {
          id: 'python-skill',
          name: 'Python Helper',
          version: '1.0.0',
          description: 'A Python skill',
        },
        'user1',
        'tenant1',
        '/path/1'
      );
      await registry.register(
        {
          id: 'js-skill',
          name: 'JavaScript Helper',
          version: '1.0.0',
          description: 'A JS skill',
        },
        'user1',
        'tenant1',
        '/path/2'
      );

      const results = registry.search('Python');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('python-skill');
    });

    it('should find skills by description', async () => {
      await registry.register(
        {
          id: 'data-skill',
          name: 'Data Processor',
          version: '1.0.0',
          description: 'Process CSV files',
        },
        'user1',
        'tenant1',
        '/path/1'
      );

      const results = registry.search('CSV');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('data-skill');
    });
  });

  describe('enable/disable', () => {
    it('should enable skill', async () => {
      await registry.register(
        {
          id: 'test-skill',
          name: 'Test Skill',
          version: '1.0.0',
          description: '',
        },
        'user1',
        'tenant1',
        '/path'
      );

      await registry.disable('test-skill');
      expect(registry.get('test-skill')?.lifecycleStatus).toBe(
        SkillLifecycleStatus.DISABLED
      );

      await registry.enable('test-skill');
      expect(registry.get('test-skill')?.lifecycleStatus).toBe(
        SkillLifecycleStatus.ENABLED
      );
    });
  });

  describe('unregister', () => {
    it('should unregister skill', async () => {
      await registry.register(
        {
          id: 'test-skill',
          name: 'Test Skill',
          version: '1.0.0',
          description: '',
        },
        'user1',
        'tenant1',
        '/path'
      );

      await registry.unregister('test-skill');
      expect(registry.has('test-skill')).toBe(false);
    });
  });

  describe('events', () => {
    it('should emit registered event', async () => {
      const listener = jest.fn();
      registry.on('registered', listener);

      await registry.register(
        {
          id: 'test-skill',
          name: 'Test Skill',
          version: '1.0.0',
          description: '',
        },
        'user1',
        'tenant1',
        '/path'
      );

      expect(listener).toHaveBeenCalled();
    });
  });
});
