// The registry is the ONLY thing the hub keeps about the Ants: which repositories to read and how they
// are grouped (docs/CARD-FORMAT.md). Everything on a card comes from the Ant's own repository.
import { parse } from 'smol-toml';

export type Group = { id: string; title: string };
export type RegistryAnt = {
  slug: string;
  name: string;
  group: string;
  repo?: string; // owner/name; an Ant with no public repository yet has none
  ref?: string; // a branch, tag or commit; default: the repository's default branch
  card: 'required' | 'pending';
  // Only for `pending`: shown in the coming row until the Ant carries easyants-card.toml.
  sentence?: string;
  statusLabel?: string;
};
export type Registry = { groups: Group[]; ants: RegistryAnt[] };

const fail = (why: string): never => {
  throw new Error(`registry: ${why}`);
};
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REF = /^[A-Za-z0-9._\/-]+$/;

export function parseRegistry(text: string): Registry {
  let t: Record<string, unknown>;
  try {
    t = parse(text);
  } catch (e) {
    return fail(`not valid TOML (${(e as Error).message.split('\n')[0]})`);
  }
  const rawGroups = Array.isArray(t.group) ? (t.group as Record<string, unknown>[]) : [];
  const rawAnts = Array.isArray(t.ant) ? (t.ant as Record<string, unknown>[]) : [];
  if (rawGroups.length === 0) fail('needs at least one [[group]]');
  if (rawAnts.length === 0) fail('needs at least one [[ant]]');

  const groups = rawGroups.map((g, i) => {
    if (typeof g.id !== 'string' || !SLUG.test(g.id)) fail(`group #${i + 1}: \`id\` must be a lowercase slug`);
    if (typeof g.title !== 'string' || g.title.trim() === '') fail(`group ${g.id}: \`title\` must be a non-empty string`);
    return { id: g.id as string, title: (g.title as string).trim() };
  });
  const groupIds = new Set<string>();
  for (const g of groups) {
    if (groupIds.has(g.id)) fail(`duplicate group id ${g.id}`);
    groupIds.add(g.id);
  }

  const seen = new Set<string>();
  const ants = rawAnts.map((a, i): RegistryAnt => {
    const slug = a.slug;
    if (typeof slug !== 'string' || !SLUG.test(slug)) return fail(`ant #${i + 1}: \`slug\` must be a lowercase slug`);
    if (seen.has(slug)) fail(`duplicate ant slug ${slug}`);
    seen.add(slug);
    const at = `ant ${slug}`;
    if (typeof a.name !== 'string' || a.name.trim() === '') fail(`${at}: \`name\` must be a non-empty string`);
    if (typeof a.group !== 'string' || !groupIds.has(a.group)) fail(`${at}: \`group\` must name a [[group]] id`);
    if (a.repo !== undefined && (typeof a.repo !== 'string' || !REPO.test(a.repo))) fail(`${at}: \`repo\` must be owner/name`);
    if (a.ref !== undefined && (typeof a.ref !== 'string' || !REF.test(a.ref))) fail(`${at}: \`ref\` must be a branch, tag or commit`);
    if (a.card !== 'required' && a.card !== 'pending') fail(`${at}: \`card\` must be "required" or "pending"`);
    const known = ['slug', 'name', 'group', 'repo', 'ref', 'card', 'sentence', 'status_label'];
    const extra = Object.keys(a).filter((k) => !known.includes(k));
    if (extra.length > 0) fail(`${at}: unknown field(s): ${extra.join(', ')}`);

    if (a.card === 'required') {
      if (a.repo === undefined) fail(`${at}: a required card needs a \`repo\``);
      for (const k of ['sentence', 'status_label']) {
        if (a[k] !== undefined) fail(`${at}: \`${k}\` belongs in the Ant's own card file, not the registry`);
      }
    } else {
      if (a.ref !== undefined && a.repo === undefined) fail(`${at}: \`ref\` needs a \`repo\``);
      for (const k of ['sentence', 'status_label']) {
        if (typeof a[k] !== 'string' || (a[k] as string).trim() === '') fail(`${at}: a pending Ant needs \`${k}\``);
      }
    }
    return {
      slug,
      name: a.name as string,
      group: a.group as string,
      repo: a.repo as string | undefined,
      ref: a.ref as string | undefined,
      card: a.card as 'required' | 'pending',
      sentence: a.sentence as string | undefined,
      statusLabel: a.status_label as string | undefined,
    };
  });
  return { groups, ants };
}
