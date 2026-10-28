import { parseCard, sortCards, type Card } from './card';

// Every file in src/data/ants/ is one Ant's card. A file that breaks the format fails the build.
const files = import.meta.glob('../data/ants/*.toml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const cards: Card[] = sortCards(Object.entries(files).map(([path, text]) => parseCard(text, path)));

// Facts a card marks as unchecked, listed in the build log so they are never forgotten.
for (const c of cards) {
  if (c.unverified.length > 0) console.warn(`[easyants] ${c.slug}: unverified ${c.unverified.join(', ')} (docs/CARD-FORMAT.md)`);
}
