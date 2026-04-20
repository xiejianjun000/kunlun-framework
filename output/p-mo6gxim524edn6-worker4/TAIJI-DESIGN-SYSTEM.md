<div align="center">

# ☯️ 太极设计规范

**无极生太极，太极生两仪，两仪生四象，四象生八卦**

> 设计不是装饰，是道的体现。是阴阳平衡的艺术，是删繁就简的智慧。

**文档版本**: v1.0  
**最后更新**: 2026-04-20  
**适用范围**: 官网、控制面板、所有周边产品

</div>

---

## 🎨 设计哲学

### 太极设计三原则

| 原则 | 说明 | 设计体现 |
|------|------|---------|
| **阴阳平衡** | 没有绝对的黑与白，永远在平衡中 | 明暗对比、正负形、虚实结合 |
| **大道至简** | 最少的元素，最大的力量 | 极简主义，去除一切多余装饰 |
| **生生不息** | 动态的、有生命的、在运动中 | 流畅的动画、呼吸感、生长节奏 |

### 设计关键词

`极简` `东方` `科技感` `呼吸感` `流动` `平衡` `深邃`

---

## 🔴 配色系统：太极五色

> 青赤黄白黑，五色配五行，五行生万物。

### 主色：太极蓝

```scss
// 太极蓝 - 核心品牌色
$taiji-blue: #0F172A;     // 深蓝夜空 - 道
$taiji-blue-50: #F8FAFC;
$taiji-blue-100: #F1F5F9;
$taiji-blue-200: #E2E8F0;
$taiji-blue-300: #CBD5E1;
$taiji-blue-400: #94A3B8;
$taiji-blue-500: #64748B;
$taiji-blue-600: #475569;
$taiji-blue-700: #334155;
$taiji-blue-800: #1E293B;
$taiji-blue-900: #0F172A;   // 主背景色
$taiji-blue-950: #020617;
```

**寓意**：像夜空一样深邃、宁静、包容，对应太极中的"无极"——万物未生，混沌一片，蕴含无限可能。

### 强调色：两仪色

```scss
// 阳爻 - 金
$yang-gold: #F59E0B;      // 阳爻金色
$yang-gold-light: #FBBF24;
$yang-gold-dark: #D97706;

// 阴爻 - 银
$yin-silver: #94A3B8;     // 阴爻银色
$yin-silver-light: #CBD5E1;
$yin-silver-dark: #64748B;
```

**寓意**：阳爻用金，光明、主动、创造；阴爻用银，宁静、承载、包容。阴阳交互，化生万物。

### 四象点缀色

```scss
// 🐲 青龙 - 木 - 青
$qinglong-green: #10B981;

// 🐦 朱雀 - 火 - 赤
$zhuque-red: #EF4444;

// 🐢 玄武 - 水 - 黑（已包含在太极蓝中）

// 🐯 白虎 - 金 - 白（已包含在银中）
```

**仅用于特殊强调、状态指示、分类标识，不大面积使用。**

### 中性色系统

```scss
// 灰度层次 - 取自太极深浅变化
$white: #FFFFFF;
$gray-50: #F8FAFC;
$gray-100: #F1F5F9;
$gray-200: #E2E8F0;
$gray-300: #CBD5E1;
$gray-400: #94A3B8;
$gray-500: #64748B;
$gray-600: #475569;
$gray-700: #334155;
$gray-800: #1E293B;
$gray-900: #0F172A;
$black: #000000;
```

### 功能色

```scss
// 成功 - 生
$success: #10B981;    // 青龙色 - 生生不息

// 警告 - 变
$warning: #F59E0B;    // 金色 - 警示、变化

// 错误 - 劫
$error: #EF4444;      // 朱雀色 - 天劫、警告

// 信息 - 道
$info: #3B82F6;       // 蓝色 - 道理、信息
```

### 暗色模式配色

```scss
// 背景层级
$bg-primary: #0F172A;     // 主背景 - 夜空
$bg-secondary: #1E293B;   // 卡片背景
$bg-tertiary: #334155;    // 高亮背景

// 文字层级
$text-primary: #F1F5F9;   // 主标题
$text-secondary: #94A3B8; // 正文
$text-tertiary: #64748B;  // 次要信息
$text-disabled: #475569;  // 禁用状态
```

---

## 🔤 字体系统：翰墨之道

> 用笔在心，心正则笔正。

### 中文字体

```scss
// 标题字体 - 厚重有力，有书法感
$font-heading: "Noto Serif SC", "Source Han Serif SC", "PingFang SC", "Microsoft YaHei", serif;

// 正文字体 - 清晰易读，现代感
$font-body: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;

// 代码字体 - 等宽 monospace
$font-code: "JetBrains Mono", "Fira Code", "Consolas", monospace;
```

### 字体层级

```scss
// 大字标题 HERO
$font-size-hero: clamp(3rem, 8vw, 5rem);
$font-weight-hero: 700;
$letter-spacing-hero: -0.02em;

// 一级标题 H1
$font-size-h1: clamp(2rem, 5vw, 3rem);
$font-weight-h1: 700;

// 二级标题 H2
$font-size-h2: clamp(1.5rem, 4vw, 2.25rem);
$font-weight-h2: 600;

// 三级标题 H3
$font-size-h3: clamp(1.25rem, 3vw, 1.5rem);
$font-weight-h3: 600;

// 正文 Body
$font-size-body: 1rem;
$font-weight-body: 400;
$line-height-body: 1.75;

// 小字 Small
$font-size-small: 0.875rem;
$font-weight-small: 400;

// 标注 Caption
$font-size-caption: 0.75rem;
$font-weight-caption: 400;
```

### 字体颜色层级

```scss
// 标题：最亮，最高对比度
color: $text-primary;

// 正文：舒适阅读对比度
color: $text-secondary;

// 辅助信息、说明文字：低对比度
color: $text-tertiary;

// 禁用、占位：最低对比度
color: $text-disabled;
```

---

## 🌀 图标系统：八卦成列

> 八卦成列，象在其中矣。

### 核心图标：八卦图标体系

每个卦象对应一个功能模块，卦象就是图标，不需要额外设计。

| 卦象 | 卦名 | SVG 图标 | 对应功能 |
|------|------|---------|---------|
| ☰ | 乾 | 三横纯阳 | 系统概览、总览、全局设置 |
| ☷ | 坤 | 六断纯阴 | 租户管理、多租户、数据管理 |
| ☲ | 离 | 中虚 | 身份认证、用户管理、安全中心 |
| ☵ | 坎 | 中满 | 日志、审计、流水记录 |
| ☶ | 艮 | 覆碗 | 监控、告警、边界防御 |
| ☳ | 震 | 仰盂 | 任务调度、事件、消息队列 |
| ☴ | 巽 | 下断 | 流量治理、网络、网关 |
| ☱ | 兑 | 上缺 | 数据导出、报表、输出 |

### 四象神兽图标

```
🌌 青龙 - Actor 运行时 - 木
🦅 朱雀 - 人格系统 - 火
🐢 玄武 - 记忆系统 - 水
🐯 白虎 - 进化系统 - 金
```

### 图标设计规范

1. **统一线条粗细**：2px 线条粗细，圆角 2px
2. **统一尺寸体系**：16px / 24px / 32px / 48px / 64px
3. **最小可点击区域**：48px × 48px（移动端友好）
4. **线条风格**：纯线条，不填充，保持通透感
5. **动画状态**：hover 时有轻微发光效果，active 时有按下效果

### 太极 Logo 设计规范

```
核心 Logo：极简太极图

尺寸：
- 最小显示尺寸：32px × 32px
- 标准尺寸：64px × 64px
- 最大尺寸：512px × 512px

安全区域：
- 太极图案周围保留 10% 的留白
- 不得在留白区域放置任何其他元素

变体：
- 标准彩色版：蓝底金阳银阴
- 单色版：适配各种背景
- 纯线条版：用于水印、背景装饰
```

---

## ✨ 动效系统：生生不息

> 太极动而生阳，动极而静，静而生阴，静极复动。

### 核心动效：呼吸感

所有界面元素都应该有"呼吸感"——不是剧烈的动，是有生命的、轻微的、持续的微动。

```scss
// 呼吸动画
@keyframes breathe {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
}

// 应用：太极 Logo
.taiji-logo {
  animation: breathe 4s ease-in-out infinite;
}
```

### 转场动效：阴阳流转

页面切换、模态框出现消失，都应该是"流动"的，不是生硬的切换。

```scss
// 流动转场
$transition-fast: 150ms ease-out;    // 按钮、小元素
$transition-normal: 300ms ease-out;  // 卡片、页面切换
$transition-slow: 500ms ease-out;    // 大动画、背景变化

// 缓动曲线：先快后慢，有惯性
$ease-out: cubic-bezier(0.16, 1, 0.3, 1);
$ease-in-out: cubic-bezier(0.87, 0, 0.13, 1);
```

### 微交互规范

| 元素 | 正常态 | Hover | Active | 说明 |
|------|--------|-------|--------|------|
| 按钮 | 金色边框，透明背景 | 金色填充，亮度+10% | 按下缩小 2% | 阳爻的"动"感 |
| 链接 | 银灰色 | 金色，下划线从中间展开 | 颜色加深 | 优雅的交互反馈 |
| 卡片 | 微阴影 | 阴影加强，上移 4px | 轻微缩放 | 浮起来的感觉 |
| 图标 | 低亮度 | 金色发光，轻微放大 | 颜色加深 | 点亮的效果 |

### 八卦图标动效

每个卦象图标在 hover 时，应该有对应的"爻动"效果：

- 乾卦（三横）：三横依次点亮，从上到下
- 坤卦（六断）：六段依次点亮，从下到上
- 其他卦象：阳爻（实线段）先亮，阴爻（虚线段）后亮

---

## 📐 布局系统：天圆地方

> 无规矩不成方圆。

### 间距系统：8 点网格

所有间距都必须是 8px 的倍数，保证整个界面的节奏感。

```scss
$spacing-1: 4px;    // 半单位，特殊情况使用
$spacing-2: 8px;    // 最小单位
$spacing-3: 12px;   // 1.5倍，内边距
$spacing-4: 16px;   // 标准间距
$spacing-6: 24px;   // 大间距
$spacing-8: 32px;   // 区块间距
$spacing-12: 48px;  // 大区块间距
$spacing-16: 64px;  // 页面区块间距
$spacing-20: 80px;  // Hero 区域大间距
```

### 圆角系统

```scss
$radius-none: 0;
$radius-sm: 2px;     // 小标签
$radius-md: 6px;     // 按钮、输入框
$radius-lg: 12px;    // 卡片
$radius-xl: 24px;    // 大卡片、模态框
$radius-full: 9999px; // 圆形、胶囊按钮
```

**注意**：太极主题的核心是"方中有圆，圆中有方"。卡片用大圆角，按钮用中圆角，分割线用硬边，形成对比。

### 阴影系统

阴影要轻、要柔，像夜空中的微光，不要用沉重的黑色阴影。

```scss
// 微光阴影 - 卡片默认
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);

// 柔光阴影 - Hover 状态
$shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.2),
            0 2px 4px -2px rgba(15, 23, 42, 0.1);

// 发光阴影 - 强调元素（金色发光）
$shadow-glow: 0 0 20px rgba(245, 158, 11, 0.3),
              0 4px 12px rgba(0, 0, 0, 0.2);

// 深空阴影 - 模态框、大卡片
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3),
            0 4px 6px -4px rgba(0, 0, 0, 0.2);
```

---

## 🌊 组件设计原则

### 太极两仪原则

每个组件都应该有"阳"和"阴"两种状态：

| 阳（主动） | 阴（被动） |
|-----------|-----------|
| 主按钮（金色填充） | 次按钮（透明边框） |
| 激活状态 | 默认状态 |
| 展开状态 | 收起状态 |
| 亮色 | 暗色 |

### 核心组件风格示例

#### 按钮 Button

```scss
// 主按钮 - 阳 - 金色
.btn-primary {
  background: linear-gradient(135deg, $yang-gold, $yang-gold-dark);
  color: $black;
  border: none;
  border-radius: $radius-md;
  font-weight: 600;
  transition: all $transition-normal;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-glow;
  }
  
  &:active {
    transform: translateY(0);
  }
}

// 次按钮 - 阴 - 银边
.btn-secondary {
  background: transparent;
  color: $yin-silver;
  border: 1px solid $yin-silver;
  border-radius: $radius-md;
  
  &:hover {
    border-color: $yang-gold;
    color: $yang-gold;
  }
}
```

#### 卡片 Card

```scss
.card {
  background: $bg-secondary;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: $radius-lg;
  padding: $spacing-6;
  transition: all $transition-normal;
  
  &:hover {
    border-color: rgba(245, 158, 11, 0.3);
    box-shadow: $shadow-md;
    transform: translateY(-4px);
  }
}
```

#### 输入框 Input

```scss
.input {
  background: $bg-tertiary;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: $radius-md;
  color: $text-primary;
  padding: $spacing-3 $spacing-4;
  transition: all $transition-fast;
  
  &:focus {
    outline: none;
    border-color: $yang-gold;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
}
```

---

## 🎯 官网设计规范

### Hero 区域设计

```
背景：深空蓝渐变，底部有微弱的网格线
元素：中央放置动态太极图（缓慢旋转+呼吸效果）
文字：大字标题居中，金色高亮关键词
按钮：主按钮"立即开始"金色，次按钮"查看文档"银边
```

### 特性卡片设计

```
布局：两列或三列网格
图标：顶部放置卦象图标，金色
标题：粗体，24px
描述：灰色小字，行高 1.75
动效：Hover 上浮+金色边框+卦图标点亮
```

### 代码区块设计

```
风格：深色代码块，JetBrains Mono 字体
语法高亮：蓝底金字，关键词金色，注释银灰色
装饰：左上角三个小圆点（模拟窗口），右上角复制按钮
```

---

## 🌌 观星台（控制面板）设计规范

### 整体布局

```
┌─────────────────────────────────────────────────┐
│  ☰ Logo    导航菜单                    头像 通知 │ 顶部导航栏
├────────┬────────────────────────────────────────┤
│        │                                        │
│ 侧边   │                                        │
│ 八卦   │          主内容区域                    │
│ 图标   │                                        │
│ 菜单   │                                        │
│        │                                        │
└────────┴────────────────────────────────────────┘
```

### 侧边栏设计

- 宽度：240px，可收缩为 64px
- 图标：纯卦象图标，不使用其他图标
- 选中态：金色高亮，左侧有金色竖线指示
- Hover：背景微亮，图标变金

### 数据可视化设计

- 图表线条：金色渐变
- 填充区域：金色半透明渐变
- 网格线：极淡的灰色，几乎看不见
- 动画：数据加载时有"生长"动画，从下往上长出

---

## 🎨 暗模式唯一原则

**只做暗模式，不做亮模式。**

OpenTaiji 的品牌调性就是"夜空"、"深邃"、"神秘"，暗模式是唯一的官方模式。

- ✅ 所有页面默认暗色
- ✅ 不提供亮色切换选项
- ✅ 所有设计只在暗色背景下调试

---

## 📝 设计检查清单

任何设计输出前，请检查：

- [ ] 配色是否只使用了本规范定义的颜色？
- [ ] 间距是否都是 8px 的倍数？
- [ ] 字体层级是否正确？
- [ ] 动画是否符合"呼吸感"、"流动"的原则？
- [ ] 图标是否都是八卦/四象体系？
- [ ] 是否没有多余的装饰元素？
- [ ] 整体是否有"平衡"、"宁静"、"深邃"的感觉？

---

## 🔮 设计禁忌

❌ **禁止使用明亮、饱和度高的颜色**（除了金色强调）  
❌ **禁止使用复杂的渐变和纹理**  
❌ **禁止使用卡通风格、可爱风格的元素**  
❌ **禁止使用多余的装饰线、分割线**  
❌ **禁止使用快速、剧烈的动画**（一切都要慢、要柔）  
❌ **禁止设计拥挤、元素过多的界面**（留白、留白、再留白）  

---

<div align="center">

**最好的设计是感受不到设计的存在。**

> 大音希声，大象无形。

*让用户沉浸在太极的平衡与宁静之中。*

</div>

---

*文档版本: v1.0*  
*最后更新: 2026-04-20*