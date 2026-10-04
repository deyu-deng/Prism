import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Skill 文件的 YAML frontmatter 解析结果
 */
export interface SkillFrontmatter {
  name: string;
  phase: string;
  priority: number;
  triggers?: string[];
  when?: string;
}

/**
 * 已加载的 Skill 完整信息
 */
export interface LoadedSkill {
  name: string;
  content: string;
  priority: number;
  phase: string;
}

/**
 * renderPhasePrompt 的上下文参数
 */
export interface PhasePromptContext {
  projectRoot?: string;
  taskSummary?: string;
  taskType?: string;
  contextSummary?: string;
  [key: string]: unknown;
}

/** 缓存条目上限，防止内存泄漏 */
const MAX_CACHE_SIZE = 50;

/**
 * WorkflowEngine - 动态工作流引擎
 *
 * 根据当前开发阶段自动选择并注入对应的 Skill 指令，
 * 替代原有的静态模板注入方式。
 *
 * 核心能力：
 * - 从 skills/ 目录加载 .skill.md 文件
 * - 解析 YAML frontmatter 提取 phase/priority 等元数据
 * - 根据 HelmPhase 过滤并排序激活的 skills
 * - 组装完整的系统 prompt（base rules + active skills + context）
 * - 内置文件缓存和降级容错机制
 */
export class WorkflowEngine {
  private readonly skillsDir: string;
  private readonly baseRulesPath: string;
  private readonly cache = new Map<string, string>();

  constructor(projectRoot?: string) {
    // skills 目录相对于本文件所在位置（与 template-engine.ts 同级）
    this.skillsDir = path.join(__dirname, 'skills');
    this.baseRulesPath = path.join(this.skillsDir, 'base-rules.md');
  }

  /**
   * 渲染指定阶段的完整系统 prompt
   *
   * 组装顺序：base rules → (按优先级排序的 active skills) → context
   *
   * @param phase - 当前 Helm 阶段（如 design / code / debug 等）
   * @param context - 额外的上下文信息（taskSummary, taskType 等）
   * @returns 拼装好的完整 prompt 字符串
   */
  async renderPhasePrompt(phase: string, context: PhasePromptContext = {}): Promise<string> {
    const sections: string[] = [];

    // 1. 加载基础规则（始终包含）
    const baseRules = await this.loadBaseRules();
    if (baseRules) {
      sections.push(baseRules);
    }

    // 2. 加载当前阶段激活的 skills
    const activeSkills = await this.getActiveSkills(phase);

    // 按优先级降序排列（高优先级在前）
    activeSkills.sort((a, b) => b.priority - a.priority);

    for (const skill of activeSkills) {
      sections.push(`\n<!-- SKILL: ${skill.name} -->\n`);
      sections.push(skill.content);
    }

    // 3. 添加动态上下文信息
    if (Object.keys(context).length > 0) {
      const contextLines: string[] = ['\n## 当前上下文\n'];
      contextLines.push(`**阶段**: ${phase.toUpperCase()}\n`);

      if (context.taskSummary) {
        contextLines.push(`**任务**: ${context.taskSummary}\n`);
      }
      if (context.taskType) {
        contextLines.push(`**类型**: ${context.taskType}\n`);
      }
      if (context.contextSummary) {
        contextLines.push(`\n${context.contextSummary}\n`);
      }

      sections.push(contextLines.join(''));
    }

    return sections.join('\n---\n\n').trim();
  }

  /**
   * 获取指定阶段应该激活的所有 skills
   *
   * @param phase - 目标 Helm 阶段
   * @returns 匹配该阶段的 skill 列表（仅包含 content body，无 frontmatter）
   */
  async getActiveSkills(phase: string): Promise<LoadedSkill[]> {
    const skills: LoadedSkill[] = [];

    try {
      const files = await fs.readdir(this.skillsDir);
      const skillFiles = files.filter((f) => f.endsWith('.skill.md'));

      for (const file of skillFiles) {
        const filePath = path.join(this.skillsDir, file);
        const rawContent = await this.loadSkillWithCache(filePath);

        const parsed = this.parseSkillFrontmatter(rawContent, file);

        if (this.shouldActivateInPhase(parsed.phase, phase)) {
          skills.push({
            name: parsed.name || file.replace('.skill.md', ''),
            content: this.stripFrontmatter(rawContent),
            priority: parsed.priority,
            phase: parsed.phase,
          });
        }
      }
    } catch (error) {
      console.error('[WorkflowEngine] Failed to load skills:', error);
      // 返回空数组而非抛错 — 保证降级可用
    }

    // 按优先级降序排列（高优先级在前）
    skills.sort((a, b) => b.priority - a.priority);

    return skills;
  }

  /**
   * 获取所有可用的阶段列表（从所有 skill 的 frontmatter 中聚合）
   */
  async getAvailablePhases(): Promise<string[]> {
    const phases = new Set<string>();

    try {
      const files = await fs.readdir(this.skillsDir);
      const skillFiles = files.filter((f) => f.endsWith('.skill.md'));

      for (const file of skillFiles) {
        const filePath = path.join(this.skillsDir, file);
        const rawContent = await this.loadSkillWithCache(filePath);
        const parsed = this.parseSkillFrontmatter(rawContent, file);

        if (parsed.phase && parsed.phase !== 'all') {
          parsed.phase.split(',').forEach((p) => phases.add(p.trim()));
        }
      }
    } catch (error) {
      console.error('[WorkflowEngine] Failed to get available phases:', error);
    }

    return Array.from(phases);
  }

  /**
   * 判断某个 skill 是否应该在指定阶段激活
   *
   * 支持三种匹配模式：
   * - "all" → 所有阶段都激活
   * - "design" → 精确匹配单个阶段
   * - "design,code" → 逗号分隔的多阶段
   */
  shouldActivateInPhase(skillPhase: string, currentPhase: string): boolean {
    const normalizedSkill = skillPhase.toLowerCase().trim();
    const normalizedTarget = currentPhase.toLowerCase().trim();

    if (normalizedSkill === 'all') return true;
    if (normalizedSkill === normalizedTarget) return true;

    // 逗号分隔的多阶段支持
    return normalizedSkill
      .split(',')
      .map((p) => p.trim())
      .includes(normalizedTarget);
  }

  /**
   * 解析 skill 文件的 YAML frontmatter
   *
   * 使用轻量级手工解析（不依赖 yaml 库），提取：
   * - name: skill 名称
   * - phase: 适用阶段
   * - priority: 优先级数字
   * - triggers: 触发条件列表（可选）
   * - when: 激活时机说明（可选）
   */
  parseSkillFrontmatter(content: string, _filename: string): SkillFrontmatter {
    const result: SkillFrontmatter = {
      name: '',
      phase: 'unknown',
      priority: 0,
    };

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) return result;

    const yamlText = frontmatterMatch[1];
    const lines = yamlText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) continue; // 跳过空行和无冒号的行

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          result.name = value.replace(/^["']|["']$/g, '');
          break;
        case 'phase':
          result.phase = value;
          break;
        case 'priority':
          result.priority = parseInt(value, 10) || 0;
          break;
        case 'triggers':
          result.triggers = value
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          break;
        case 'when':
          result.when = value.replace(/^["']|["']$/g, '');
          break;
      }
    }

    return result;
  }

  /**
   * 移除 YAML frontmatter，只保留 Markdown 内容体
   */
  stripFrontmatter(content: string): string {
    return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
  }

  /**
   * 清除缓存（用于测试或热重载场景）
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取当前缓存大小（用于监控/测试）
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── 私有方法 ──────────────────────────────────────────────

  /**
   * 加载 base-rules.md 基础规则文件
   */
  private async loadBaseRules(): Promise<string | null> {
    try {
      const content = await fs.readFile(this.baseRulesPath, 'utf-8');
      return this.stripFrontmatter(content);
    } catch {
      console.warn('[WorkflowEngine] base-rules.md not found, skipping');
      return null;
    }
  }

  /**
   * 带缓存的 skill 文件读取
   *
   * 缓存策略：LRU 式淘汰（达到上限时删除最早条目）
   */
  private async loadSkillWithCache(filePath: string): Promise<string> {
    const cached = this.cache.get(filePath);
    if (cached !== undefined) return cached;

    const content = await fs.readFile(filePath, 'utf-8');
    this.cache.set(filePath, content);

    // 缓存上限保护
    if (this.cache.size > MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    return content;
  }
}

// ── 单例工厂 ────────────────────────────────────────────────

let _instance: WorkflowEngine | null = null;

/**
 * 获取 WorkflowEngine 单例实例
 *
 * @param projectRoot - 项目根路径（可选，预留扩展用）
 */
export function getWorkflowEngine(projectRoot?: string): WorkflowEngine {
  if (!_instance) {
    _instance = new WorkflowEngine(projectRoot);
  }
  return _instance;
}

/**
 * 重置单例（主要用于单元测试）
 */
export function resetWorkflowEngineInstance(): void {
  _instance = null;
}
