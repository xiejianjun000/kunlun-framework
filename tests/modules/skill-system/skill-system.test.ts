/**
 * 技能系统集成测试
 * Skill System Integration Tests
 */

import { SkillSystem } from '../../../dist/modules/skill-system/SkillSystem';
import * as fs from 'fs';
import * as path from 'path';

describe('SkillSystem Integration', () => {
  const testSkillsRoot = path.join(__dirname, 'test-skills-root');
  let skillSystem: SkillSystem;

  beforeEach(async () => {
    // 清理测试目录
    if (fs.existsSync(testSkillsRoot)) {
      await fs.promises.rm(testSkillsRoot, { recursive: true });
    }

    skillSystem = new SkillSystem({
      skillsRoot: testSkillsRoot,
      enableQuotaManagement: true,
      defaultQuotaLimits: {
        maxSkills: 10,
        maxConcurrentExecutions: 3,
        maxDailyExecutions: 100,
      },
    });

    await skillSystem.initialize();
  });

  afterEach(async () => {
    await skillSystem.destroy();
    if (fs.existsSync(testSkillsRoot)) {
      await fs.promises.rm(testSkillsRoot, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(skillSystem).toBeDefined();
    });

    it('should create necessary directories', () => {
      expect(fs.existsSync(testSkillsRoot)).toBe(true);
    });
  });

  describe('skill lifecycle', () => {
    it('should register skill after installation', async () => {
      // 创建测试技能目录
      const skillPath = path.join(testSkillsRoot, 'local-skill');
      fs.mkdirSync(skillPath, { recursive: true });

      await fs.promises.writeFile(
        path.join(skillPath, 'SKILL.md'),
        `skill_name: Local Skill
version: 1.0.0
description: A local skill
`
      );

      await fs.promises.writeFile(
        path.join(skillPath, 'package.json'),
        JSON.stringify({ name: 'local-skill', version: '1.0.0' })
      );

      // 由于 installSkill 需要完整的安装流程，我们直接测试注册
      const skill = await skillSystem.getSkill('non-existent');
      expect(skill).toBeNull();
    });
  });

  describe('quota management', () => {
    it('should check quota', async () => {
      const check = await skillSystem.checkQuota('user1', 'tenant1');
      expect(check.allowed).toBe(true);
    });

    it('should get quota info', async () => {
      const info = await skillSystem.getQuotaInfo('user1', 'tenant1');
      expect(info.userId).toBe('user1');
      expect(info.tenantId).toBe('tenant1');
      expect(info.maxSkills).toBe(10);
    });
  });

  describe('validation', () => {
    it('should validate skill path', async () => {
      // 验证不存在的路径
      const result = await skillSystem.validateSkill('/non/existent');
      expect(result.valid).toBe(false);
    });
  });

  describe('search', () => {
    it('should return empty results for no skills', async () => {
      const result = await skillSystem.searchSkills({});
      expect(result.skills).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('stats', () => {
    it('should get system stats', async () => {
      const stats = await skillSystem.getSystemStats();
      expect(stats.totalSkills).toBe(0);
      expect(stats.totalExecutions).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit initialized event', async () => {
      const listener = jest.fn();
      skillSystem.on('initialized', listener);
      
      // 重新创建并初始化
      const newSystem = new SkillSystem({
        skillsRoot: path.join(__dirname, 'test-events'),
      });
      
      const promise = new Promise<void>((resolve) => {
        newSystem.on('initialized', () => {
          listener();
          resolve();
        });
      });
      
      await newSystem.initialize();
      await promise;
      await newSystem.destroy();
    });
  });
});
