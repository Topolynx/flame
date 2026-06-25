import fs from 'node:fs';
import path from 'node:path';

import { UPLOADS_DIR } from '@/db/paths';
import { getMimeTypeForFilename, isSafeUploadFilename } from '@/lib/uploads';

export const GET = async (
  _request: Request,
  context: { params: Promise<{ file: string }> },
): Promise<Response> => {
  const { file } = await context.params;

  if (!isSafeUploadFilename(file)) {
    return new Response(null, { status: 400 });
  }

  const absolutePath = path.join(UPLOADS_DIR, file);

  if (!absolutePath.startsWith(UPLOADS_DIR + path.sep)) {
    return new Response(null, { status: 400 });
  }

  if (!fs.existsSync(absolutePath)) {
    return new Response(null, { status: 404 });
  }

  const bytes = await fs.promises.readFile(absolutePath);
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': getMimeTypeForFilename(file) ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
