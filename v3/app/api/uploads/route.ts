import { NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/auth';
import { uploadLog } from '@/lib/logger';
import {
  generateUploadFilename,
  getUploadPublicPath,
  sanitizeUploadBytes,
  validateUpload,
  writeUploadFile,
} from '@/lib/uploads';

const json = (body: unknown, status: number): Response => NextResponse.json(body, { status });

export const POST = async (request: Request): Promise<Response> => {
  if (!(await isAuthenticated())) {
    return json({ success: false, message: 'Not authenticated' }, 401);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, message: 'Invalid form data' }, 400);
  }

  const fileEntry = formData.get('file');

  if (!(fileEntry instanceof File)) {
    return json({ success: false, message: 'No file provided' }, 400);
  }

  const validationResult = validateUpload({
    mimeType: fileEntry.type,
    byteSize: fileEntry.size,
  });

  if (!validationResult.success) {
    const { message, reason } = validationResult;

    uploadLog.warn(
      { mimeType: fileEntry.type, byteSize: fileEntry.size, reason },
      'upload rejected',
    );

    return json({ success: false, message }, 400);
  }

  const { mimeType, extension } = validationResult;

  const arrayBuffer = await fileEntry.arrayBuffer();
  const bytes = sanitizeUploadBytes(Buffer.from(arrayBuffer), mimeType);

  const filename = generateUploadFilename(extension);

  await writeUploadFile({ filename, bytes });

  const publicPath = getUploadPublicPath(filename);

  uploadLog.info({ filename, byteSize: bytes.byteLength, mimeType }, 'upload stored');

  return json({ success: true, message: 'Upload saved', path: publicPath }, 201);
};
