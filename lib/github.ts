import { profile } from '@/content/profile';

export type GithubSummary = {
  publicRepos: number;
  lastPush: string | null;
  languages: { name: string; share: number }[];
};

/**
 * Repo metadata, fetched at BUILD time and revalidated daily.
 *
 * Never client-side: a visitor should not spend a round trip on this, and a
 * popular page should not spend the viewer's IP against GitHub's anonymous
 * rate limit.
 *
 * Returns null on any failure — bad status, rate limit, network, or an egress
 * policy that blocks api.github.com (which is the case in the CI sandbox this
 * was built in). The section simply does not render. It is deliberately not a
 * committed snapshot of repo names and counts: stale numbers presented as live
 * ones would be worse than no numbers at all.
 */
export async function getGithubSummary(): Promise<GithubSummary | null> {
  if (!profile.githubUser) return null;

  try {
    const res = await fetch(
      `https://api.github.com/users/${profile.githubUser}/repos?per_page=100&sort=pushed&type=owner`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `${profile.githubUser}-portfolio`,
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 86400 },
      },
    );

    if (!res.ok) {
      console.warn(`[github] ${res.status} ${res.statusText} — section omitted`);
      return null;
    }

    const repos: Array<{ fork: boolean; pushed_at: string | null; language: string | null }> =
      await res.json();
    const owned = repos.filter((r) => !r.fork);
    if (owned.length === 0) return null;

    const counts = new Map<string, number>();
    for (const repo of owned) {
      if (!repo.language) continue;
      counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    }
    const totalTyped = [...counts.values()].reduce((a, b) => a + b, 0);

    const pushes = owned.map((r) => r.pushed_at).filter((d): d is string => Boolean(d));

    return {
      publicRepos: owned.length,
      lastPush: pushes.length ? pushes.sort().at(-1)! : null,
      languages: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, share: Math.round((count / totalTyped) * 100) })),
    };
  } catch (error) {
    console.warn('[github] fetch failed — section omitted:', (error as Error).message);
    return null;
  }
}
