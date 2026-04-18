/**
 * 技能验证器
 * Skill Validator - 签名验证与安全检查
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';
import {
  SkillValidationResult,
  SkillValidationError,
  SkillValidationWarning,
  SkillSignature,
} from '../interfaces/skill.types';

/**
 * 验证规则配置
 */
export interface ValidationRules {
  /** 是否检查签名 */
  checkSignature?: boolean;
  /** 是否检查依赖安全 */
  checkDependencies?: boolean;
  /** 是否检查危险权限 */
  checkDangerousPermissions?: boolean;
  /** 是否检查网络访问 */
  checkNetworkAccess?: boolean;
  /** 是否检查文件系统访问 */
  checkFileSystemAccess?: boolean;
  /** 是否检查环境变量访问 */
  checkEnvVarsAccess?: boolean;
  /** 允许的权限列表 */
  allowedPermissions?: string[];
  /** 禁止的权限列表 */
  blockedPermissions?: string[];
}

/**
 * 危险模式定义
 */
interface DangerousPattern {
  /** 模式名称 */
  name: string;
  /** 正则表达式 */
  pattern: RegExp;
  /** 严重级别 */
  severity: 'high' | 'medium' | 'low';
  /** 描述 */
  description: string;
}

/**
 * 技能验证结果
 */
interface SkillValidationOutput {
  valid: boolean;
  errors: SkillValidationError[];
  warnings: SkillValidationWarning[];
  securityScore: number;
}

/**
 * 技能验证器
 * 提供技能的安全验证和签名检查功能
 */
export class SkillValidator {
  /** 验证规则 */
  private rules: ValidationRules;
  /** 危险模式列表 */
  private dangerousPatterns: DangerousPattern[];

  /**
   * 构造函数
   * @param rules - 验证规则
   */
  constructor(rules: ValidationRules = {}) {
    this.rules = {
      checkSignature: rules.checkSignature ?? false,
      checkDependencies: rules.checkDependencies ?? true,
      checkDangerousPermissions: rules.checkDangerousPermissions ?? true,
      checkNetworkAccess: rules.checkNetworkAccess ?? true,
      checkFileSystemAccess: rules.checkFileSystemAccess ?? true,
      checkEnvVarsAccess: rules.checkEnvVarsAccess ?? true,
      allowedPermissions: rules.allowedPermissions ?? [],
      blockedPermissions: rules.blockedPermissions ?? [],
    };

    // 初始化危险模式
    this.dangerousPatterns = this.initDangerousPatterns();
  }

  /**
   * 验证技能目录
   * @param skillPath - 技能目录路径
   */
  async validateSkill(skillPath: string): Promise<SkillValidationResult> {
    const errors: SkillValidationError[] = [];
    const warnings: SkillValidationWarning[] = [];

    // 检查目录是否存在
    if (!fs.existsSync(skillPath)) {
      errors.push({
        code: 'DIR_NOT_FOUND',
        message: `技能目录不存在: ${skillPath}`,
        path: skillPath,
      });
      return { valid: false, errors, warnings };
    }

    // 检查必需文件
    await this.checkRequiredFiles(skillPath, errors, warnings);

    // 检查 SKILL.md 文件
    await this.checkSkillFile(skillPath, errors, warnings);

    // 检查脚本文件
    await this.checkScriptFiles(skillPath, errors, warnings);

    // 检查危险代码
    await this.checkDangerousCode(skillPath, errors, warnings);

    // 检查依赖
    if (this.rules.checkDependencies) {
      await this.checkDependencies(skillPath, errors, warnings);
    }

    // 检查权限
    if (this.rules.checkDangerousPermissions) {
      await this.checkPermissions(skillPath, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证签名
   * @param skillPath - 技能目录路径
   * @param signature - 签名
   * @param publicKey - 公钥（可选）
   */
  verifySignature(
    skillPath: string,
    signature: string,
    publicKey?: string
  ): boolean {
    try {
      // 计算文件哈希
      const hash = this.calculateDirectoryHash(skillPath);

      // 如果提供公钥，进行非对称验证
      if (publicKey) {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(hash);
        return verifier.verify(publicKey, signature, 'base64');
      }

      // 否则进行简单的签名验证
      const expectedSignature = this.calculateSignature(hash);
      return signature === expectedSignature;
    } catch (error) {
      console.error('签名验证失败:', error);
      return false;
    }
  }

  /**
   * 生成签名
   * @param skillPath - 技能目录路径
   * @param privateKey - 私钥（可选）
   */
  async signSkill(skillPath: string, privateKey?: string): Promise<SkillSignature> {
    const hash = this.calculateDirectoryHash(skillPath);
    const algorithm: 'sha256' | 'sha512' = 'sha256';

    let signature: string;
    if (privateKey) {
      // 使用私钥签名
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(hash);
      signature = signer.sign(privateKey, 'base64');
    } else {
      // 使用 HMAC 签名
      signature = this.calculateSignature(hash);
    }

    return {
      skillId: path.basename(skillPath),
      algorithm,
      signature,
      signedAt: new Date(),
    };
  }

  /**
   * 验证依赖安全性
   * @param dependencies - 依赖列表
   */
  async validateDependencies(dependencies: string[]): Promise<{
    valid: boolean;
    unsafeDeps: string[];
    warnings: string[];
  }> {
    const unsafeDeps: string[] = [];
    const warnings: string[] = [];

    // 已知的不安全依赖列表
    const knownUnsafeDeps = [
      'eval',
      'child_process.execSync',
      'osascript',
    ];

    for (const dep of dependencies) {
      // 检查是否包含已知的不安全依赖
      if (knownUnsafeDeps.some((unsafe) => dep.includes(unsafe))) {
        unsafeDeps.push(dep);
        warnings.push(`不安全的依赖: ${dep}`);
      }
    }

    return {
      valid: unsafeDeps.length === 0,
      unsafeDeps,
      warnings,
    };
  }

  // ============== 私有方法 ==============

  /**
   * 初始化危险模式
   */
  private initDangerousPatterns(): DangerousPattern[] {
    return [
      {
        name: 'eval_usage',
        pattern: /\beval\s*\(/g,
        severity: 'high',
        description: '使用 eval() 可能导致代码注入',
      },
      {
        name: 'shell_injection',
        pattern: /\$\{.*\}|`[^`]*`/g,
        severity: 'high',
        description: '可能存在命令注入风险',
      },
      {
        name: 'file_read_traversal',
        pattern: new RegExp('\\.\\./|\\.\\\\', 'g'),
        severity: 'medium',
        description: '可能存在路径遍历漏洞',
      },
      {
        name: 'process_kill',
        pattern: /process\.kill|os\.kill/g,
        severity: 'high',
        description: '可能终止其他进程',
      },
      {
        name: 'env_exposure',
        pattern: /process\.env\.(SECRET|PASSWORD|TOKEN|KEY)/gi,
        severity: 'medium',
        description: '可能暴露敏感环境变量',
      },
      {
        name: 'network_request',
        pattern: /fetch\(|axios\.|http\.request|https\.request/g,
        severity: 'low',
        description: '存在网络请求',
      },
    ];
  }

  /**
   * 检查必需文件
   */
  private async checkRequiredFiles(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    const requiredFiles = ['SKILL.md', 'index.js', 'package.json'];
    const optionalFiles = ['README.md', '.skillignore'];

    for (const file of requiredFiles) {
      const filePath = path.join(skillPath, file);
      if (!fs.existsSync(filePath)) {
        errors.push({
          code: 'MISSING_REQUIRED_FILE',
          message: `缺少必需文件: ${file}`,
          path: filePath,
        });
      }
    }

    for (const file of optionalFiles) {
      const filePath = path.join(skillPath, file);
      if (!fs.existsSync(filePath)) {
        warnings.push({
          code: 'MISSING_OPTIONAL_FILE',
          message: `缺少可选文件: ${file}`,
          path: filePath,
        });
      }
    }
  }

  /**
   * 检查 SKILL.md 文件
   */
  private async checkSkillFile(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      return;
    }

    try {
      const content = await fs.promises.readFile(skillMdPath, 'utf-8');

      // 检查必需的字段
      const requiredFields = ['skill_name', 'version', 'description', 'trigger_conditions'];
      for (const field of requiredFields) {
        if (!content.toLowerCase().includes(field.toLowerCase())) {
          warnings.push({
            code: 'MISSING_FIELD',
            message: `SKILL.md 缺少字段: ${field}`,
            path: skillMdPath,
          });
        }
      }

      // 检查版本格式
      const versionMatch = content.match(/version:\s*(\d+\.\d+\.\d+)/i);
      if (!versionMatch) {
        warnings.push({
          code: 'INVALID_VERSION',
          message: 'SKILL.md 中未找到有效版本号',
          path: skillMdPath,
        });
      }
    } catch (error) {
      errors.push({
        code: 'FILE_READ_ERROR',
        message: `无法读取 SKILL.md: ${error}`,
        path: skillMdPath,
      });
    }
  }

  /**
   * 检查脚本文件
   */
  private async checkScriptFiles(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    const scriptFiles = this.findScriptFiles(skillPath);

    for (const file of scriptFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');

        // 检查 shebang
        const firstLine = content.split('\n')[0];
        if (!firstLine.startsWith('#!')) {
          warnings.push({
            code: 'MISSING_SHEBANG',
            message: `脚本文件缺少 shebang: ${path.relative(skillPath, file)}`,
            path: file,
          });
        }

        // 检查危险模式
        for (const pattern of this.dangerousPatterns) {
          if (pattern.pattern.test(content)) {
            if (pattern.severity === 'high') {
              errors.push({
                code: `DANGEROUS_${pattern.name.toUpperCase()}`,
                message: pattern.description,
                path: file,
              });
            } else {
              warnings.push({
                code: `WARNING_${pattern.name.toUpperCase()}`,
                message: pattern.description,
                path: file,
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          code: 'FILE_READ_ERROR',
          message: `无法读取脚本文件: ${error}`,
          path: file,
        });
      }
    }
  }

  /**
   * 检查危险代码
   */
  private async checkDangerousCode(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    const scriptFiles = this.findScriptFiles(skillPath);

    for (const file of scriptFiles) {
      const content = await fs.promises.readFile(file, 'utf-8');

      // 检查 base64 解码执行
      if (/atob\s*\(|btoa\s*\(|Buffer\.from.*\.toString\(\)/.test(content)) {
        warnings.push({
          code: 'BASE64_DECODE',
          message: '检测到 base64 解码操作',
          path: file,
        });
      }

      // 检查动态代码加载
      if (/new\s+Function\(|vm\.runInContext/.test(content)) {
        errors.push({
          code: 'DYNAMIC_CODE',
          message: '检测到动态代码执行',
          path: file,
        });
      }

      // 检查系统命令执行
      if (/child_process|exec\(|spawn\(|fork\(/.test(content)) {
        if (this.rules.checkDangerousPermissions) {
          warnings.push({
            code: 'SYSTEM_COMMAND',
            message: '检测到系统命令执行',
            path: file,
          });
        }
      }
    }
  }

  /**
   * 检查依赖
   */
  private async checkDependencies(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    const packageJsonPath = path.join(skillPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    try {
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // 检查 scripts 中的危险命令
      if (packageJson.scripts) {
        const dangerousScripts = ['rm -rf', 'del /', 'format'];
        for (const [name, cmd] of Object.entries(packageJson.scripts)) {
          for (const dangerous of dangerousScripts) {
            if (cmd.includes(dangerous)) {
              errors.push({
                code: 'DANGEROUS_SCRIPT',
                message: `危险的脚本命令: ${name}`,
                path: packageJsonPath,
              });
            }
          }
        }
      }

      // 检查是否有依赖
      if (!packageJson.dependencies && !packageJson.devDependencies) {
        warnings.push({
          code: 'NO_DEPENDENCIES',
          message: '未声明任何依赖',
          path: packageJsonPath,
        });
      }
    } catch (error) {
      errors.push({
        code: 'INVALID_PACKAGE_JSON',
        message: `无效的 package.json: ${error}`,
        path: packageJsonPath,
      });
    }
  }

  /**
   * 检查权限
   */
  private async checkPermissions(
    skillPath: string,
    errors: SkillValidationError[],
    warnings: SkillValidationWarning[]
  ): Promise<void> {
    // 检查是否有配置文件定义权限
    const configFiles = ['Taiji.config.json', 'skill.config.json'];

    for (const configFile of configFiles) {
      const configPath = path.join(skillPath, configFile);
      if (fs.existsSync(configPath)) {
        try {
          const content = await fs.promises.readFile(configPath, 'utf-8');
          const config = JSON.parse(content);

          // 检查权限配置
          const permissions = config.permissions || [];

          // 检查禁止的权限
          for (const perm of permissions) {
            if (this.rules.blockedPermissions.includes(perm)) {
              errors.push({
                code: 'BLOCKED_PERMISSION',
                message: `使用了被禁止的权限: ${perm}`,
                path: configPath,
              });
            }
          }
        } catch (error) {
          warnings.push({
            code: 'CONFIG_PARSE_ERROR',
            message: `无法解析配置文件: ${error}`,
            path: configPath,
          });
        }
      }
    }
  }

  /**
   * 查找脚本文件
   */
  private findScriptFiles(dirPath: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 和 .git
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          this.findScriptFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.ts', '.py', '.sh', '.bash'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * 计算目录哈希
   */
  private calculateDirectoryHash(dirPath: string): string {
    const hash = crypto.createHash('sha256');
    const files = this.findScriptFiles(dirPath);

    files.sort();

    for (const file of files) {
      const content = fs.readFileSync(file);
      hash.update(path.relative(dirPath, file));
      hash.update(content);
    }

    return hash.digest('hex');
  }

  /**
   * 计算签名
   */
  private calculateSignature(data: string): string {
    return crypto.createHmac('sha256', 'Taiji-skill-secret').update(data).digest('hex');
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(result: SkillValidationResult): number {
    let score = 100;

    // 扣除错误分数
    for (const error of result.errors) {
      switch (error.code) {
        case 'DANGEROUS_EVAL_USAGE':
        case 'DANGEROUS_SHELL_INJECTION':
          score -= 30;
          break;
        case 'MISSING_REQUIRED_FILE':
          score -= 20;
          break;
        default:
          score -= 10;
      }
    }

    // 扣除警告分数
    for (const warning of result.warnings) {
      switch (warning.code) {
        case 'SYSTEM_COMMAND':
          score -= 5;
          break;
        default:
          score -= 2;
      }
    }

    return Math.max(0, score);
  }
}
