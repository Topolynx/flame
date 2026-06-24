import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_SLUG_REGEX,
  extractWorkspaceSlugFromPath,
  isReservedWorkspaceSlug,
  isValidWorkspaceSlug,
  slugifyWorkspaceName,
  sortWorkspacesForSwitcher,
  filterVisibleWorkspaces,
  getWorkspaceHref,
  workspaceSlugSchema,
  type Workspace,
} from '@/lib/workspaces';

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 1,
  slug: 'home',
  name: 'Home',
  isDefault: false,
  isPublic: true,
  ...overrides,
});

describe('WORKSPACE_SLUG_REGEX', () => {
  it.each([
    ['lowercase letters', 'home'],
    ['letters and digits', 'home1'],
    ['internal dashes', 'my-home'],
    ['single character', 'a'],
    ['letters numbers dashes mixed', 'ab12-c'],
  ])('accepts %s (%s)', (_label, value) => {
    expect(WORKSPACE_SLUG_REGEX.test(value)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['leading dash', '-home'],
    ['trailing dash', 'home-'],
    ['uppercase', 'Home'],
    ['space', 'my home'],
    ['underscore', 'my_team'],
    ['slash', 'home/inner'],
    ['unicode', 'tëam'],
  ])('rejects %s (%s)', (_label, value) => {
    expect(WORKSPACE_SLUG_REGEX.test(value)).toBe(false);
  });
});

describe('workspaceSlugSchema', () => {
  it('trims surrounding whitespace before validating', () => {
    const result = workspaceSlugSchema.safeParse('  home  ');

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe('home');
    }
  });

  it('rejects reserved slugs with a helpful message', () => {
    const result = workspaceSlugSchema.safeParse('settings');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/reserved/i);
    }
  });
});

describe('isReservedWorkspaceSlug', () => {
  it.each(['api', 'settings', 'login', 'admin', 'migrate', 'uploads', '_next'])(
    'flags %s as reserved',
    slug => {
      expect(isReservedWorkspaceSlug(slug)).toBe(true);
    },
  );

  it('lets ordinary slugs through', () => {
    expect(isReservedWorkspaceSlug('home')).toBe(false);
    expect(isReservedWorkspaceSlug('work')).toBe(false);
  });
});

describe('isValidWorkspaceSlug', () => {
  it('returns true for a normal slug', () => {
    expect(isValidWorkspaceSlug('home')).toBe(true);
  });

  it('returns false for a reserved slug', () => {
    expect(isValidWorkspaceSlug('settings')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidWorkspaceSlug('')).toBe(false);
  });
});

describe('getWorkspaceHref', () => {
  it('returns / for the default workspace regardless of slug', () => {
    expect(getWorkspaceHref({ slug: null, isDefault: true })).toBe('/');
    expect(getWorkspaceHref({ slug: 'anything', isDefault: true })).toBe('/');
  });

  it('returns /slug for non-default workspaces', () => {
    expect(getWorkspaceHref({ slug: 'home', isDefault: false })).toBe('/home');
  });
});

describe('filterVisibleWorkspaces', () => {
  it('returns every workspace when the visitor is authenticated', () => {
    const workspaces = [
      makeWorkspace({ id: 1, isPublic: true }),
      makeWorkspace({ id: 2, isPublic: false, slug: 'private' }),
    ];

    expect(filterVisibleWorkspaces(workspaces, true)).toEqual(workspaces);
  });

  it('hides private workspaces from guests', () => {
    const workspaces = [
      makeWorkspace({ id: 1, isPublic: true }),
      makeWorkspace({ id: 2, isPublic: false, slug: 'private' }),
    ];

    expect(filterVisibleWorkspaces(workspaces, false)).toEqual([workspaces[0]]);
  });
});

describe('slugifyWorkspaceName', () => {
  it.each([
    ['Home A', 'home-a'],
    ['  Spaced  Out  ', 'spaced-out'],
    ['UPPER', 'upper'],
    ['has.dots-and_underscores', 'has-dots-and-underscores'],
    ['multiple   spaces', 'multiple-spaces'],
    ['---leading-and-trailing---', 'leading-and-trailing'],
    ['emoji 🌟 inside', 'emoji-inside'],
    ['', ''],
  ])('turns "%s" into "%s"', (input, expected) => {
    expect(slugifyWorkspaceName(input)).toBe(expected);
  });

  it('produces something the schema accepts when input is non-empty', () => {
    expect(isValidWorkspaceSlug(slugifyWorkspaceName('My Home'))).toBe(true);
  });
});

describe('extractWorkspaceSlugFromPath', () => {
  it('returns null for the root path', () => {
    expect(extractWorkspaceSlugFromPath('/')).toBeNull();
  });

  it('returns null for an empty path', () => {
    expect(extractWorkspaceSlugFromPath('')).toBeNull();
  });

  it('returns null for reserved settings paths', () => {
    expect(extractWorkspaceSlugFromPath('/settings')).toBeNull();
    expect(extractWorkspaceSlugFromPath('/settings/themes')).toBeNull();
  });

  it('returns null for reserved api/login/migrate', () => {
    expect(extractWorkspaceSlugFromPath('/api/foo')).toBeNull();
    expect(extractWorkspaceSlugFromPath('/login')).toBeNull();
    expect(extractWorkspaceSlugFromPath('/migrate')).toBeNull();
  });

  it('returns the slug for a non-reserved first segment', () => {
    expect(extractWorkspaceSlugFromPath('/home')).toBe('home');
    expect(extractWorkspaceSlugFromPath('/work')).toBe('work');
  });

  it('ignores query and hash before parsing', () => {
    expect(extractWorkspaceSlugFromPath('/home?foo=bar')).toBe('home');
    expect(extractWorkspaceSlugFromPath('/home#hash')).toBe('home');
  });

  it('returns null when the first segment is not a valid slug shape', () => {
    expect(extractWorkspaceSlugFromPath('/Home')).toBeNull();
    expect(extractWorkspaceSlugFromPath('/-home')).toBeNull();
  });
});

describe('sortWorkspacesForSwitcher', () => {
  it('puts the default workspace first regardless of name', () => {
    const workspaces = [
      makeWorkspace({ id: 2, name: 'Beta' }),
      makeWorkspace({ id: 1, slug: null, isDefault: true, name: 'Zeta' }),
      makeWorkspace({ id: 3, name: 'Alpha' }),
    ];

    const sorted = sortWorkspacesForSwitcher(workspaces);

    expect(sorted.map(({ id }) => id)).toEqual([1, 3, 2]);
  });

  it('sorts non-default workspaces alphabetically by name', () => {
    const workspaces = [
      makeWorkspace({ id: 2, name: 'Beta' }),
      makeWorkspace({ id: 3, name: 'Alpha' }),
      makeWorkspace({ id: 4, name: 'gamma' }),
    ];

    const sorted = sortWorkspacesForSwitcher(workspaces);

    expect(sorted.map(({ name }) => name)).toEqual(['Alpha', 'Beta', 'gamma']);
  });
});
