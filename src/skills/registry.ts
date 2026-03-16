/**
 * Skillhub registry integration: parse repo_url and fetch SKILL.md from GitHub.
 */

const SKILLHUB_BASE = 'https://www.skillhub.club/api/v1';
const RAW_BASE = 'https://raw.githubusercontent.com';

export interface SkillhubSkill {
  id: string;
  name: string;
  slug: string;
  author: string;
  description: string | null;
  description_zh?: string | null;
  category?: string;
  tags?: string[];
  simple_score?: number | null;
  simple_rating?: string | null;
  github_stars?: number;
  repo_url?: string;
}

export interface SkillhubSearchResponse {
  skills: SkillhubSkill[];
  total: number;
}

/**
 * Search Skillhub registry via the public desktop/search endpoint (no auth).
 */
export async function searchSkillhubRegistry(
  query: string,
  limit = 20
): Promise<SkillhubSearchResponse> {
  const res = await fetch(`${SKILLHUB_BASE}/desktop/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim(), limit }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skillhub search failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<SkillhubSearchResponse>;
}

/**
 * Parse repo_url to extract owner, repo, and skill path.
 * Formats:
 * - https://github.com/anthropics/skills#skills-pdf → skills/pdf
 * - https://github.com/shareAI-lab/learn-claude-code#skills~code-review → skills/code-review
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string; path: string } | null {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== 'github.com') return null;
    const pathParts = url.pathname.slice(1).split('/');
    if (pathParts.length < 2) return null;
    const [owner, repo] = pathParts;
    const hash = url.hash.slice(1); // e.g. "skills-pdf" or "skills~code-review"
    if (!hash) return null;

    // skills-pdf → pdf, skills~code-review → code-review
    let folder: string;
    if (hash.startsWith('skills-')) {
      folder = hash.slice('skills-'.length);
    } else if (hash.startsWith('skills~')) {
      folder = hash.slice('skills~'.length).replace(/~/g, '-');
    } else {
      folder = hash.replace(/~/g, '-');
    }
    if (!folder) return null;

    return { owner, repo, path: `skills/${folder}/SKILL.md` };
  } catch {
    return null;
  }
}

/**
 * Fetch SKILL.md content from GitHub raw.
 * Tries main then master branch.
 */
export async function fetchSkillContentFromGitHub(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const branches = ['main', 'master'];
  for (const branch of branches) {
    const url = `${RAW_BASE}/${owner}/${repo}/${branch}/${path}`;
    const res = await fetch(url);
    if (res.ok) {
      return res.text();
    }
  }
  throw new Error(
    `Could not fetch SKILL.md from ${owner}/${repo} (tried main, master). ` +
      `Path: ${path}. The repo structure may differ.`
  );
}

/**
 * Fetch SKILL.md content for a skill from its repo_url.
 */
export async function fetchSkillContentFromRepoUrl(repoUrl: string): Promise<string> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid repo_url format: ${repoUrl}`);
  }
  return fetchSkillContentFromGitHub(parsed.owner, parsed.repo, parsed.path);
}
