import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { UPLOADS_DIR } from '@/db/paths';
import { type ByteSanitizer, sanitizeSvgBytes } from './uploadSanitizers';

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const uploadFileTypes = [
  { mimeType: 'image/png', extensions: ['png'] },
  { mimeType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  { mimeType: 'image/webp', extensions: ['webp'] },
  { mimeType: 'image/svg+xml', extensions: ['svg'], sanitize: sanitizeSvgBytes },
  { mimeType: 'image/x-icon', extensions: ['ico'] },
] as const satisfies readonly {
  mimeType: string;
  extensions: readonly string[];
  sanitize?: ByteSanitizer;
}[];

export type AllowedMimeType = (typeof uploadFileTypes)[number]['mimeType'];

export const allowedMimeTypes = uploadFileTypes.map(
  ({ mimeType }) => mimeType,
) as readonly AllowedMimeType[];

const extensionByMime = new Map<AllowedMimeType, string>(
  uploadFileTypes.map(({ mimeType, extensions }) => [mimeType, extensions[0]]),
);

const mimeByExtension = new Map<string, AllowedMimeType>(
  uploadFileTypes.flatMap(({ mimeType, extensions }) =>
    extensions.map(extension => [extension, mimeType]),
  ),
);

export const acceptedUploadExtensions = Array.from(
  mimeByExtension.keys(),
  extension => `.${extension}`,
).join(',');

export const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType =>
  extensionByMime.has(mimeType as AllowedMimeType);

export const getMimeTypeForFilename = (filename: string): AllowedMimeType | null => {
  const extension = path.extname(filename).slice(1).toLowerCase();

  return mimeByExtension.get(extension) ?? null;
};

export const getMaxUploadBytes = (): number => {
  const raw = process.env.MAX_UPLOAD_BYTES;

  if (raw === undefined) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES;
};

export type UploadValidationFailure = {
  success: false;
  reason: 'empty' | 'invalid-mime' | 'too-large';
  message: string;
};

export type UploadValidationSuccess = {
  success: true;
  mimeType: AllowedMimeType;
  extension: string;
};

export type UploadValidationResult = UploadValidationFailure | UploadValidationSuccess;

export const validateUpload = ({
  mimeType,
  byteSize,
}: {
  mimeType: string;
  byteSize: number;
}): UploadValidationResult => {
  if (byteSize <= 0) {
    return { success: false, reason: 'empty', message: 'File is empty' };
  }

  if (!isAllowedMimeType(mimeType)) {
    return {
      success: false,
      reason: 'invalid-mime',
      message: `Unsupported file type: ${mimeType}`,
    };
  }

  const maxBytes = getMaxUploadBytes();

  if (byteSize > maxBytes) {
    return {
      success: false,
      reason: 'too-large',
      message: `File exceeds the ${maxBytes} byte limit`,
    };
  }

  return { success: true, mimeType, extension: extensionByMime.get(mimeType)! };
};

const sanitizerByMime = new Map<AllowedMimeType, ByteSanitizer>(
  uploadFileTypes.flatMap(spec => ('sanitize' in spec ? [[spec.mimeType, spec.sanitize]] : [])),
);

export const sanitizeUploadBytes = (bytes: Buffer, mimeType: AllowedMimeType): Buffer => {
  const sanitize = sanitizerByMime.get(mimeType);

  return sanitize ? sanitize(bytes) : bytes;
};

export const generateUploadFilename = (extension: string): string =>
  `${crypto.randomUUID()}.${extension}`;

export const isSafeUploadFilename = (filename: string): boolean =>
  /^[a-z0-9-]+\.[a-z0-9]+$/i.test(filename);

export const UPLOADS_URL_PREFIX = '/uploads/';

export const getUploadPublicPath = (filename: string): string => `${UPLOADS_URL_PREFIX}${filename}`;

export const ensureUploadsDir = (directory: string = UPLOADS_DIR): void => {
  fs.mkdirSync(directory, { recursive: true });
};

export const writeUploadFile = async ({
  filename,
  bytes,
  directory = UPLOADS_DIR,
}: {
  filename: string;
  bytes: Buffer;
  directory?: string;
}): Promise<string> => {
  ensureUploadsDir(directory);

  const absolutePath = path.join(directory, filename);

  await fs.promises.writeFile(absolutePath, bytes);

  return absolutePath;
};

export const findOrphanUploads = ({
  directory,
  filenamesInUse,
}: {
  directory: string;
  filenamesInUse: Set<string>;
}): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => !filenamesInUse.has(name));
};

export const deleteOrphanUploads = ({
  directory,
  filenamesInUse,
}: {
  directory: string;
  filenamesInUse: Set<string>;
}): { deleted: string[] } => {
  const orphans = findOrphanUploads({ directory, filenamesInUse });

  for (const name of orphans) {
    fs.unlinkSync(path.join(directory, name));
  }

  return { deleted: orphans };
};

export const getUploadFilename = (iconField: string | null | undefined): string | null => {
  if (!iconField) {
    return null;
  }

  if (!iconField.startsWith(UPLOADS_URL_PREFIX)) {
    return null;
  }

  const filename = iconField.slice(UPLOADS_URL_PREFIX.length);

  if (!isSafeUploadFilename(filename)) {
    return null;
  }

  return filename;
};

export const getFilenamesInUse = (iconFields: Iterable<string | null | undefined>): Set<string> =>
  Array.from(iconFields).reduce((filenames, iconField) => {
    const filename = getUploadFilename(iconField);

    return filename === null ? filenames : filenames.add(filename);
  }, new Set<string>());
