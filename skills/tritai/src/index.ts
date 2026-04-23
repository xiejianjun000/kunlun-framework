/**
 * ☯️ TriTai 三才 - OpenClaw Skill 入口
 * 可信 AI 基础设施 · 零 Token 幻觉守护
 */

import { ZeroTokenGuard } from './wfgy/ZeroTokenGuard';
import { TriTaiConfig } from './types';

const defaultConfig: TriTaiConfig = {
  wfgy: {
    enabled: true,
    interceptThreshold: 0.85,
    warningThreshold: 0.6,
    autoInterrupt: true,
    showEvidence: true
  },
  memory: {
    enabled: true,
    maxNodes: 10000,
    autoPersist: true
  },
  learning: {
    enabled: true,
    autoLearn: true
  }
};

class TriTaiSkill {
  public readonly name = 'tritai';
  public readonly version = '0.1.0-alpha';
  public readonly description = '三才 · 可信 AI 基础设施 · 零 Token 幻觉守护';

  private config: TriTaiConfig;
  private guard: ZeroTokenGuard;
  private initialized = false;

  constructor(config: Partial<TriTaiConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.guard = new ZeroTokenGuard();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`\n☯️ 三才 V${this.version} 正在启动...`);
    console.log(`🛡️  WFGY 零 Token 守护: ${this.config.wfgy.enabled ? '已启用' : '已禁用'}`);
    console.log(`🧠 记忆图谱系统: ${this.config.memory.enabled ? '已启用' : '已禁用'}`);
    console.log(`📈 学习闭环引擎: ${this.config.learning.enabled ? '已启用' : '已禁用'}`);

    this.initialized = true;
    console.log('✅ 三才已就绪，开始守护对话输出\n');
  }

  /**
   * 流式 Token 处理钩子
   */
  onToken(token: string): { token: string; intercept?: boolean; warning?: string } {
    if (!this.config.wfgy.enabled) {
      return { token };
    }

    const warning = this.guard.processToken(token);

    if (warning) {
      console.log('\n🚨 =========================================');
      console.log('🛡️  WFGY 检测到幻觉，已拦截！');
      console.log('============================================\n');
      return { token: warning, intercept: true };
    }

    return { token };
  }

  /**
   * 对话结束钩子
   */
  onCompletion(text: string): { warning: string | null } {
    if (!this.config.wfgy.enabled) {
      return { warning: null };
    }

    const result = this.guard.finalCheck();
    this.guard.reset(); // 为下一轮对话重置

    return { warning: result.warning };
  }

  /**
   * 手动检测幻觉
   */
  detect(text: string) {
    return this.guard.detectText(text);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      config: this.config,
      guardState: this.guard.getState()
    };
  }

  destroy(): void {
    this.initialized = false;
    console.log('☯️ 三才已停止');
  }
}

// 导出 Skill 实例
export default TriTaiSkill;
export { ZeroTokenGuard, TriTaiSkill };

// 如果直接运行，执行快速自检
if (require.main === module) {
  (async () => {
    console.log('☯️ 三才 WFGY 引擎快速自检');
    console.log('='.repeat(50));

    const skill = new TriTaiSkill();
    await skill.initialize();

    // 测试用例
    const testCases = [
      '正常文本，没有幻觉',
      '根据 GB-2025-003 第7.2条规定',
      '该企业排放达标，COD 150mg/L 超标',
      '2027 年最新环保法规定罚款 12.34 万元',
    ];

    let passed = 0;
    let total = testCases.length;

    for (const test of testCases) {
      const result = skill.detect(test);
      const status = result.detected ? '🚨 检测到幻觉' : '✅ 正常';
      const confidence = result.detected ? ` ${(result.overallConfidence * 100).toFixed(0)}%` : '';

      console.log(`${status}${confidence} | ${test.substring(0, 40)}...`);

      if ((test.includes('2025') || test.includes('2027') || test.includes('超标')) && result.detected) {
        passed++;
      } else if (!result.detected && test === '正常文本，没有幻觉') {
        passed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 测试通过: ${passed}/${total} (${(passed/total*100).toFixed(0)}%)`);
    console.log('\n☯️ 三才 V0.1 Alpha 自检完成！');

    skill.destroy();
  })();
}
