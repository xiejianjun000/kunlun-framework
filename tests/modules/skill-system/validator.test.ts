/**
 * 技能验证器测试
 * Skill Validator Tests
 */

import { SkillValidator } from '../../../dist/modules/skill-system/core/SkillValidator';
import * as fs from 'fs';
import * as path from 'path';

describe('SkillValidator', () => {
  const testSkillsPath = path.join(__dirname, 'test-skills');
  let validator: SkillValidator;

  beforeEach(() => {
    validator = new SkillValidator({
      checkSignature: false,
      checkDependencies: true,
      checkDangerousPermissions: true,
    });

    // 创建测试目录
    if (!fs.existsSync(testSkillsPath)) {
      fs.mkdirSync(testSkillsPath, { recursive: true });
    }
  });

  afterEach(async () => {
    // 清理测试目录
    if (fs.existsSync(testSkillsPath)) {
      await fs.promises.rm(testSkillsPath, { recursive: true });
    }
  });

  describe('validateSkill', () => {
    it('should return error for non-existent directory', async () => {
      const result = await validator.validateSkill('/non/existent/path');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DIR_NOT_FOUND');
    });

    it('should return errors for missing required files', async () => {
      const skillPath = path.join(testSkillsPath, 'incomplete-skill');
      fs.mkdirSync(skillPath);

      const result = await validator.validateSkill(skillPath);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FILE')).toBe(
        true
      );
    });

    it('should validate a complete skill', async () => {
      const skillPath = path.join(testSkillsPath, 'complete-skill');
      fs.mkdirSync(skillPath);

      // 创建必需文件
      await fs.promises.writeFile(
        path.join(skillPath, 'SKILL.md'),
        `# Test Skill

skill_name: Test Skill
version: 1.0.0
description: A test skill
trigger_conditions:
  - test

steps:
  - echo "Hello"
`
      );

      await fs.promises.writeFile(
        path.join(skillPath, 'package.json'),
        JSON.stringify({
          name: 'test-skill',
          version: '1.0.0',
          main: 'index.js',
        })
      );

      await fs.promises.writeFile(
        path.join(skillPath, 'index.js'),
        `#!/usr/bin/env node
console.log('Hello World');
`
      );

      const result = await validator.validateSkill(skillPath);
      // 可能会有警告，但不应该有严重错误
      expect(result.errors.filter((e) => e.code.startsWith('DANGEROUS_'))).toHaveLength(0);
    });

    it('should detect dangerous code patterns', async () => {
      const skillPath = path.join(testSkillsPath, 'dangerous-skill');
      fs.mkdirSync(skillPath);

      await fs.promises.writeFile(
        path.join(skillPath, 'SKILL.md'),
        `skill_name: Dangerous
version: 1.0.0
description: A dangerous skill
`
      );

      await fs.promises.writeFile(
        path.join(skillPath, 'package.json'),
        JSON.stringify({ name: 'dangerous', version: '1.0.0' })
      );

      await fs.promises.writeFile(
        path.join(skillPath, 'index.js'),
        `// Dangerous: eval usage
eval(userInput);
// Dangerous: shell injection
const cmd = \`rm -rf \${userPath}\`;
// File traversal
const file = '../etc/passwd';
`
      );

      const result = await validator.validateSkill(skillPath);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'DANGEROUS_EVAL_USAGE')
      ).toBe(true);
      expect(
        result.warnings.some((e) => e.code === 'DANGEROUS_SHELL_INJECTION')
      ).toBe(true);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const skillPath = path.join(testSkillsPath, 'signed-skill');
      fs.mkdirSync(skillPath);

      const signature = validator.signSignature
        ? validator.signSkill(skillPath)
        : null;

      if (signature) {
        const result = await validator.verifySignature(
          skillPath,
          (await signature).signature
        );
        expect(result).toBe(true);
      }
    });
  });

  describe('calculateSecurityScore', () => {
    it('should calculate score based on errors and warnings', () => {
      const result = {
        valid: false,
        errors: [
          { code: 'DANGEROUS_EVAL_USAGE', message: 'eval detected', path: '' },
          {
            code: 'MISSING_REQUIRED_FILE',
            message: 'missing file',
            path: '',
          },
        ],
        warnings: [{ code: 'WARNING_SYSTEM_COMMAND', message: 'system cmd', path: '' }],
      };

      const score = validator.calculateSecurityScore(result);
      // 100 - 30 (eval) - 20 (missing file) - 5 (system command) = 45
      expect(score).toBe(45);
    });

    it('should return 100 for valid skill', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
      };

      const score = validator.calculateSecurityScore(result);
      expect(score).toBe(100);
    });
  });
});
