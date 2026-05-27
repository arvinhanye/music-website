const express = require('express');
const {
  uploadSong,
  getSongList,
  getSongDetail,
  increasePlayCount,
  deleteSong
} = require('../controllers/songController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadSongFiles = require('../middleware/uploadMiddleware');

const router = express.Router();

// 获取歌曲列表
router.get('/', getSongList);

// 获取歌曲详情
router.get('/:id', getSongDetail);

// 上传歌曲，需要登录
router.post('/', authMiddleware, uploadSongFiles, uploadSong);

// 播放次数加一
router.post('/:id/play', increasePlayCount);

// 删除歌曲，需要登录且只能删除自己上传的歌曲，管理员除外
router.delete('/:id', authMiddleware, deleteSong);

module.exports = router;
