const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'uploads');
const musicDir = path.join(uploadRoot, 'music');
const coverDir = path.join(uploadRoot, 'covers');

[uploadRoot, musicDir, coverDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      cb(null, coverDir);
      return;
    }

    cb(null, musicDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'music' && file.mimetype.startsWith('audio/')) {
    cb(null, true);
    return;
  }

  if (file.fieldname === 'cover' && file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('文件类型不正确'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024
  }
}).fields([
  { name: 'music', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

const uploadSongFiles = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: '文件不能超过 30MB'
      });
    }

    res.status(400).json({
      message: error.message || '文件上传失败'
    });
  });
};

module.exports = uploadSongFiles;
