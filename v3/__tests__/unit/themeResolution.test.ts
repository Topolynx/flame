import { describe, expect, it } from 'vitest';

import { pickActiveThemeName } from '@/lib/themes';

const baseInput = {
  preferredLocalTheme: null as string | null,
  followWorkspaceTheme: false,
  workspaceTheme: null as string | null,
  globalDefaultTheme: 'tron',
};

describe('pickActiveThemeName', () => {
  it('uses the global default on a workspace without an override', () => {
    expect(pickActiveThemeName(baseInput)).toBe('tron');
  });

  it('uses the local override over the global default on a workspace without an override', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        preferredLocalTheme: 'cab',
      }),
    ).toBe('cab');
  });

  it('uses the workspace override when no local override is set', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        workspaceTheme: 'paper',
      }),
    ).toBe('paper');
  });

  it('lets the local override beat the workspace override by default', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        preferredLocalTheme: 'cab',
        workspaceTheme: 'paper',
      }),
    ).toBe('cab');
  });

  it('lets the workspace override beat the local override when follow-workspace is on', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        preferredLocalTheme: 'cab',
        workspaceTheme: 'paper',
        followWorkspaceTheme: true,
      }),
    ).toBe('paper');
  });

  it('keeps the local override on workspaces without one even when follow-workspace is on', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        preferredLocalTheme: 'cab',
        followWorkspaceTheme: true,
      }),
    ).toBe('cab');
  });

  it('falls back to the global default when follow-workspace is on but neither override is set', () => {
    expect(
      pickActiveThemeName({
        ...baseInput,
        followWorkspaceTheme: true,
      }),
    ).toBe('tron');
  });
});
