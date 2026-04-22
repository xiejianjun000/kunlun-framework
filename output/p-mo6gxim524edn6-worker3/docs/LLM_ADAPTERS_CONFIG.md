# OpenTaiji - LLM 适配器配置文档

## 概述

本文档详细说明了如何配置和使用 OpenTaiji 支持的所有国产大模型适配器。所有适配器都遵循统一的 `BaseLLMAdapter` 接口规范，提供一致的调用体验。

---

## 适配器列表

| 序号 | 适配器名称 | 厂商 | 官方网站 | 环境变量 |
|------|-----------|------|---------|---------|
| 1 | WenxinAdapter | 百度 | https://cloud.baidu.com | WENXIN_API_KEY |
| 2 | QwenAdapter | 阿里 | https://dashscope.aliyun.com | QWEN_API_KEY |
| 3 | GLMAdapter | 智谱 AI | https://open.bigmodel.cn | GLM_API_KEY |
| 4 | SparkAdapter | 科大讯飞 | https://www.xfyun.cn | SPARK_API_KEY |
| 5 | HunyuanAdapter | 腾讯 | https://cloud.tencent.com | HUNYUAN_API_KEY |
| 6 | DoubaoAdapter | 字节跳动 | https://www.volcengine.com | DOUBAO_API_KEY |
| 7 | KimiAdapter | 月之暗面 | https://www.moonshot.cn | KIMI_API_KEY |
| 8 | BaichuanAdapter | 百川智能 | https://platform.baichuan-ai.com | BAICHUAN_API_KEY |
| 9 | YiAdapter | 零一万物 | https://platform.lingyiwanwu.com | YI_API_KEY |
| 10 | StepFunAdapter | 阶跃星辰 | https://platform.stepfun.com | STEPFUN_API_KEY |
| 11 | MiniMaxAdapter | 稀宇科技 | https://api.minimax.chat | MINIMAX_API_KEY |
| 12 | ZhiNao360Adapter | 三六零 | https://ai.360.cn | ZHINAO360_API_KEY |
| 13 | **SenseNovaAdapter** | 商汤科技 | https://platform.sensenova.cn | SENSENOVA_API_KEY |
| 14 | **PanguAdapter** | 华为云 | https://www.huaweicloud.com | PANGU_API_KEY |
| 15 | **YuyanAdapter** | 网易有道 | https://llm.youdao.com | YUYAN_API_KEY |
| 16 | **XiaoaiAdapter** | 小米 | https://api.xiaoai.mi.com | XIAOAI_API_KEY |
| 17 | **HongshanAdapter** | 出门问问 | https://api.aimind.com | HONGSHAN_API_KEY |
| 18 | **XuanyuanAdapter** | 度小满 | https://api.xuanyuan.duxiaoman.com | XUANYUAN_API_KEY |
| 19 | **TiangongAdapter** | 昆仑万维 | https://api.tiangong.cn | TIANGONG_API_KEY |

---

## API Key 获取方式

### 1. 百川智能 (Baichuan)

**官方网站**: https://platform.baichuan-ai.com

**获取步骤**:
1. 访问百川智能开放平台
2. 注册/登录账号
3. 进入 "控制台" → "API Key 管理"
4. 点击 "创建新的 API Key"
5. 复制生成的 API Key（格式: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**计费说明**:
- Baichuan 4: ￥0.03 / 1K tokens (输入), ￥0.03 / 1K tokens (输出)
- Baichuan 3.5: ￥0.008 / 1K tokens (输入), ￥0.008 / 1K tokens (输出)
- Baichuan 2 Turbo: ￥0.003 / 1K tokens (输入), ￥0.003 / 1K tokens (输出)

**模型列表**:
- `baichuan4` - 百川 4 旗舰模型
- `baichuan3.5` - 百川 3.5 高性能模型
- `baichuan2-turbo` - 百川 2 Turbo 快速模型

---

### 2. 零一万物 (Yi)

**官方网站**: https://platform.lingyiwanwu.com

**获取步骤**:
1. 访问零一万物开放平台
2. 注册/登录账号
3. 进入 "开发者中心" → "API 密钥"
4. 点击 "新建密钥"
5. 复制生成的 API Key（格式: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**计费说明**:
- Yi 3.5: ￥0.002 / 1K tokens (输入), ￥0.002 / 1K tokens (输出)
- Yi Vision: ￥0.006 / 1K tokens (输入), ￥0.006 / 1K tokens (输出)
- Yi Large: ￥0.02 / 1K tokens (输入), ￥0.02 / 1K tokens (输出)

**模型列表**:
- `yi-3.5` - Yi 3.5 高性能模型
- `yi-vision` - Yi 视觉理解模型
- `yi-large` - Yi Large 旗舰模型

---

### 3. 阶跃星辰 (StepFun)

**官方网站**: https://platform.stepfun.com

**获取步骤**:
1. 访问阶跃星辰开放平台
2. 注册/登录账号
3. 进入 "API 管理" → "密钥管理"
4. 点击 "生成 API Key"
5. 复制生成的 API Key（格式: `Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**计费说明**:
- Step 1 8K: ￥0.005 / 1K tokens (输入), ￥0.025 / 1K tokens (输出)
- Step 1 32K: ￥0.015 / 1K tokens (输入), ￥0.075 / 1K tokens (输出)
- Step 1 128K: ￥0.04 / 1K tokens (输入), ￥0.2 / 1K tokens (输出)
- Step 2: ￥0.001 / 1K tokens (输入), ￥0.002 / 1K tokens (输出)

**模型列表**:
- `step-1-8k` - Step 1 8K 上下文
- `step-1-32k` - Step 1 32K 上下文
- `step-1-128k` - Step 1 128K 长上下文
- `step-2` - Step 2 高性价比模型

---

### 4. MiniMax (ABAB)

**官方网站**: https://api.minimax.chat

**获取步骤**:
1. 访问 MiniMax 开放平台
2. 注册/登录账号
3. 进入 "控制台" → "API 密钥"
4. 点击 "创建密钥"
5. 复制生成的 API Key（格式: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**计费说明**:
- ABAB 6.5: ￥0.03 / 1M tokens (输入), ￥0.03 / 1M tokens (输出)
- ABAB 5.5: ￥0.015 / 1M tokens (输入), ￥0.015 / 1M tokens (输出)

**模型列表**:
- `abab6.5-chat` - ABAB 6.5 聊天模型
- `abab6.5s-chat` - ABAB 6.5s 快速模型
- `abab5.5-chat` - ABAB 5.5 稳定模型

---

### 5. 360 智脑 (ZhiNao360)

**官方网站**: https://ai.360.cn

**获取步骤**:
1. 访问 360 智脑开放平台
2. 注册/登录账号
3. 进入 "开发者中心" → "API 管理"
4. 点击 "创建应用"
5. 获取 API Key（格式: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**计费说明**:
- 360GPT 4: ￥0.02 / 1K tokens (输入), ￥0.02 / 1K tokens (输出)
- 360GPT Pro: ￥0.01 / 1K tokens (输入), ￥0.01 / 1K tokens (输出)
- 360GPT Turbo: ￥0.001 / 1K tokens (输入), ￥0.001 / 1K tokens (输出)

**模型列表**:
- `360gpt-4` - 360GPT 4 旗舰模型
- `360gpt-pro` - 360GPT Pro 高性能模型
- `360gpt-turbo` - 360GPT Turbo 快速模型

---

### 6. 商汤日日新 (SenseNova)

**官方网站**: https://platform.sensenova.cn

**获取步骤**:
1. 访问商汤日日新开放平台
2. 注册/登录账号
3. 进入 "控制台" → "API 密钥管理"
4. 点击 "创建 API Key"
5. 复制生成的 API Key

**计费说明**:
- SenseNova Pro: ￥0.01 / 1K tokens (输入), ￥0.01 / 1K tokens (输出)
- SenseNova Lite: ￥0.005 / 1K tokens (输入), ￥0.005 / 1K tokens (输出)

**模型列表**:
- `sensenova-pro` - SenseNova Pro 旗舰模型
- `sensenova-lite` - SenseNova Lite 轻量模型

---

### 7. 华为云盘古 (Pangu)

**官方网站**: https://www.huaweicloud.com

**获取步骤**:
1. 访问华为云官网
2. 注册/登录账号
3. 进入 "EI 企业智能" → "盘古大模型"
4. 创建 IAM 凭证获取 API Key 和 Project ID
5. 获取 API 端点配置

**计费说明**:
- Pangu 7B: ￥0.008 / 1K tokens (输入), ￥0.008 / 1K tokens (输出)
- Pangu 70B: ￥0.02 / 1K tokens (输入), ￥0.02 / 1K tokens (输出)
- Pangu 350B: ￥0.04 / 1K tokens (输入), ￥0.04 / 1K tokens (输出)

**模型列表**:
- `pangu-7b` - 盘古 7B 基础模型
- `pangu-70b` - 盘古 70B 高性能模型
- `pangu-finance` - 盘古金融领域模型

---

### 8. 网易玉言 (Yuyan)

**官方网站**: https://llm.youdao.com

**获取步骤**:
1. 访问网易有道智云
2. 注册/登录账号
3. 进入 "应用管理" → "创建应用"
4. 获取 API Key 和 API Secret
5. 配置大模型服务

**计费说明**:
- Yuyan V2 34B: ￥0.01 / 1K tokens (输入), ￥0.01 / 1K tokens (输出)
- Yuyan V2 7B: ￥0.005 / 1K tokens (输入), ￥0.005 / 1K tokens (输出)

**模型列表**:
- `yuyan-v2-34b` - 玉言 V2 34B 模型
- `yuyan-v2-7b` - 玉言 V2 7B 模型

---

### 9. 小米小爱 (Xiaoai)

**官方网站**: https://api.xiaoai.mi.com

**获取步骤**:
1. 访问小米开放平台
2. 注册/登录账号
3. 进入 "开发者中心" → "API 管理"
4. 创建应用并获取 API Key
5. 开启大模型 API 权限

**计费说明**:
- Xiaoai Pro: ￥0.008 / 1K tokens (输入), ￥0.008 / 1K tokens (输出)
- Xiaoai Lite: ￥0.003 / 1K tokens (输入), ￥0.003 / 1K tokens (输出)

**模型列表**:
- `xiaoai-pro` - 小爱 Pro 旗舰模型
- `xiaoai-lite` - 小爱 Lite 轻量模型

---

### 10. 出门问问红杉 (Hongshan)

**官方网站**: https://api.aimind.com

**获取步骤**:
1. 访问出门问问开放平台
2. 注册/登录账号
3. 进入 "开发者中心" → "API 密钥"
4. 创建新的 API Key
5. 配置红杉大模型服务

**计费说明**:
- Hongshan Pro: ￥0.01 / 1K tokens (输入), ￥0.01 / 1K tokens (输出)
- Hongshan Lite: ￥0.005 / 1K tokens (输入), ￥0.005 / 1K tokens (输出)

**模型列表**:
- `hongshan-pro` - 红杉 Pro 旗舰模型
- `hongshan-lite` - 红杉 Lite 轻量模型

---

### 11. 度小满轩辕 (Xuanyuan)

**官方网站**: https://api.xuanyuan.duxiaoman.com

**获取步骤**:
1. 访问度小满开放平台
2. 注册/登录企业账号
3. 进入 "控制台" → "API 管理"
4. 创建应用获取 API Key
5. 开通轩辕大模型服务

**计费说明**:
- Xuanyuan Finance: ￥0.025 / 1K tokens (输入), ￥0.025 / 1K tokens (输出)
- Xuanyuan General: ￥0.015 / 1K tokens (输入), ￥0.015 / 1K tokens (输出)

**模型列表**:
- `xuanyuan-finance` - 轩辕金融专业模型
- `xuanyuan-general` - 轩辕通用模型

---

### 12. 昆仑万维天工 (Tiangong)

**官方网站**: https://api.tiangong.cn

**获取步骤**:
1. 访问昆仑万维天工开放平台
2. 注册/登录账号
3. 进入 "开发者中心" → "API 密钥"
4. 创建 API Key 并复制
5. 配置大模型调用权限

**计费说明**:
- Tiangong Pro: ￥0.01 / 1K tokens (输入), ￥0.01 / 1K tokens (输出)
- Tiangong Lite: ￥0.005 / 1K tokens (输入), ￥0.005 / 1K tokens (输出)

**模型列表**:
- `tiangong-pro` - 天工 Pro 旗舰模型
- `tiangong-lite` - 天工 Lite 轻量模型

---

## 配置使用

### 环境变量配置

在项目根目录创建 `.env` 文件，添加需要使用的模型的 API Key：

```env
# 百川智能
BAICHUAN_API_KEY=your_b..._key

# 零一万物
YI_API_KEY=***

# 阶跃星辰
STEPFUN_API_KEY=your_s..._key

# MiniMax
MINIMAX_API_KEY=your_m..._key

# 360 智脑
ZHINAO360_API_KEY=your_z..._key

# 商汤日日新
SENSENOVA_API_KEY=your_s..._key

# 华为云盘古
PANGU_API_KEY=your_p..._key
PANGU_PROJECT_ID=your_project_id

# 网易玉言
YUYAN_API_KEY=your_y..._key

# 小米小爱
XIAOAI_API_KEY=your_x..._key

# 出门问问红杉
HONGSHAN_API_KEY=your_h..._key

# 度小满轩辕
XUANYUAN_API_KEY=your_x..._key

# 昆仑万维天工
TIANGONG_API_KEY=your_t..._key
```

### 代码中使用

```typescript
import { LLMAdapterFactory, LLMType } from './src/adapters/llm/LLMAdapterFactory';

// 创建百川适配器
const baichuan = LLMAdapterFactory.createAdapter(LLMType.BAICHUAN, {
  apiKey: process.env.BAICHUAN_API_KEY,
  model: 'baichuan4',
});

// 创建零一万物适配器
const yi = LLMAdapterFactory.createAdapter(LLMType.YI, {
  apiKey: process.env.YI_API_KEY,
  model: 'yi-3.5',
});

// 调用 API
const result = await baichuan.chat([
  { role: 'user', content: '你好，请介绍一下自己' }
]);

console.log('回复:', result.content);
console.log('Token 用量:', result.usage);
```

### 流式响应

所有适配器都支持 SSE 流式响应：

```typescript
const stream = await adapter.chatStream([
  { role: 'user', content: '写一篇关于人工智能的文章' }
]);

for await (const chunk of stream) {
  process.stdout.write(chunk.content || '');
}
```

---

## 接口规范

所有适配器都实现 `BaseLLMAdapter` 接口：

```typescript
interface BaseLLMAdapter {
  /**
   * 检查适配器是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 非流式聊天调用
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * 流式聊天调用
   */
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<ChatStreamResponse>;

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): string[];

  /**
   * 计算 Token 用量
   */
  countTokens(messages: ChatMessage[]): Promise<number>;

  /**
   * 计算调用费用
   */
  calculateCost(usage: TokenUsage): number;
}
```

---

## 错误处理

适配器内置错误重试和指数退避机制：

- 网络错误: 自动重试最多 3 次
- 速率限制: 自动等待并重试
- 认证错误: 抛出明确的错误信息

```typescript
try {
  const result = await adapter.chat(messages);
} catch (error) {
  if (error.name === 'LLMAdapterError') {
    console.error('适配器错误:', error.message);
    console.error('错误代码:', error.code);
  }
}
```

---

## 常见问题

### Q: 如何选择合适的模型？
A: 根据以下因素选择：
- **速度要求**: 优先选择 Turbo/Light 系列模型
- **质量要求**: 选择旗舰模型（如 baichuan4, yi-large）
- **上下文长度**: 根据输入文本长度选择
- **预算限制**: 参考各模型的计费标准

### Q: API 调用失败怎么办？
A: 检查以下几点：
1. API Key 是否正确配置
2. 账户余额是否充足
3. 网络连接是否正常
4. 模型名称是否正确
5. 是否触发了速率限制

### Q: 支持流式响应吗？
A: 是的，所有适配器都支持 SSE 流式响应，使用 `chatStream` 方法。

### Q: 如何获取 Token 用量统计？
A: 每次调用 `chat` 方法返回的结果中包含 `usage` 字段，详细记录了输入、输出和总 Token 数。

---

## 更新日志

### v0.9.0-beta (2026-04-22)
- ✅ 新增 BaichuanAdapter - 百川智能大模型适配器
- ✅ 新增 YiAdapter - 零一万物 Yi 大模型适配器
- ✅ 新增 StepFunAdapter - 阶跃星辰 StepFun 大模型适配器
- ✅ 新增 MiniMaxAdapter - MiniMax ABAB 大模型适配器
- ✅ 新增 ZhiNao360Adapter - 360 智脑大模型适配器
- ✅ 支持模型总数达到 12 个

---

## 技术支持

如有问题，请：
1. 查看各厂商官方文档
2. 提交 GitHub Issue
3. 联系技术支持团队

---

**文档版本**: v0.9.0-beta  
**最后更新**: 2026-04-22  
**维护者**: OpenTaiji 开发团队