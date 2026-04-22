/**
 * ============================================
 * OpenTaiji - Markdown Magic Configuration
 * 自动更新 README 的核心配置文件
 * ============================================
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// 加载 package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

module.exports = {
  /**
   * 要处理的 Markdown 文件
   */
  matchGlobs: [
    'README.md',
  ],

  /**
   * 输出目录（与源文件相同）
   */
  outputDir: './',

  /**
   * 自定义转换器配置
   */
  transforms: {
    /**
     * PACKAGE_VERSION: 从 package.json 读取版本号
     * 用法: <!-- AUTO-GENERATED-START: PACKAGE_VERSION --> ... <!-- AUTO-GENERATED-END -->
     */
    PACKAGE_VERSION: function(content, options, config) {
      return `\`${pkg.version}\``;
    },

    /**
     * PACKAGE_NAME: 项目名称
     */
    PACKAGE_NAME: function(content, options, config) {
      return pkg.name;
    },

    /**
     * PACKAGE_DESCRIPTION: 项目描述
     */
    PACKAGE_DESCRIPTION: function(content, options, config) {
      return pkg.description || 'OpenTaiji - 国产大模型确定性输出引擎';
    },

    /**
     * NPM_SCRIPTS: 自动生成 npm scripts 命令表格
     */
    NPM_SCRIPTS: function(content, options, config) {
      const scripts = pkg.scripts || {};
      const descriptions = {
        build: '编译 TypeScript 源代码到 JavaScript',
        test: '运行 Jest 测试套件',
        'test:coverage': '运行测试并生成覆盖率报告',
        lint: '运行 ESLint 代码质量检查',
        'docs:update': '自动更新 README 文档',
      };

      let table = '| 命令 | 描述 |\n';
      table += '|------|------|\n';

      for (const [name, command] of Object.entries(scripts)) {
        const desc = descriptions[name] || command;
        table += `| \`npm run ${name}\` | ${desc} |\n`;
      }

      return table;
    },

    /**
     * TEST_COVERAGE: 自动计算测试覆盖率
     */
    TEST_COVERAGE: function(content, options, config) {
      const coveragePath = path.join(__dirname, 'coverage', 'coverage-summary.json');

      if (!fs.existsSync(coveragePath)) {
        return '> ⚠️ 覆盖率报告尚未生成，请先运行 `npm run test:coverage`';
      }

      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;

        if (!total) {
          return '> ⚠️ 无法读取覆盖率数据';
        }

        // 生成带颜色的进度条
        const getProgressBar = (percent) => {
          const width = 20;
          const filled = Math.round((percent / 100) * width);
          const empty = width - filled;
          const color = percent >= 90 ? '🟩' : percent >= 80 ? '🟨' : percent >= 70 ? '🟧' : '🟥';
          return `${color.repeat(filled)}${'⬜'.repeat(empty)} ${percent.toFixed(1)}%`;
        };

        let output = '| 指标 | 覆盖率 | 进度 |\n';
        output += '|------|--------|------|\n';
        output += `| 语句覆盖率 | ${total.statements.pct}% | ${getProgressBar(total.statements.pct)} |\n`;
        output += `| 分支覆盖率 | ${total.branches.pct}% | ${getProgressBar(total.branches.pct)} |\n`;
        output += `| 函数覆盖率 | ${total.functions.pct}% | ${getProgressBar(total.functions.pct)} |\n`;
        output += `| 行覆盖率 | ${total.lines.pct}% | ${getProgressBar(total.lines.pct)} |\n\n`;

        // 总体评分
        const avgPct = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
        const grade = avgPct >= 95 ? 'A+' : avgPct >= 90 ? 'A' : avgPct >= 85 ? 'B+' : avgPct >= 80 ? 'B' : avgPct >= 70 ? 'C' : 'D';
        const status = avgPct >= 85 ? '✅ 达标' : avgPct >= 70 ? '⚠️ 警告' : '❌ 不达标';

        output += `**综合评分**: \`${grade}\` ${status} (平均 ${avgPct.toFixed(1)}%)\n`;
        output += `> 目标阈值: 85% (在 jest.config.js 中配置)`;

        return output;
      } catch (e) {
        return `> ⚠️ 解析覆盖率数据失败: ${e.message}`;
      }
    },

    /**
     * TOC: 自动生成目录
     */
    TOC: function(content, options, config) {
      // 从当前 README 内容提取标题
      const lines = content.split('\n');
      const toc = [];
      const usedAnchors = new Set();

      for (const line of lines) {
        const match = line.match(/^(#{1,4})\s+(.+)$/);
        if (match) {
          const level = match[1].length - 1;
          const title = match[2].trim();

          // 跳过 TOC 自身和自动生成区域的标题
          if (title.includes('目录') || title.includes('AUTO-GENERATED')) {
            continue;
          }

          // 生成锚点
          let anchor = title
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
            .replace(/\s+/g, '-');

          // 处理重复锚点
          let finalAnchor = anchor;
          let counter = 1;
          while (usedAnchors.has(finalAnchor)) {
            finalAnchor = `${anchor}-${counter}`;
            counter++;
          }
          usedAnchors.add(finalAnchor);

          const indent = '  '.repeat(level);
          toc.push(`${indent}- [${title}](#${finalAnchor})`);
        }
      }

      return toc.join('\n');
    },

    /**
     * MODULE_LIST: 自动生成模块列表
     */
    MODULE_LIST: function(content, options, config) {
      const srcDir = path.join(__dirname, 'src');
      const modules = globSync('src/modules/*/', { absolute: true });

      let output = '| 模块 | 路径 | 描述 |\n';
      output += '|------|------|------|\n';

      const moduleDescriptions = {
        'determinism': 'WFGY 确定性输出验证引擎，幻觉检测、自一致性检查、源追踪',
        'memory': '混合向量记忆系统，语义搜索、长期记忆管理',
        'outcome-scheduler': '成果调度器，定时任务、执行历史、模板引擎',
        'wiki': '知识图谱与 Wiki 系统',
        'dreaming': '梦境整合系统，多阶段知识融合与修复',
      };

      for (const modulePath of modules) {
        const name = path.basename(modulePath);
        const desc = moduleDescriptions[name] || '核心功能模块';
        output += `| \`${name}\` | \`src/modules/${name}/\` | ${desc} |\n`;
      }

      // LLM 适配器
      output += '\n### LLM 适配器\n\n';
      output += '| 适配器 | 路径 | 状态 |\n';
      output += '|--------|------|------|\n';

      const adapters = globSync('src/adapters/llm/*.ts', { absolute: true });
      for (const adapterPath of adapters) {
        const name = path.basename(adapterPath, '.ts');
        if (name === 'index' || name === 'BaseLLMAdapter') continue;
        const status = fs.existsSync(adapterPath) ? '✅ 已实现' : '🔄 开发中';
        output += `| \`${name}\` | \`src/adapters/llm/${name}.ts\` | ${status} |\n`;
      }

      return output;
    },

    /**
     * LAST_UPDATED: 最后更新时间
     */
    LAST_UPDATED: function(content, options, config) {
      const now = new Date();
      return now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    },
  },

  /**
   * 回调函数
   */
  callback: function() {
    console.log('✅ README 自动更新完成！');
  },
};
