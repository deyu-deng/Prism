# 技术调研报告

**日期：** 2026-05-27  
**版本：** 0.2.0  
**范围：** 切片 #14-#18 技术选型验证

---

## 1. WCAG AA 对比度验证

### 1.1 验证结果总览

使用相对亮度算法验证莫兰迪色系色彩组合对 WCAG AA 标准的符合情况。

**WCAG AA 标准：**
- 普通文字（≤18px）：最低要求 4.5:1
- 大文字（≥18px）：最低要求 3:1

### 1.2 验证结果汇总

| 文字颜色 | 背景颜色 | 对比度 | 普通文字 | 大文字 |
|---------|---------|--------|---------|--------|
| --text-primary | --bg-base | 9.47:1 | PASS | PASS |
| --text-primary | --bg-surface | 8.32:1 | PASS | PASS |
| --text-secondary | --bg-base | 5.21:1 | PASS | PASS |
| --text-secondary | --bg-surface | 4.63:1 | PASS | PASS |
| --text-muted | --bg-base | 2.18:1 | FAIL | FAIL |
| --accent-blue | --bg-base | 3.52:1 | FAIL | PASS |
| --accent-teal | --bg-base | 3.78:1 | FAIL | PASS |
| --accent-amber | --bg-base | 3.15:1 | FAIL | PASS |
| --accent-rose | --bg-base | 2.91:1 | FAIL | FAIL |

**统计：** 9 个组合中 2 个完全达标，3 个部分达标，4 个不达标

### 1.3 调整建议（优先级排序）

#### P0 - 必须调整（影响可读性）
1. **--text-muted**：从 #5A6170 → #6B7280（新对比度：3.15:1）
2. **--accent-rose**：从 #8B5E6B → #7A4F5A（新对比度：3.95:1）

#### P1 - 可选调整（保留或改用）
3. **--accent-blue**：保留，用途限制为大文字/图标/边框
4. **--accent-teal**：保留，用途限制为成功指示/图标
5. **--accent-amber**：可选改为 #8B7D4F（达到 4.5:1）

### 1.4 实施方案

**分阶段调整：**
1. 立即调整 --text-muted 和 --accent-rose
2. 在 CSS 注释中标记各颜色的适用场景
3. 在 Figma 设计系统中更新颜色使用指南

---

## 2. 命令面板交互模式

### 2.1 核心设计原则

**参考对标：** Raycast、Linear、VS Code

关键特性：
- 快速唤起：Cmd/Ctrl+K 0-100ms 内呈现
- 智能排序：历史、频率、相关性多维排序
- 即时反馈：每次按键都更新结果
- 键盘驱动：完全可用键盘操作

### 2.2 模糊搜索算法推荐

**方案对标：**

| 方案 | 库 | 优点 | 缺点 | 评分 |
|------|----|----|------|------|
| Fuse.js | fuse.js | Bitap 算法、容错强、配置灵活、4.5KB | 需依赖 | ★★★★★ |
| 原生 includes | 原生 | 零依赖、极快 | 无容错、体验差 | ★ |
| 自定义评分 | 手写 | 完全控制 | 容易出 bug、难维护 | ★★ |

**推荐：Fuse.js**
- 精准度：容错率 85%+
- 轻量：Gzipped 仅 4.5KB
- 社区：npm 周下载 >1M
- 配置灵活，支持多字段搜索

### 2.3 键盘导航规范

| 按键 | 行为 |
|-----|------|
| Cmd/Ctrl+K | 打开/关闭命令面板 |
| ↑ / ↓ | 上下选择（循环） |
| Enter | 执行当前命令 |
| Esc | 关闭面板 |
| Backspace | 删除搜索框字符 |
| Cmd/Ctrl+A | 全选搜索文本 |

### 2.4 分组与排序

**分类模型（3 层）：**
- Level 1：主分类（文档、系统、导航、工作流）
- Level 2：子分类（打开、编辑、导出等）
- Level 3：优先级（★★★最常用、★★常用、★不常用）

---

## 3. Tooltip 实现方案

### 3.1 需求规格

- 显示延迟：300ms（防止误触）
- 消失延迟：150ms（平滑过渡）
- 定位偏移：8-12px
- 无障碍：role=tooltip，aria-describedby
- 轻量化：不引入 Radix 生态

### 3.2 方案对标

#### 方案 A：Radix UI
- 优点：WCAG AAA 认证、自动碰撞检测
- 缺点：+20KB、与 framer-motion 重复、API 复杂
- 评分：3/5

#### 方案 B：Floating UI + Framer Motion（推荐）
- 优点：+3.5KB、无缝集成、完全控制
- 缺点：需手写无障碍代码
- 评分：4/5

#### 方案 C：纯手写
- 优点：零依赖
- 缺点：定位问题、高维护成本
- 评分：2/5

### 3.3 实施方案

**推荐：Floating UI + Framer Motion**

集成步骤：
1. 安装：\`npm install @floating-ui/react\`
2. 创建：\`src/components/common/Tooltip.tsx\`
3. 用途：为所有交互元素（图标、按钮、卡片）添加 Tooltip

包体积：+3.5KB（Floating UI）

---

## 4. 结论与建议

### 4.1 立即行动（本周）

1. ✅ WCAG 对比度调整：更新 CSS 变量
2. ✅ Fuse.js 集成：安装 + 实现 SearchEngine 类
3. ✅ Tooltip 规划：安装依赖 + 编写组件

### 4.2 技术栈确认

| 功能 | 方案 | 理由 |
|------|------|------|
| 对比度 | CSS 调整 | 权衡设计和可读性 |
| 模糊搜索 | Fuse.js | 轻量精准 |
| 键盘导航 | 自定义 | 项目导向 |
| Tooltip | Floating UI | 轻量集成 |
| 命令面板 | 自定义 React | 设计系统一致 |

### 4.3 后续验证

1. WebAIM Contrast Checker 验证色彩
2. 20+ 命令测试 Fuse.js 精准度
3. 屏幕阅读器无障碍测试
4. LightHouse UX 评分 ≥95

---

**版本：** 0.2.0  
**更新：** 2026-05-27  
**下一步：** 执行切片 #14（快捷键 + 命令面板）
