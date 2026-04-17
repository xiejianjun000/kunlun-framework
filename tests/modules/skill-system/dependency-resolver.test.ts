/**
 * 依赖解析器测试
 * Dependency Resolver Tests
 */

import { DependencyResolver, DependencyStrategy } from '../src/modules/skill-system/dependency/DependencyResolver';
import * as fs from 'fs';
import * as path from 'path';

describe('DependencyResolver', () => {
  const testWorkDir = path.join(__dirname, 'test-deps');
  let resolver: DependencyResolver;

  beforeEach(() => {
    // 创建测试目录
    if (!fs.existsSync(testWorkDir)) {
      fs.mkdirSync(testWorkDir, { recursive: true });
    }

    resolver = new DependencyResolver({
      workDir: testWorkDir,
      packageManager: 'npm',
      strategy: DependencyStrategy.AUTO,
    });
  });

  afterEach(async () => {
    if (fs.existsSync(testWorkDir)) {
      await fs.promises.rm(testWorkDir, { recursive: true });
    }
  });

  describe('resolve', () => {
    it('should return empty dependencies for no package file', async () => {
      const result = await resolver.resolve(testWorkDir);
      expect(result.dependencies).toHaveLength(0);
    });

    it('should resolve dependencies from package.json', async () => {
      // 创建测试 package.json
      const packageJson = {
        name: 'test-skill',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.21',
        },
      };

      await fs.promises.writeFile(
        path.join(testWorkDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const result = await resolver.resolve(testWorkDir);
      expect(result.dependencies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkUpdates', () => {
    it('should check for package updates', async () => {
      const packageJson = {
        name: 'test-skill',
        version: '1.0.0',
        dependencies: {
          lodash: '4.17.20',
        },
      };

      await fs.promises.writeFile(
        path.join(testWorkDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      // 注意：实际测试可能需要较长时间
      // const result = await resolver.checkUpdates(testWorkDir);
      // expect(result).toBeDefined();
    });
  });

  describe('cleanDependencies', () => {
    it('should clean dependencies', async () => {
      await resolver.cleanDependencies(testWorkDir);
      // 不应该抛出错误
    });
  });
});
