/**
 * Hermes Skills Adapter
 * 
 * 移植自 NousResearch/hermes-agent
 * 
 * 目标：将 Hermes 的 skill 格式转换为 OpenTaiji 兼容格式
 * 
 * Hermes skill 格式：
 * skills/<category>/<name>/SKILL.md
 * skills/<category>/<name>/references/
 * skills/<category>/<name>/templates/
 * 
 * OpenTaiji skill 格式：
 * workspace/skills/<name>/SKILL.md
 * workspace/skills/<name>/references/
 */

// ---------------------------------------------------------------------------
// Hermes skill manifest (移植自 hermes/skills/__init__.py)
// ---------------------------------------------------------------------------

export interface HermesSkillMetadata {
  name: string;
  description: string;
  category: string;
  version?: string;
  author?: string;
  tags?: string[];
}

export interface HermesSkillReference {
  name: string;
  path: string;
  type: "reference" | "template";
}

/**
 * 解析 Hermes SKILL.md 的 frontmatter
 * 
 * Hermes 格式:
 * ---
 * name: skill-name
 * description: Skill description
 * category: research
 * ---
 */
export function parseHermesSkillFrontmatter(content: string): HermesSkillMetadata | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const lines = frontmatterMatch[1].split("\n");
  const metadata: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) {
      metadata[key] = value;
    }
  }

  return {
    name: metadata.name ?? "",
    description: metadata.description ?? "",
    category: metadata.category ?? "",
    version: metadata.version,
    author: metadata.author,
    tags: metadata.tags
      ? metadata.tags.split(",").map((t: string) => t.trim())
      : undefined,
  };
}

/**
 * OpenTaiji skill manifest (from SKILL.md frontmatter)
 */
export interface OpenTaijiSkillManifest {
  name: string;
  description: string;
  triggers?: string[];
  actions?: string[];
  version?: string;
}

/**
 * 将 Hermes skill manifest 转换为 OpenTaiji manifest
 */
export function hermesToOpenTaijiManifest(
  hermes: HermesSkillMetadata
): OpenTaijiSkillManifest {
  return {
    name: hermes.name,
    description: hermes.description,
    version: hermes.version,
  };
}

// ---------------------------------------------------------------------------
// Hermes 核心 skill 类别 (from hermes/skills/)
// ---------------------------------------------------------------------------

export const HERMES_SKILL_CATEGORIES = [
  "research",     // 研究类: arxiv, llm-wiki, polymarket, blogwatcher
  "productivity", // 生产力: notion, linear, google-workspace, ocr, powerpoint
  "email",        // 邮件: himalaya
  "mcp",          // MCP: mcporter, native-mcp
  "devops",       // DevOps: webhook-subscriptions
  "smart-home",   // 智能家居: openhue
  "note-taking",  // 笔记: obsidian
  "apple",        // Apple生态: apple-notes, imessage
  "dogfood",      // 内部测试
] as const;

export type HermesSkillCategory = (typeof HERMES_SKILL_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Hermes skill scanner
// ---------------------------------------------------------------------------

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * 扫描 Hermes skills 目录，返回所有可用 skill
 */
export async function scanHermesSkillsDir(
  hermesDir: string
): Promise<HermesSkillMetadata[]> {
  const skills: HermesSkillMetadata[] = [];

  async function scanCategory(categoryDir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(categoryDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(categoryDir, entry.name);
      const skillMdPath = path.join(skillDir, "SKILL.md");

      let content: string;
      try {
        content = await fs.readFile(skillMdPath, "utf-8");
      } catch {
        continue;
      }

      const metadata = parseHermesSkillFrontmatter(content);
      if (!metadata) continue;

      skills.push({
        ...metadata,
        category: path.basename(categoryDir),
      });
    }
  }

  try {
    const categoryEntries = await fs.readdir(hermesDir, { withFileTypes: true });
    for (const entry of categoryEntries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      await scanCategory(path.join(hermesDir, entry.name));
    }
  } catch {
    // hermesDir doesn't exist
  }

  return skills;
}

/**
 * 获取 Hermes skill 的 references 目录内容
 */
export async function getHermesSkillReferences(
  hermesDir: string,
  category: string,
  name: string
): Promise<HermesSkillReference[]> {
  const refs: HermesSkillReference[] = [];
  const skillDir = path.join(hermesDir, category, name, "references");

  try {
    const entries = await fs.readdir(skillDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        refs.push({
          name: entry.name,
          path: path.join(skillDir, entry.name),
          type: "reference",
        });
      } else if (entry.isDirectory()) {
        const subDir = path.join(skillDir, entry.name);
        const subEntries = await fs.readdir(subDir);
        for (const subEntry of subEntries) {
          refs.push({
            name: `${entry.name}/${subEntry}`,
            path: path.join(subDir, subEntry),
            type: "reference",
          });
        }
      }
    }
  } catch {
    // No references dir
  }

  return refs;
}
