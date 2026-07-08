const express = require('express');
const multer = require('multer');
const router = express.Router();

const { auth, requireAuth } = require('../middleware');
const { deleteIcon, getIcons, renameIcon, uploadIcon } = require('../controllers/icons');

const supportedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    cb(null, supportedTypes.has(file.mimetype));
  },
});

router
  .route('/')
  .get(auth, requireAuth, getIcons)
  .post(auth, requireAuth, upload.single('icon'), uploadIcon);

router
  .route('/:name')
  .put(auth, requireAuth, renameIcon)
  .delete(auth, requireAuth, deleteIcon);

module.exports = router;
