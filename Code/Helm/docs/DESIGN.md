# 架构设计 (DESIGN)

## 登录模块: 极简纯前端态 (Mock Auth)
根据人类指挥官裁决，采用 Zustand 进行前端状态模拟。不涉及任何后端 API 或 Token 拦截。

### 核心状态
- `isLoggedIn`: boolean
- `currentUser`: { name: string, role: string }
- `login()`: Mock API latency 500ms
- `logout()`: Reset state
