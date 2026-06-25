import { NextResponse } from 'next/server';

import { searchIcons } from '@/lib/icons';

const parseNumberParam = (value: string | null, fallback: number): number => {
  if (value === null) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export const GET = (request: Request): Response => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const offset = parseNumberParam(url.searchParams.get('offset'), 0);
  const limit = parseNumberParam(url.searchParams.get('limit'), 60);

  const result = searchIcons({ query, offset, limit });

  return NextResponse.json(result);
};
