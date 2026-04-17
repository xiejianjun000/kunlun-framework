/**
 * 自定义技能示例
 * Kunlun Framework Custom Skill Example
 * 
 * 本示例演示如何创建、注册和使用自定义技能，包括：
 * 1. 定义技能元数据
 * 2. 实现技能执行逻辑
 * 3. 注册和安装技能
 * 4. 使用技能钩子
 * 5. 技能依赖管理
 */

import { 
  SkillSystem, 
  SkillSystemConfig,
  SkillInfo,
  SkillExecutionContext,
  SkillExecutionResult
} from '../src/modules/skill-system/SkillSystem';
import { SkillHooks } from '../src/modules/skill-system/hooks/SkillHooks';

// ============== 技能定义 ==============

/**
 * 天气查询技能
 */
interface WeatherSkillInput {
  city: string;
  format?: 'celsius' | 'fahrenheit';
}

interface WeatherSkillOutput {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  timestamp: string;
}

/**
 * 翻译技能
 */
interface TranslationSkillInput {
  text: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslationSkillOutput {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
}

/**
 * 数据分析技能
 */
interface DataAnalysisSkillInput {
  data: number[];
  analysisType: 'mean' | 'median' | 'sum' | 'max' | 'min';
}

interface DataAnalysisSkillOutput {
  result: number;
  analysisType: string;
  dataPoints: number;
}

// ============== 技能执行逻辑 ==============

/**
 * 模拟天气查询
 */
async function executeWeatherSkill(input: WeatherSkillInput): Promise<WeatherSkillOutput> {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 100));

  const conditions = ['晴朗', '多云', '小雨', '雷阵雨', '阴天'];
  const baseTemp = 20 + Math.random() * 15;
  const temp = input.format === 'fahrenheit' 
    ? baseTemp * 9/5 + 32 
    : baseTemp;

  return {
    city: input.city,
    temperature: Math.round(temp * 10) / 10,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    humidity: Math.round(40 + Math.random() * 40),
    timestamp: new Date().toISOString()
  };
}

/**
 * 模拟翻译
 */
async function executeTranslationSkill(input: TranslationSkillInput): Promise<TranslationSkillOutput> {
  // 模拟翻译API
  await new Promise(resolve => setTimeout(resolve, 150));

  const translations: Record<string, Record<string, string>> = {
    'zh-en': {
      '你好': 'Hello',
      '世界': 'World',
      '昆仑': 'Kunlun'
    },
    'en-zh': {
      'Hello': '你好',
      'World': '世界',
      'Kunlun': '昆仑'
    }
  };

  const langPair = `${input.sourceLang}-${input.targetLang}`;
  let translated = input.text;

  if (translations[langPair]) {
    for (const [original, trans] of Object.entries(translations[langPair])) {
      translated = translated.replace(new RegExp(original, 'gi'), trans);
    }
  } else {
    translated = `[Translated: ${input.text}]`;
  }

  return {
    original: input.text,
    translated,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang
  };
}

/**
 * 数据分析
 */
async function executeDataAnalysisSkill(input: DataAnalysisSkillInput): Promise<DataAnalysisSkillOutput> {
  const data = input.data;
  let result: number;

  switch (input.analysisType) {
    case 'mean':
      result = data.reduce((a, b) => a + b, 0) / data.length;
      break;
    case 'median':
      const sorted = [...data].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result = sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
      break;
    case 'sum':
      result = data.reduce((a, b) => a + b, 0);
      break;
    case 'max':
      result = Math.max(...data);
      break;
    case 'min':
      result = Math.min(...data);
      break;
    default:
      result = 0;
  }

  return {
    result: Math.round(result * 100) / 100,
    analysisType: input.analysisType,
    dataPoints: data.length
  };
}

// ============== 技能注册 ==============

async function registerSkills(skillSystem: SkillSystem, userId: string) {
  console.log('注册自定义技能...\n');

  // 注册天气技能
  const weatherSkill = await skillSystem.registerSkill({
    skillId: 'skill-weather',
    name: '天气查询',
    description: '查询指定城市的当前天气信息',
    version: '1.0.0',
    author: 'Kunlun Team',
    tags: ['weather', 'api', 'utility'],
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称' },
        format: { 
          type: 'string', 
          enum: ['celsius', 'fahrenheit'],
          default: 'celsius'
        }
      },
      required: ['city']
    }
  }, userId);
  console.log(`✅ 注册技能: ${weatherSkill.name}`);

  // 注册翻译技能
  const translationSkill = await skillSystem.registerSkill({
    skillId: 'skill-translation',
    name: '多语言翻译',
    description: '支持中英文互译',
    version: '1.0.0',
    author: 'Kunlun Team',
    tags: ['translation', 'language', 'utility'],
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要翻译的文本' },
        sourceLang: { type: 'string', description: '源语言' },
        targetLang: { type: 'string', description: '目标语言' }
      },
      required: ['text', 'sourceLang', 'targetLang']
    }
  }, userId);
  console.log(`✅ 注册技能: ${translationSkill.name}`);

  // 注册数据分析技能
  const dataAnalysisSkill = await skillSystem.registerSkill({
    skillId: 'skill-data-analysis',
    name: '数据分析',
    description: '对数值数据进行统计分析',
    version: '1.0.0',
    author: 'Kunlun Team',
    tags: ['data', 'analysis', 'statistics'],
    parameters: {
      type: 'object',
      properties: {
        data: { 
          type: 'array', 
          items: { type: 'number' },
          description: '数值数组' 
        },
        analysisType: {
          type: 'string',
          enum: ['mean', 'median', 'sum', 'max', 'min'],
          description: '分析类型'
        }
      },
      required: ['data', 'analysisType']
    }
  }, userId);
  console.log(`✅ 注册技能: ${dataAnalysisSkill.name}`);

  return { weatherSkill, translationSkill, dataAnalysisSkill };
}

// ============== 技能安装 ==============

async function installSkills(
  skillSystem: SkillSystem, 
  skills: { weatherSkill: SkillInfo; translationSkill: SkillInfo; dataAnalysisSkill: SkillInfo },
  userId: string
) {
  console.log('\n安装技能...\n');

  for (const skill of Object.values(skills)) {
    const result = await skillSystem.installSkill(skill.skillId, userId);
    console.log(`✅ 安装 ${skill.name}: ${result.success ? '成功' : '失败'}`);
  }
}

// ============== 技能执行 ==============

async function executeSkills(skillSystem: SkillSystem, userId: string) {
  console.log('\n执行技能...\n');

  // 执行天气查询
  console.log('--- 天气查询 ---');
  const weatherResult = await skillSystem.executeSkill(
    'skill-weather',
    { city: '北京', format: 'celsius' },
    userId
  );
  console.log(`结果: ${JSON.stringify(weatherResult.output, null, 2)}`);

  // 执行翻译
  console.log('\n--- 翻译 ---');
  const translationResult = await skillSystem.executeSkill(
    'skill-translation',
    { text: '你好，昆仑', sourceLang: 'zh', targetLang: 'en' },
    userId
  );
  console.log(`结果: ${JSON.stringify(translationResult.output, null, 2)}`);

  // 执行数据分析
  console.log('\n--- 数据分析 ---');
  const dataAnalysisResult = await skillSystem.executeSkill(
    'skill-data-analysis',
    { data: [10, 20, 30, 40, 50], analysisType: 'mean' },
    userId
  );
  console.log(`结果: ${JSON.stringify(dataAnalysisResult.output, null, 2)}`);
}

// ============== 技能钩子示例 ==============

async function demonstrateSkillHooks(skillSystem: SkillSystem, userId: string) {
  console.log('\n演示技能钩子...\n');

  // 获取技能钩子实例
  const hooks = new SkillHooks();

  // 注册前置钩子
  hooks.registerHook('beforeInstall', async (context) => {
    console.log(`📦 [beforeInstall] 准备安装技能: ${context.skillId}`);
    return context;
  });

  hooks.registerHook('afterInstall', async (context) => {
    console.log(`📦 [afterInstall] 技能安装完成: ${context.skillId}`);
    return context;
  });

  hooks.registerHook('beforeExecute', async (context) => {
    console.log(`⚡ [beforeExecute] 准备执行: ${context.skillId}`);
    console.log(`   输入参数: ${JSON.stringify(context.input)}`);
    return context;
  });

  hooks.registerHook('afterExecute', async (context) => {
    console.log(`⚡ [afterExecute] 执行完成: ${context.skillId}`);
    console.log(`   执行时间: ${context.metadata?.executionTime}ms`);
    return context;
  });

  hooks.registerHook('onError', async (context, error) => {
    console.log(`❌ [onError] 技能执行出错: ${context.skillId}`);
    console.log(`   错误: ${error.message}`);
    return context;
  });

  // 触发钩子
  await hooks.triggerHook('beforeInstall', {
    skillId: 'skill-weather',
    userId
  });

  await hooks.triggerHook('afterInstall', {
    skillId: 'skill-weather',
    userId
  });

  await hooks.triggerHook('beforeExecute', {
    skillId: 'skill-weather',
    userId,
    input: { city: '上海' }
  });

  await hooks.triggerHook('afterExecute', {
    skillId: 'skill-weather',
    userId,
    metadata: { executionTime: 123 }
  });

  console.log('\n✅ 技能钩子演示完成');
}

// ============== 技能搜索 ==============

async function searchSkills(skillSystem: SkillSystem) {
  console.log('\n搜索技能...\n');

  // 按标签搜索
  const byTagResults = await skillSystem.searchSkills({
    tags: ['weather']
  });
  console.log(`标签搜索 'weather': ${byTagResults.total} 个结果`);
  for (const skill of byTagResults.skills) {
    console.log(`  - ${skill.name}: ${skill.description}`);
  }

  // 按关键词搜索
  const byQueryResults = await skillSystem.searchSkills({
    query: '翻译'
  });
  console.log(`\n关键词搜索 '翻译': ${byQueryResults.total} 个结果`);
  for (const skill of byQueryResults.skills) {
    console.log(`  - ${skill.name}: ${skill.description}`);
  }
}

// ============== 技能统计 ==============

async function showSkillStats(skillSystem: SkillSystem, userId: string) {
  console.log('\n技能统计...\n');

  const installedSkills = await skillSystem.getInstalledSkills(userId);
  
  for (const skill of installedSkills) {
    const stats = await skillSystem.getSkillStats(skill.skillId, userId);
    console.log(`${skill.name}:`);
    console.log(`  - 执行次数: ${stats.totalExecutions}`);
    console.log(`  - 成功率: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  - 平均执行时间: ${stats.avgExecutionTime}ms`);
    console.log(`  - 总执行时间: ${stats.totalExecutionTime}ms`);
  }
}

// ============== 技能卸载 ==============

async function uninstallSkills(skillSystem: SkillSystem, userId: string) {
  console.log('\n卸载技能...\n');

  const installedSkills = await skillSystem.getInstalledSkills(userId);
  
  for (const skill of installedSkills) {
    const result = await skillSystem.uninstallSkill(skill.skillId, userId);
    console.log(`🗑️ 卸载 ${skill.name}: ${result.success ? '成功' : '失败'}`);
  }
}

// ============== 主函数 ==============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 昆仑框架自定义技能示例');
  console.log('='.repeat(60) + '\n');

  const userId = 'user-custom-skill-demo';

  // 创建技能系统
  const skillSystem = new SkillSystem({
    skillsRoot: './skills',
    registryPath: './data/skill-registry.json',
    enableSignatureVerification: false,
    enableQuotaManagement: true,
    defaultQuotaLimits: {
      maxSkills: 50,
      maxConcurrentExecutions: 10,
      maxDailyExecutions: 1000
    }
  });

  try {
    // 1. 注册技能
    const skills = await registerSkills(skillSystem, userId);

    // 2. 安装技能
    await installSkills(skillSystem, skills, userId);

    // 3. 执行技能
    await executeSkills(skillSystem, userId);

    // 4. 演示技能钩子
    await demonstrateSkillHooks(skillSystem, userId);

    // 5. 搜索技能
    await searchSkills(skillSystem);

    // 6. 查看统计
    await showSkillStats(skillSystem, userId);

    // 7. 卸载技能
    await uninstallSkills(skillSystem, userId);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 自定义技能示例执行完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    throw error;
  }
}

// 运行示例
main().catch(console.error);

// 导出示例函数
export {
  executeWeatherSkill,
  executeTranslationSkill,
  executeDataAnalysisSkill,
  registerSkills,
  installSkills,
  executeSkills,
  demonstrateSkillHooks,
  searchSkills,
  showSkillStats,
  uninstallSkills
};
