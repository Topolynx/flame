import * as mdi from '@mdi/js';

import iconsData from './iconsData.json';
import { iconsLog } from './logger';

const MDI_VIEWBOX = '0 0 24 24';

export type IconMeta = {
  name: string;
  kebab: string;
  tags: string[];
  aliases: string[];
};

export type IconSvg = {
  path: string;
  viewBox: string;
};

export type IconSearchResult = {
  name: string;
  path: string;
  tags: string[];
};

export type IconSearchResponse = {
  items: IconSearchResult[];
  total: number;
};

const ALL_ICONS = iconsData as IconMeta[];

const mdiRegistry = mdi as Record<string, string>;

export const getIconSvg = (name: string): IconSvg | null => {
  const path = mdiRegistry[name];

  if (typeof path !== 'string' || path.length === 0) {
    iconsLog.warn({ name }, 'icon name not found in @mdi/js');

    return null;
  }

  return { path, viewBox: MDI_VIEWBOX };
};

export const iconExists = (name: string): boolean => typeof mdiRegistry[name] === 'string';

const iconMatchesQuery = ({ name, kebab, tags, aliases }: IconMeta, query: string): boolean => {
  if (name.toLowerCase().includes(query)) {
    return true;
  }

  if (kebab.includes(query)) {
    return true;
  }

  for (const tag of tags) {
    if (tag.toLowerCase().includes(query)) {
      return true;
    }
  }

  for (const alias of aliases) {
    if (alias.toLowerCase().includes(query)) {
      return true;
    }
  }

  return false;
};

export type SearchIconsInput = {
  query?: string;
  offset?: number;
  limit?: number;
};

const DEFAULT_SEARCH_LIMIT = 60;
const MAX_SEARCH_LIMIT = 200;

export const searchIcons = ({
  query: rawQuery,
  offset = 0,
  limit = DEFAULT_SEARCH_LIMIT,
}: SearchIconsInput): IconSearchResponse => {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const safeLimit = Math.max(
    1,
    Math.min(MAX_SEARCH_LIMIT, Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_SEARCH_LIMIT),
  );

  const query = (rawQuery ?? '').trim().toLowerCase();

  iconsLog.debug({ query, offset: safeOffset, limit: safeLimit }, 'icon search');

  const matchedIcons = query ? ALL_ICONS.filter(icon => iconMatchesQuery(icon, query)) : ALL_ICONS;

  const iconsSlice = matchedIcons.slice(safeOffset, safeOffset + safeLimit);

  const items: IconSearchResult[] = iconsSlice.map(({ name, tags }) => ({
    name,
    path: mdiRegistry[name] ?? '',
    tags,
  }));

  return { items, total: matchedIcons.length };
};

export const getAllIconNames = (): string[] => ALL_ICONS.map(({ name }) => name);
