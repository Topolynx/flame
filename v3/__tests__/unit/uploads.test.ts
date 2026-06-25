import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  allowedMimeTypes,
  getFilenamesInUse,
  deleteOrphanUploads,
  getUploadFilename,
  findOrphanUploads,
  generateUploadFilename,
  getMaxUploadBytes,
  getUploadPublicPath,
  isAllowedMimeType,
  isSafeUploadFilename,
  validateUpload,
  writeUploadFile,
} from '@/lib/uploads';
import { setupEnvSandbox } from '../helpers/envSandbox';

const { setEnv } = setupEnvSandbox(['MAX_UPLOAD_BYTES'] as const);

describe('isAllowedMimeType', () => {
  for (const mimeType of allowedMimeTypes) {
    it(`accepts ${mimeType}`, () => {
      expect(isAllowedMimeType(mimeType)).toBe(true);
    });
  }

  it('rejects a disallowed type', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isAllowedMimeType('')).toBe(false);
  });
});

describe('getMaxUploadBytes', () => {
  it('defaults to 5 MB when no env var is set', () => {
    setEnv('MAX_UPLOAD_BYTES', undefined);

    expect(getMaxUploadBytes()).toBe(5 * 1024 * 1024);
  });

  it('reads a positive integer from MAX_UPLOAD_BYTES', () => {
    setEnv('MAX_UPLOAD_BYTES', '1024');

    expect(getMaxUploadBytes()).toBe(1024);
  });

  it('falls back to the default when the value is not a positive number', () => {
    setEnv('MAX_UPLOAD_BYTES', 'not-a-number');

    expect(getMaxUploadBytes()).toBe(5 * 1024 * 1024);

    setEnv('MAX_UPLOAD_BYTES', '0');

    expect(getMaxUploadBytes()).toBe(5 * 1024 * 1024);

    setEnv('MAX_UPLOAD_BYTES', '-10');

    expect(getMaxUploadBytes()).toBe(5 * 1024 * 1024);
  });
});

describe('validateUpload', () => {
  beforeEach(() => {
    setEnv('MAX_UPLOAD_BYTES', undefined);
  });

  it('accepts an allowed image with a positive size within the limit', () => {
    const result = validateUpload({ mimeType: 'image/png', byteSize: 1024 });

    expect(result).toEqual({ success: true, mimeType: 'image/png', extension: 'png' });
  });

  it('maps the svg+xml MIME type to a .svg extension', () => {
    const result = validateUpload({ mimeType: 'image/svg+xml', byteSize: 100 });

    expect(result.success && result.extension).toBe('svg');
  });

  it('rejects an empty file', () => {
    const result = validateUpload({ mimeType: 'image/png', byteSize: 0 });

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe('empty');
  });

  it('rejects a disallowed MIME type', () => {
    const result = validateUpload({ mimeType: 'application/pdf', byteSize: 100 });

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe('invalid-mime');
  });

  it('rejects a file that exceeds MAX_UPLOAD_BYTES', () => {
    setEnv('MAX_UPLOAD_BYTES', '500');

    const result = validateUpload({ mimeType: 'image/png', byteSize: 501 });

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe('too-large');
  });
});

describe('generateUploadFilename', () => {
  it('produces a uuid-shaped name with the requested extension', () => {
    const filename = generateUploadFilename('png');

    expect(filename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);
  });

  it('generates unique names across calls', () => {
    const first = generateUploadFilename('png');
    const second = generateUploadFilename('png');

    expect(first).not.toBe(second);
  });
});

describe('isSafeUploadFilename', () => {
  it('accepts a plain uuid-shaped filename', () => {
    expect(isSafeUploadFilename('abc123-def456.png')).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(isSafeUploadFilename('../etc/passwd')).toBe(false);
    expect(isSafeUploadFilename('foo/bar.png')).toBe(false);
    expect(isSafeUploadFilename('..\\windows.png')).toBe(false);
  });

  it('rejects names without an extension', () => {
    expect(isSafeUploadFilename('abc123')).toBe(false);
  });

  it('rejects names with weird characters', () => {
    expect(isSafeUploadFilename('a b.png')).toBe(false);
    expect(isSafeUploadFilename('a;.png')).toBe(false);
  });
});

describe('getUploadFilename', () => {
  it('returns the filename for a /uploads/ path', () => {
    expect(getUploadFilename('/uploads/abc-123.png')).toBe('abc-123.png');
  });

  it('returns null when the icon field is an MDI name', () => {
    expect(getUploadFilename('mdiServer')).toBe(null);
  });

  it('returns null when the icon field is an external URL', () => {
    expect(getUploadFilename('https://example.com/foo.png')).toBe(null);
  });

  it('returns null when the path tries to traverse', () => {
    expect(getUploadFilename('/uploads/../db.sqlite')).toBe(null);
  });

  it('returns null when the icon field is empty or nullish', () => {
    expect(getUploadFilename('')).toBe(null);
    expect(getUploadFilename(null)).toBe(null);
    expect(getUploadFilename(undefined)).toBe(null);
  });
});

describe('getFilenamesInUse', () => {
  it('extracts uploaded filenames from a mix of icon fields', () => {
    const filenames = getFilenamesInUse([
      '/uploads/one.png',
      'mdiCog',
      '/uploads/two.svg',
      'https://example.com/foo.png',
      null,
      undefined,
    ]);

    expect(filenames).toEqual(new Set(['one.png', 'two.svg']));
  });
});

describe('getUploadPublicPath', () => {
  it('returns the public /uploads/ path for a filename', () => {
    expect(getUploadPublicPath('abc.png')).toBe('/uploads/abc.png');
  });
});

const makeTempUploadDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flame-uploads-test-'));

  return dir;
};

describe('writeUploadFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempUploadDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes bytes to the directory and returns the absolute path', async () => {
    const bytes = Buffer.from('hello');
    const filename = 'sample.png';

    const writtenFile = await writeUploadFile({ filename, bytes, directory: tempDir });

    expect(writtenFile).toBe(path.join(tempDir, filename));
    expect(fs.readFileSync(writtenFile, 'utf8')).toBe('hello');
  });

  it('creates the directory if it does not yet exist', async () => {
    const nested = path.join(tempDir, 'nested');
    const bytes = Buffer.from('x');

    await writeUploadFile({ filename: 'a.png', bytes, directory: nested });

    expect(fs.existsSync(nested)).toBe(true);
  });
});

describe('findOrphanUploads', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempUploadDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns files in the directory that are not in the referenced set', () => {
    fs.writeFileSync(path.join(tempDir, 'keep.png'), '');
    fs.writeFileSync(path.join(tempDir, 'orphan-1.png'), '');
    fs.writeFileSync(path.join(tempDir, 'orphan-2.svg'), '');

    const orphans = findOrphanUploads({
      directory: tempDir,
      filenamesInUse: new Set(['keep.png']),
    });

    expect(orphans.sort()).toEqual(['orphan-1.png', 'orphan-2.svg']);
  });

  it('returns an empty list when the directory does not exist', () => {
    const orphans = findOrphanUploads({
      directory: path.join(tempDir, 'missing'),
      filenamesInUse: new Set(),
    });

    expect(orphans).toEqual([]);
  });

  it('ignores subdirectories', () => {
    fs.mkdirSync(path.join(tempDir, 'subdir'));
    fs.writeFileSync(path.join(tempDir, 'lone.png'), '');

    const orphans = findOrphanUploads({
      directory: tempDir,
      filenamesInUse: new Set(),
    });

    expect(orphans).toEqual(['lone.png']);
  });
});

describe('deleteOrphanUploads', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempUploadDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes only files outside the referenced set and returns their names', () => {
    fs.writeFileSync(path.join(tempDir, 'keep.png'), '');
    fs.writeFileSync(path.join(tempDir, 'gone.svg'), '');

    const result = deleteOrphanUploads({
      directory: tempDir,
      filenamesInUse: new Set(['keep.png']),
    });

    expect(result.deleted).toEqual(['gone.svg']);
    expect(fs.existsSync(path.join(tempDir, 'keep.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'gone.svg'))).toBe(false);
  });
});
