import { describe, expect, it } from 'vitest';

import { getAllIconNames, getIconSvg, iconExists, searchIcons } from '@/lib/icons';

describe('getIconSvg', () => {
  it('returns path and viewBox for a known MDI icon', () => {
    const icon = getIconSvg('mdiCog');

    expect(icon).not.toBeNull();
    expect(icon?.viewBox).toBe('0 0 24 24');
    expect(typeof icon?.path).toBe('string');
    expect(icon?.path.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown icon name', () => {
    const icon = getIconSvg('mdiNotARealIconName');

    expect(icon).toBeNull();
  });

  it('returns null for an empty string', () => {
    const icon = getIconSvg('');

    expect(icon).toBeNull();
  });
});

describe('iconExists', () => {
  it('reports true for an MDI export', () => {
    expect(iconExists('mdiCog')).toBe(true);
  });

  it('reports false for an unknown name', () => {
    expect(iconExists('mdiTotallyMadeUp')).toBe(false);
  });
});

describe('searchIcons', () => {
  it('matches an icon by its name substring', () => {
    const { items, total } = searchIcons({ query: 'cog' });

    expect(items.some(({ name }) => name === 'mdiCog')).toBe(true);
    expect(total).toBeGreaterThan(0);
  });

  it('matches an icon by tag', () => {
    const { items } = searchIcons({ query: 'math', limit: 200 });
    const names = items.map(({ name }) => name);

    expect(names).toContain('mdiAbacus');
  });

  it('returns every icon when the query is empty', () => {
    const { total, items } = searchIcons({ query: '', limit: 10 });

    expect(total).toBe(getAllIconNames().length);
    expect(items).toHaveLength(10);
  });

  it('respects the offset and limit when paginating', () => {
    const firstPage = searchIcons({ query: '', offset: 0, limit: 5 });
    const secondPage = searchIcons({ query: '', offset: 5, limit: 5 });

    expect(firstPage.items).toHaveLength(5);
    expect(secondPage.items).toHaveLength(5);

    const firstNames = firstPage.items.map(({ name }) => name);
    const secondNames = secondPage.items.map(({ name }) => name);

    for (const name of firstNames) {
      expect(secondNames).not.toContain(name);
    }
  });

  it('caps a limit larger than the maximum', () => {
    const { items } = searchIcons({ query: '', limit: 100_000 });

    expect(items.length).toBeLessThanOrEqual(200);
  });

  it('treats a negative offset as zero', () => {
    const baseline = searchIcons({ query: '', offset: 0, limit: 3 });
    const negative = searchIcons({ query: '', offset: -5, limit: 3 });

    expect(negative.items.map(({ name }) => name)).toEqual(baseline.items.map(({ name }) => name));
  });

  it('returns no items when the query matches nothing', () => {
    const { items, total } = searchIcons({ query: 'zzzzzzzzzzzznosuchquery' });

    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('matches case-insensitively', () => {
    const lower = searchIcons({ query: 'cog' });
    const upper = searchIcons({ query: 'COG' });

    expect(upper.total).toBe(lower.total);
  });

  it('includes the icon path on each search result', () => {
    const { items } = searchIcons({ query: 'cog', limit: 5 });

    for (const item of items) {
      expect(item.path.length).toBeGreaterThan(0);
    }
  });
});
