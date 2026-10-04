// ============================================================
// 竞品更新检查脚本
// ============================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// 定义要检查的竞品项目
const COMPETITORS = [
  { name: 'obra/superpowers', url: 'https://api.github.com/repos/obra/superpowers' },
  { name: 'anomalyco/opencode', url: 'https://api.github.com/repos/anomalyco/opencode' },
  { name: 'Fission-AI/OpenSpec', url: 'https://api.github.com/repos/Fission-AI/OpenSpec' },
  { name: 'vercel-labs/open-agents', url: 'https://api.github.com/repos/vercel-labs/open-agents' },
  { name: 'github/spec-kit', url: 'https://api.github.com/repos/github/spec-kit' },
];

interface RepoInfo {
  name: string;
  url: string;
  latestCommit?: string;
  latestCommitDate?: string;
  latestRelease?: string;
  latestReleaseDate?: string;
  stars?: number;
  forks?: number;
}

async function fetchRepoInfo(repo: typeof COMPETITORS[0]): Promise<RepoInfo> {
  const result: RepoInfo = { name: repo.name, url: repo.url };
  
  try {
    // 使用 curl 获取 GitHub API 数据
    const { stdout } = await execAsync(`curl -s "${repo.url}" -H "Accept: application/vnd.github.v3+json"`);
    const data = JSON.parse(stdout);
    
    result.stars = data.stargazers_count;
    result.forks = data.forks_count;
    result.latestCommitDate = data.updated_at;
    
    // 获取最新 release
    const releasesUrl = `${repo.url}/releases/latest`;
    const releaseResult = await execAsync(`curl -s "${releasesUrl}" -H "Accept: application/vnd.github.v3+json"`);
    const releaseData = JSON.parse(releaseResult.stdout);
    
    if (releaseData.tag_name) {
      result.latestRelease = releaseData.tag_name;
      result.latestReleaseDate = releaseData.published_at;
    }
    
  } catch (err) {
    console.error(`获取 ${repo.name} 信息失败: ${(err as Error).message}`);
  }
  
  return result;
}

async function generateReport(infos: RepoInfo[]): Promise<string> {
  const now = new Date().toISOString();
  
  let report = `# 竞品更新检查报告\n\n`;
  report += `生成时间: ${now}\n\n`;
  report += `## 概览\n\n`;
  report += `| 项目 | Stars | Forks | 最新版本 | 版本发布时间 |\n`;
  report += `|------|-------|-------|----------|--------------|\n`;
  
  for (const info of infos) {
    report += `| [${info.name}](https://github.com/${info.name}) | ${info.stars || '-'} | ${info.forks || '-'} | ${info.latestRelease || '-'} | ${info.latestReleaseDate ? new Date(info.latestReleaseDate).toLocaleDateString() : '-'} |\n`;
  }
  
  report += `\n## 详细信息\n\n`;
  
  for (const info of infos) {
    report += `### ${info.name}\n\n`;
    report += `- **GitHub**: https://github.com/${info.name}\n`;
    report += `- **Stars**: ${info.stars || '-'} | **Forks**: ${info.forks || '-'} |\n`;
    report += `- **最新版本**: ${info.latestRelease || '暂无'}\n`;
    report += `- **版本发布**: ${info.latestReleaseDate ? new Date(info.latestReleaseDate).toLocaleString() : '-'} |\n`;
    report += `- **最近更新**: ${info.latestCommitDate ? new Date(info.latestCommitDate).toLocaleString() : '-'} |\n\n`;
  }
  
  return report;
}

async function main() {
  console.log('=== 开始检查竞品更新 ===\n');
  
  const results: RepoInfo[] = [];
  
  for (const competitor of COMPETITORS) {
    console.log(`检查: ${competitor.name}...`);
    const info = await fetchRepoInfo(competitor);
    results.push(info);
    console.log(`   ✓ 完成`);
  }
  
  console.log('\n=== 生成报告 ===\n');
  
  const report = await generateReport(results);
  
  // 保存报告
  const reportDir = path.join(process.cwd(), 'docs', 'competitor-tracking');
  await fs.mkdir(reportDir, { recursive: true });
  
  const reportPath = path.join(reportDir, `competitor-update-${new Date().toISOString().split('T')[0]}.md`);
  await fs.writeFile(reportPath, report, 'utf-8');
  
  console.log(`报告已保存: ${reportPath}`);
  
  // 更新索引文件
  const indexPath = path.join(reportDir, 'index.md');
  const indexContent = `# 竞品跟踪索引\n\n` +
    `最近更新: ${new Date().toLocaleString()}\n\n` +
    `## 检查记录\n\n` +
    `| 日期 | 状态 |\n` +
    `|------|------|\n` +
    `| ${new Date().toLocaleDateString()} | ✅ 已检查 |\n`;
  
  await fs.writeFile(indexPath, indexContent, 'utf-8');
  
  console.log('\n=== 检查完成 ===\n');
}

main().catch(console.error);
