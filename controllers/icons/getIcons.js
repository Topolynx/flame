const fs = require('fs/promises');
const asyncWrapper = require('../../middleware/asyncWrapper');
const { allowedExtensions, uploadDir } = require('./iconPaths');

const getIcons = asyncWrapper(async (req, res, next) => {
  await fs.mkdir(uploadDir, { recursive: true });

  const entries = await fs.readdir(uploadDir, { withFileTypes: true });
  const icons = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => {
        const extension = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
        return allowedExtensions.has(extension);
      })
      .map(async (entry) => {
        const stats = await fs.stat(`${uploadDir}/${entry.name}`);

        return {
          name: entry.name,
          url: `/uploads/${entry.name}`,
          size: stats.size,
          modifiedAt: stats.mtime,
        };
      })
  );

  icons.sort((a, b) => a.name.localeCompare(b.name));

  res.status(200).json({
    success: true,
    data: icons,
  });
});

module.exports = getIcons;
