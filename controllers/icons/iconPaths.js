const path = require('path');

const uploadDir = path.resolve(process.cwd(), 'data/uploads');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.svg', '.webp', '.ico']);

const getSafeIconName = (name) => {
  const safeName = path.basename(name || '').trim();

  if (
    !safeName ||
    safeName === '.' ||
    safeName === '..' ||
    safeName.length > 160 ||
    safeName.includes('/') ||
    safeName.includes('\\') ||
    /[\0\r\n]/.test(safeName)
  ) {
    return null;
  }

  if (safeName !== name) {
    return null;
  }

  const extension = path.extname(safeName).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return null;
  }

  return safeName;
};

const getIconPath = (name) => {
  const iconPath = path.resolve(uploadDir, name);

  if (!iconPath.startsWith(`${uploadDir}${path.sep}`)) {
    return null;
  }

  return iconPath;
};

module.exports = {
  allowedExtensions,
  getIconPath,
  getSafeIconName,
  uploadDir,
};
