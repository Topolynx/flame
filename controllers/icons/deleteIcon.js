const fs = require('fs/promises');
const ErrorResponse = require('../../utils/ErrorResponse');
const asyncWrapper = require('../../middleware/asyncWrapper');
const { getIconPath, getSafeIconName } = require('./iconPaths');

const deleteIcon = asyncWrapper(async (req, res, next) => {
  const iconName = getSafeIconName(req.params.name);

  if (!iconName) {
    return next(new ErrorResponse('Invalid icon filename', 400));
  }

  const iconPath = getIconPath(iconName);

  if (!iconPath) {
    return next(new ErrorResponse('Invalid icon filename', 400));
  }

  try {
    await fs.unlink(iconPath);
  } catch {
    return next(new ErrorResponse('Icon not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

module.exports = deleteIcon;
