const express = require('express');
const {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  getFavoriteStatus
} = require('../controllers/favoriteController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 以下接口都需要登录
router.use(authMiddleware);

// 获取我的收藏列表
router.get('/', getMyFavorites);

// 查询某首歌是否已收藏
router.get('/:songId/status', getFavoriteStatus);

// 收藏歌曲
router.post('/:songId', addFavorite);

// 取消收藏
router.delete('/:songId', removeFavorite);

module.exports = router;
