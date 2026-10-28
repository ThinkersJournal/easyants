// Where an Ant's files come from. `Source` is the seam the tests use: the build reads GitHub, the tests
// read fixture repositories from a directory. Neither ever falls back to a copy.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Source {
  // Resolve a ref (default branch, tag or commit) to a commit SHA. Throws if the repository is unreachable.
  resolve(repo: string, ref: string): Promise<string>;
  // The text of `path` at that commit, or null when the repository is reachable and the file is not there.
  // Anything else (network error, rate limit, server error) throws.
  file(repo: string, sha: string, path: string): Promise<string | null>;
}

type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ status: number; ok: boolean; text(): Promise<string> }>;

export function githubSource(opts: { token?: string; fetchImpl?: FetchLike; timeoutMs?: number } = {}): Source {
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const timeout = opts.timeoutMs ?? 20_000;

  // One retry on a network error or a 5xx: a blip must not fail a build, but two in a row must.
  async function get(url: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
    let last = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await doFetch(url, { headers, signal: AbortSignal.timeout(timeout) });
        if (res.status >= 500) {
          last = `HTTP ${res.status}`;
          continue;
        }
        return { status: res.status, text: await res.text() };
      } catch (e) {
        last = (e as Error).message;
      }
    }
    throw new Error(`could not read ${url} (${last})`);
  }

  return {
    async resolve(repo, ref) {
      const headers: Record<string, string> = { Accept: 'application/vnd.github.sha', 'User-Agent': 'easyants-hub' };
      if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
      const { status, text } = await get(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`, headers);
      if (status !== 200) throw new Error(`repository ${repo} at ${ref} is unreachable (HTTP ${status})`);
      const sha = text.trim();
      if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`repository ${repo} at ${ref}: GitHub answered ${JSON.stringify(sha.slice(0, 40))}, not a commit SHA`);
      return sha;
    },
    async file(repo, sha, path) {
      const { status, text } = await get(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`, { 'User-Agent': 'easyants-hub' });
      if (status === 404) return null;
      if (status !== 200) throw new Error(`${repo}/${path} @ ${sha.slice(0, 7)} could not be read (HTTP ${status})`);
      return text;
    },
  };
}

// Fixture repositories on disk: <root>/<owner>/<name>/SHA holds the commit, files live under <root>/<owner>/<name>/files/.
export function dirSource(root: string): Source {
  return {
    async resolve(repo) {
      try {
        return (await readFile(join(root, repo, 'SHA'), 'utf8')).trim();
      } catch {
        throw new Error(`fixture repository ${repo} does not exist under ${root}`);
      }
    },
    async file(repo, _sha, path) {
      try {
        return await readFile(join(root, repo, 'files', path), 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
  };
}
