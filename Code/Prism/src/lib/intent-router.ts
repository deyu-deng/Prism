export enum IntentType {
  Feature = "Feature",
  Refactor = "Refactor",
  Bugfix = "Bugfix",
  Explore = "Explore",
  Docs = "Docs"
}

export function classifyIntent(text: string): IntentType {
  const t = text.toLowerCase();
  
  if (/(修复|报错|崩溃|bug|修|fix|error|crash|cannot read property|undefined|异常|问题|漏了)/.test(t)) {
    return IntentType.Bugfix;
  }
  
  if (/(重构|整理|优化|抽离|解耦|清理|refactor|clean|optimize|架构|调整|移出)/.test(t)) {
    return IntentType.Refactor;
  }
  
  if (/(调研|探索|看看|区别|差异|对比|研究|explore|research|compare|how|为什么|what)/.test(t)) {
    return IntentType.Explore;
  }
  
  if (/(文档|注释|说明|doc|readme|规约|规范)/.test(t)) {
    return IntentType.Docs;
  }
  
  // Default to Feature for adding/creating/modifying things
  return IntentType.Feature;
}
