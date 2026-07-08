const fs = require('fs');
const multer = require('multer');
const ErrorResponse = require('../utils/ErrorResponse');
const { getIconPath, getSafeIconName } = require('../controllers/icons/iconPaths');

if (!fs.existsSync('data/uploads')) {
  fs.mkdirSync('data/uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './data/uploads');
  },
  filename: (req, file, cb) => {
    const iconName = getSafeIconName(file.originalname);

    if (!iconName) {
      return cb(new ErrorResponse('Invalid icon filename', 400));
    }

    if (fs.existsSync(getIconPath(iconName))) {
      return cb(new ErrorResponse('Icon already exists', 409));
    }

    cb(null, iconName);
  },
});

const supportedTypes = [
  'jpg',
  'jpeg',
  'png',
  'svg',
  'svg+xml',
  'webp',
  'x-icon',
  'vnd.microsoft.icon',
];

const fileFilter = (req, file, cb) => {
  if (supportedTypes.includes(file.mimetype.split('/')[1])) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload.single('icon');
