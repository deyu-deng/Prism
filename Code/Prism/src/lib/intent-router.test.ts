import { describe, it, expect } from 'vitest';
import { classifyIntent, IntentType } from './intent-router';

describe('Intent Router', () => {
  it('classifies Feature correctly', () => {
    expect(classifyIntent("加一个退出登录按钮")).toBe(IntentType.Feature);
    expect(classifyIntent("实现侧边栏")).toBe(IntentType.Feature);
  });

  it('classifies Refactor correctly', () => {
    expect(classifyIntent("整理一下当前的组件结构")).toBe(IntentType.Refactor);
    expect(classifyIntent("把这个类抽离出去")).toBe(IntentType.Refactor);
  });

  it('classifies Bugfix correctly', () => {
    expect(classifyIntent("修复偶发的崩溃问题")).toBe(IntentType.Bugfix);
    expect(classifyIntent("这有个报错 Cannot read property")).toBe(IntentType.Bugfix);
  });

  it('classifies Explore correctly', () => {
    expect(classifyIntent("调研一下不同图表库的差异")).toBe(IntentType.Explore);
    expect(classifyIntent("看看 React 19 有什么新特性")).toBe(IntentType.Explore);
  });
  
  it('classifies Docs correctly', () => {
    expect(classifyIntent("更新一下 README 文档")).toBe(IntentType.Docs);
  });
});
