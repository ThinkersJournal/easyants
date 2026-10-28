// Build the page's cards from the registry and each Ant's own repository. The rule that matters: a source
// that is missing, invalid or unreachable FAILS the build, listing every such source. There is no fallback
// to an earlier copy, so a card is never older than the Ant it describes.
import { CARD_FILE, langOf, parseCardFile, pickExample } from './card';
import type { Registry, RegistryAnt } from './registry';
import type { Source } from './sources';

export type Card = {
  slug: string;
  name: string;
  group: string;
  groupTitle: string;
  sentence: string;
} & (
  | {
      status: 'released';
      installUrl: string;
      installSnippet?: string;
      docs: string;
      example: { lang: string; code: string; source: string; excerpt: boolean };
    }
  | { status: 'coming'; statusLabel: string; docs?: string }
);

export type Loaded = { cards: Card[]; warnings: string[] };

async function loadOne(ant: RegistryAnt, groupTitle: string, source: Source, warnings: string[]): Promise<Card> {
  const head = { slug: ant.slug, name: ant.name, group: ant.group, groupTitle };
  const coming = (): Card => ({ ...head, status: 'coming', sentence: ant.sentence as string, statusLabel: ant.statusLabel as string });
  if (ant.repo === undefined) return coming();

  const sha = await source.resolve(ant.repo, ant.ref ?? 'HEAD');
  const where = `${ant.repo}/${CARD_FILE} @ ${sha.slice(0, 7)}`;
  const text = await source.file(ant.repo, sha, CARD_FILE);
  if (text === null) {
    if (ant.card === 'required') throw new Error(`${where}: missing, but the registry says this Ant's card is required`);
    return coming();
  }
  if (ant.card === 'pending') {
    warnings.push(`${ant.slug}: ${ant.repo} now carries ${CARD_FILE}; set card = "required" in the registry so it can never silently go missing`);
  }

  const file = parseCardFile(text, where);
  if (file.name !== ant.name) throw new Error(`${where}: \`name\` is ${JSON.stringify(file.name)} but the registry calls this Ant ${JSON.stringify(ant.name)}`);
  if (file.status === 'not-ready') {
    return { ...head, status: 'coming', sentence: file.sentence, statusLabel: file.statusLabel, docs: file.docs };
  }
  const exampleWhere = `${ant.repo}/${file.examplePath} @ ${sha.slice(0, 7)}`;
  const exampleText = await source.file(ant.repo, sha, file.examplePath);
  if (exampleText === null) throw new Error(`${where}: \`example_path\` ${file.examplePath} does not exist in the repository`);
  const { code, excerpt } = pickExample(exampleText, file.exampleLines, exampleWhere);
  return {
    ...head,
    status: 'released',
    sentence: file.sentence,
    installUrl: file.installUrl,
    installSnippet: file.installSnippet,
    docs: file.docs,
    example: { lang: langOf(file.examplePath), code, source: exampleWhere, excerpt },
  };
}

export async function loadCards(reg: Registry, source: Source): Promise<Loaded> {
  const titles = new Map(reg.groups.map((g) => [g.id, g.title]));
  const warnings: string[] = [];
  const results = await Promise.all(
    reg.ants.map((ant) =>
      loadOne(ant, titles.get(ant.group) as string, source, warnings).then(
        (card) => ({ ok: true as const, card }),
        (e: Error) => ({ ok: false as const, error: `${ant.slug}: ${e.message}` }),
      ),
    ),
  );
  const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));
  if (errors.length > 0) {
    throw new Error(`EasyAnts: ${errors.length} of ${reg.ants.length} Ant source(s) failed; the build does not fall back to older copies:\n - ${errors.join('\n - ')}`);
  }
  const cards = results.flatMap((r) => (r.ok ? [r.card] : []));
  // Registry order is the page order: groups in their listed order, Ants in theirs within a group.
  const groupRank = new Map(reg.groups.map((g, i) => [g.id, i]));
  const antRank = new Map(reg.ants.map((a, i) => [a.slug, i]));
  cards.sort((a, b) => (groupRank.get(a.group) as number) - (groupRank.get(b.group) as number) || (antRank.get(a.slug) as number) - (antRank.get(b.slug) as number));
  return { cards, warnings };
}
