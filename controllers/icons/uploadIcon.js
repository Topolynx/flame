const fs = require('fs/promises');
const ErrorResponse = require('../../utils/ErrorResponse');
const asyncWrapper = require('../../middleware/asyncWrapper');
const { getIconPath, getSafeIconName, uploadDir } = require('./iconPaths');

const looksLikeSvg = (buffer) => {
  const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).trimStart();
  return sample.startsWith('<svg') || sample.startsWith('<?xml');
};

const fileLooksValid = (name, buffer) => {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();

  if (extension === '.svg') {
    return looksLikeSvg(buffer);
  }

  if (extension === '.png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (extension === '.webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  if (extension === '.ico') {
    return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
  }

  return false;
};

const uploadIcon = asyncWrapper(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Icon file is required', 400));
  }

  const iconName = getSafeIconName(req.file.originalname);

  if (!iconName) {
    return next(new ErrorResponse('Invalid icon filename', 400));
  }

  if (!fileLooksValid(iconName, req.file.buffer)) {
    return next(new ErrorResponse('Invalid icon file', 400));
  }

  await fs.mkdir(uploadDir, { recursive: true });

  const iconPath = getIconPath(iconName);

  try {
    await fs.access(iconPath);
    return next(new ErrorResponse('Icon already exists', 409));
  } catch {}

  await fs.writeFile(iconPath, req.file.buffer);

  res.status(201).json({
    success: true,
    data: {
      name: iconName,
      url: `/uploads/${iconName}`,
      size: req.file.size,
    },
  });
});

module.exports = uploadIcon;
