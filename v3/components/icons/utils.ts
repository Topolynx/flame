import type { IconListItem, IconListResponse } from './types';

const PAGE_SIZE = 500;

export const fetchAllIcons = async (): Promise<IconListItem[]> => {
  const icons: IconListItem[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });

    const response = await fetch(`/api/icons/list?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`icons request failed: ${response.status}`);
    }

    const { items, total } = (await response.json()) as IconListResponse;

    icons.push(...items);

    if (icons.length >= total || items.length === 0) {
      break;
    }

    offset += items.length;
  }

  return icons;
};

export const filterIcons = (icons: IconListItem[], query: string): IconListItem[] => {
  if (query.length === 0) {
    return icons;
  }

  return icons.filter(({ name, tags }) => {
    if (name.toLowerCase().includes(query)) {
      return true;
    }

    for (const tag of tags) {
      if (tag.toLowerCase().includes(query)) {
        return true;
      }
    }

    return false;
  });
};
