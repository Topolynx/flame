export type ByteSanitizer = (bytes: Buffer) => Buffer;

const scriptBlockPattern = /<script\b[\s\S]*?<\/script>/gi;
const scriptVoidPattern = /<script\b[^>]*\/?>/gi;
const foreignObjectBlockPattern = /<foreignObject\b[\s\S]*?<\/foreignObject>/gi;
const foreignObjectVoidPattern = /<foreignObject\b[^>]*\/?>/gi;
const eventHandlerDqPattern = /\s+on[a-z]+\s*=\s*"[^"]*"/gi;
const eventHandlerSqPattern = /\s+on[a-z]+\s*=\s*'[^']*'/gi;
const eventHandlerBarePattern = /\s+on[a-z]+\s*=\s*[^\s>]+/gi;
const javascriptUrlDqPattern = /(href|xlink:href|src)\s*=\s*"\s*javascript:[^"]*"/gi;
const javascriptUrlSqPattern = /(href|xlink:href|src)\s*=\s*'\s*javascript:[^']*'/gi;

export const sanitizeSvg = (input: string): string => {
  let sanitized = input;

  sanitized = sanitized.replace(scriptBlockPattern, '');
  sanitized = sanitized.replace(scriptVoidPattern, '');
  sanitized = sanitized.replace(foreignObjectBlockPattern, '');
  sanitized = sanitized.replace(foreignObjectVoidPattern, '');
  sanitized = sanitized.replace(eventHandlerDqPattern, '');
  sanitized = sanitized.replace(eventHandlerSqPattern, '');
  sanitized = sanitized.replace(eventHandlerBarePattern, '');
  sanitized = sanitized.replace(javascriptUrlDqPattern, '$1=""');
  sanitized = sanitized.replace(javascriptUrlSqPattern, "$1=''");

  return sanitized;
};

export const sanitizeSvgBytes: ByteSanitizer = bytes =>
  Buffer.from(sanitizeSvg(bytes.toString('utf8')), 'utf8');
