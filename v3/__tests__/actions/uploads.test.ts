import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupEnvSandbox } from '../helpers/envSandbox';

const tempUploadsDir = await vi.hoisted(async () => {
  const nodePath = await import('node:path');
  const nodeOs = await import('node:os');
  const nodeFs = await import('node:fs');

  const root = nodePath.join(nodeOs.tmpdir(), `flame-uploads-route-${process.pid}-${Date.now()}`);

  nodeFs.mkdirSync(root, { recursive: true });

  return { UPLOADS_DIR: root };
});

vi.mock('@/db/paths', async () => {
  const actual = await vi.importActual<typeof import('@/db/paths')>('@/db/paths');

  return { ...actual, UPLOADS_DIR: tempUploadsDir.UPLOADS_DIR };
});

const isAuthenticatedMock = vi.fn(async () => true);

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');

  return { ...actual, isAuthenticated: isAuthenticatedMock };
});

const { POST: uploadsPOST } = await import('@/app/api/uploads/route');
const { GET: uploadsGET } = await import('@/app/uploads/[file]/route');

const { setEnv } = setupEnvSandbox(['MAX_UPLOAD_BYTES'] as const);

const clearUploadsDir = (): void => {
  for (const entry of fs.readdirSync(tempUploadsDir.UPLOADS_DIR)) {
    fs.rmSync(path.join(tempUploadsDir.UPLOADS_DIR, entry), { recursive: true, force: true });
  }
};

beforeEach(() => {
  isAuthenticatedMock.mockResolvedValue(true);
  setEnv('MAX_UPLOAD_BYTES', undefined);
  clearUploadsDir();
});

afterEach(() => {
  clearUploadsDir();
});

const buildUploadRequest = (file: File): Request => {
  const body = new FormData();

  body.append('file', file);

  return new Request('http://test.local/api/uploads', { method: 'POST', body });
};

describe('POST /api/uploads', () => {
  it('returns 401 when the user is not authenticated', async () => {
    isAuthenticatedMock.mockResolvedValueOnce(false);

    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    const response = await uploadsPOST(buildUploadRequest(file));

    expect(response.status).toBe(401);
  });

  it('stores an allowed image and returns its public path', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([bytes], 'icon.png', { type: 'image/png' });

    const response = await uploadsPOST(buildUploadRequest(file));
    const payload = (await response.json()) as { success: boolean; path: string };

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.path).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);

    const storedFilePath = path.join(tempUploadsDir.UPLOADS_DIR, path.basename(payload.path));

    expect(fs.existsSync(storedFilePath)).toBe(true);
    expect(fs.readFileSync(storedFilePath)).toEqual(Buffer.from(bytes));
  });

  it('sanitizes SVG content before writing to disk', async () => {
    const dirty = '<svg><script>alert(1)</script><rect /></svg>';
    const file = new File([dirty], 'icon.svg', { type: 'image/svg+xml' });

    const response = await uploadsPOST(buildUploadRequest(file));
    const payload = (await response.json()) as { path: string };

    const storedFilePath = path.join(tempUploadsDir.UPLOADS_DIR, path.basename(payload.path));
    const storedFile = fs.readFileSync(storedFilePath, 'utf8');

    expect(storedFile).not.toContain('<script');
    expect(storedFile).not.toContain('alert');
  });

  it('rejects a disallowed MIME type with 400', async () => {
    const file = new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' });

    const response = await uploadsPOST(buildUploadRequest(file));

    expect(response.status).toBe(400);

    const payload = (await response.json()) as { success: boolean };

    expect(payload.success).toBe(false);
  });

  it('rejects a file larger than MAX_UPLOAD_BYTES with 400', async () => {
    setEnv('MAX_UPLOAD_BYTES', '4');

    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], 'big.png', { type: 'image/png' });
    const response = await uploadsPOST(buildUploadRequest(file));

    expect(response.status).toBe(400);
  });

  it('returns 400 when no file is provided in the form', async () => {
    const body = new FormData();
    const request = new Request('http://test.local/api/uploads', { method: 'POST', body });
    const response = await uploadsPOST(request);

    expect(response.status).toBe(400);
  });
});

describe('GET /uploads/[file]', () => {
  it('serves a stored file with the correct content type', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([bytes], 'icon.png', { type: 'image/png' });

    const uploadResponse = await uploadsPOST(buildUploadRequest(file));
    const { path: publicPath } = (await uploadResponse.json()) as { path: string };
    const filename = path.basename(publicPath);

    const response = await uploadsGET(new Request(`http://test.local${publicPath}`), {
      params: Promise.resolve({ file: filename }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('returns 404 when the file does not exist', async () => {
    const response = await uploadsGET(new Request('http://test.local/uploads/missing.png'), {
      params: Promise.resolve({ file: 'missing.png' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 for a path-traversal filename', async () => {
    const response = await uploadsGET(new Request('http://test.local/uploads/'), {
      params: Promise.resolve({ file: '../etc/passwd' }),
    });

    expect(response.status).toBe(400);
  });
});

afterEach(() => {
  void os.tmpdir;
});
