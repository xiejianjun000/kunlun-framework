/**
 * OpenTaiji Banner / Logo
 * 彩色渐变 ASCII Logo 显示
 */

import figlet from 'figlet';
import gradient from 'gradient-string';

/**
 * 显示完整的启动 Banner
 */
export function showBanner(): void {
  console.log();

  // 太极 ASCII艺术字
  const logo = figlet.textSync('OpenTaiji', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  // 青色→黄色渐变（符合太极阴阳主题
  console.log(gradient(['#00d4aa', '#ffcc00'])(logo));

  console.log();
  console.log('  分布式多智能体协作引擎 v1.0.0');
  console.log(' ' + '━'.repeat(40));
  console.log();
}

/**
 * 显示迷你 Banner (用于日志输出
 */
export function showMiniBanner(): void {
  console.log(gradient.rainbow('☯ OpenTaiji ☯'));
  console.log();
}

/**
 * 获取版本信息文本
 */
export function getVersionInfo(): string {
  return 'OpenTaiji v1.0.0 - 分布式多智能体协作引擎';
}

export default {
  showBanner,
  showMiniBanner,
  getVersionInfo
};
