---
name: documentation
phase: all
priority: 50
triggers:
  - task_completed: true
  - api_created: true
  - phase_entered: "deploy"
when: 任何时候，特别是完成任务或创建公共API后
---

# 文档编写模式已激活

## 目标

确保代码的自文档化能力，包括内联文档、API 文档和决策记录。

## 文档层次

### 层次 1：代码自文档化（始终要求）

好的代码本身就是最好的文档。优先做到：

- **命名即文档**：函数名、变量名应该自解释
```
// Bad
const d = data.filter(x => x.t > Date.now())

// Good
const activeSessions = sessions.filter(s => s.expiresAt > Date.now())
```

- **类型即文档**：TypeScript 类型定义就是接口文档
```typescript
// 清晰的类型定义胜过长篇注释
interface UserRegistrationInput {
  email: string;        // 已校验的邮箱格式
  password: string;     // 明文密码（将在存储前哈希）
  profile?: UserProfile; // 可选的用户资料
}
```

### 层次 2：内联注释（按需添加）

只在以下情况下添加注释：
- 解释 **为什么**（不是 **做什么**）
- 标注 **非直觉的业务规则**
- 标记 **TODO/FIXME/ HACK/ WARNING**
- 说明 **外部依赖的关键行为**

```typescript
// GOOD: 解释为什么
// 使用 debounce 而非 throttle，因为我们需要等待用户停止输入
// 而非固定间隔发送请求（产品需求 PRD-123）

// GOOD: 标记非直觉规则
// 负数金额表示退款，这是财务系统的历史遗留设计
if (amount < 0) { ... }

// BAD: 重复代码已经说的事情
// 遍历用户数组 （显然如此）
users.forEach(...)
```

### 层次 3：JSDoc/TSDoc（公共 API 必须）

所有对外导出的函数、类、接口必须有 JSDoc：

```typescript
/**
 * 根据用户 ID 查询用户的活跃会话数量
 *
 * @param userId - 用户的唯一标识符
 * @param options - 查询选项
 * @param options.includeExpired - 是否包含已过期的会话（默认 false）
 * @returns 会话数量，如果用户不存在则返回 0
 * @throws {AuthenticationError} 当认证令牌无效时抛出
 *
 * @example
 * ```ts
 * const count = await getActiveSessionCount('user-123', {
 *   includeExpired: false
 * })
 * ```
 */
export async function getActiveSessionCount(
  userId: string,
  options?: { includeExpired?: boolean }
): Promise<number> { ... }
```

JSDoc 要求：
- [ ] 描述第一句话概括功能（会被 IDE 悬停显示）
- [ ] 所有参数都有 `@param` 标注和类型
- [ ] 返回值有 `@returns` 标注
- [ ] 可能的错误有 `@throws` 标注
- [ ] 公共 API 有 `@example` 示例

### 层次 4：决策文档（ADR）

对任何重要的技术决策，写入 ADR（Architecture Decision Record）：

```markdown
# ADR-XXX: [决策标题]

## 状态: 已采纳 / 已废弃 / 待定

## 背景
[为什么需要做这个决定？]

## 决策
[最终选择了什么方案]

## 替代方案
1. 方案 A: [描述] — [优缺点]
2. 方案 B: [描述] — [优缺点]

## 影响
- 影响范围: [哪些模块/文件]
- 迁移成本: [如果有]
- 风险评估: [低/中/高]
```

### 层次 5：用户导向文档（面向用户的功能）

当功能面向终端用户时：
- README 中添加使用说明
- 更新 CHANGELOG
- 如有必要，编写使用指南

## 文档质量标准

- [ ] 公共 API 100% 有 JSDoc
- [ ] 复杂算法有解释性注释
- [ ] 非直觉业务规则有标注
- [ ] 重要决策有 ADR 记录
- [ ] README 与实际功能同步
- [ ] 无过时的注释（注释与代码矛盾比没注释更糟糕）

## Prism 集成

文档相关操作：
- 创建 ADR：调用 `prism_write_decision`
- 更新 README：作为任务的一部分正常提交
- 公共 API 文档：在 code-reviewer skill 中检查

## 反模式

- 用注释弥补糟糕的命名（应该重命名）
- 复制粘贴注释而不更新内容
- 为 getter/setter 写显而易见的 JSDoc
- 写"TODO"但永远不做
- 文档与代码行为不一致
