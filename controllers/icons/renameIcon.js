const fs = require('fs/promises');
const ErrorResponse = require('../../utils/ErrorResponse');
const asyncWrapper = require('../../middleware/asyncWrapper');
const App = require('../../models/App');
const Bookmark = require('../../models/Bookmark');
const { getIconPath, getSafeIconName } = require('./iconPaths');

const renameIcon = asyncWrapper(async (req, res, next) => {
  const oldName = getSafeIconName(req.params.name);
  const newName = getSafeIconName(req.body.name);

  if (!oldName || !newName) {
    return next(new ErrorResponse('Invalid icon filename', 400));
  }

  if (oldName === newName) {
    return res.status(200).json({
      success: true,
      data: { name: newName, url: `/uploads/${newName}` },
    });
  }

  const oldPath = getIconPath(oldName);
  const newPath = getIconPath(newName);

  if (!oldPath || !newPath) {
    return next(new ErrorResponse('Invalid icon filename', 400));
  }

  try {
    await fs.access(oldPath);
  } catch {
    return next(new ErrorResponse('Icon not found', 404));
  }

  try {
    await fs.access(newPath);
    return next(new ErrorResponse('Icon already exists', 409));
  } catch {}

  await fs.rename(oldPath, newPath);

  await Promise.all([
    App.update({ icon: newName }, { where: { icon: oldName } }),
    Bookmark.update({ icon: newName }, { where: { icon: oldName } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      name: newName,
      url: `/uploads/${newName}`,
    },
  });
});

module.exports = renameIcon;
