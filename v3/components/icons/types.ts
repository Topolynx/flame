export type IconListItem = {
  name: string;
  path: string;
  tags: string[];
};

export type IconListResponse = {
  items: IconListItem[];
  total: number;
};
