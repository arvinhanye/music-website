const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Song = require('../models/Song');

const isValidSongId = (id) => mongoose.Types.ObjectId.isValid(id);

// 收藏歌曲
const addFavorite = async (req, res) => {
  try {
    const { songId } = req.params;

    if (!isValidSongId(songId)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const song = await Song.findById(songId);

    if (!song) {
      return res.status(404).json({
        message: '歌曲不存在'
      });
    }

    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      songId
    });

    if (existingFavorite) {
      return res.json({
        message: '已经收藏过这首歌曲',
        favorite: existingFavorite
      });
    }

    const favorite = await Favorite.create({
      userId: req.user._id,
      songId
    });

    res.status(201).json({
      message: '收藏歌曲成功',
      favorite
    });
  } catch (error) {
    console.error('收藏歌曲失败:', error);
    res.status(500).json({
      message: '服务器错误，收藏歌曲失败'
    });
  }
};

// 取消收藏
const removeFavorite = async (req, res) => {
  try {
    const { songId } = req.params;

    if (!isValidSongId(songId)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user._id,
      songId
    });

    if (!favorite) {
      return res.status(404).json({
        message: '还没有收藏这首歌曲'
      });
    }

    res.json({
      message: '取消收藏成功'
    });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({
      message: '服务器错误，取消收藏失败'
    });
  }
};

// 获取我的收藏列表
const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .populate({
        path: 'songId',
        populate: {
          path: 'uploaderId',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      message: '获取收藏列表成功',
      favorites
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({
      message: '服务器错误，获取收藏列表失败'
    });
  }
};

// 查询某首歌是否已收藏
const getFavoriteStatus = async (req, res) => {
  try {
    const { songId } = req.params;

    if (!isValidSongId(songId)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      songId
    });

    res.json({
      message: '获取收藏状态成功',
      isFavorite: Boolean(favorite)
    });
  } catch (error) {
    console.error('获取收藏状态失败:', error);
    res.status(500).json({
      message: '服务器错误，获取收藏状态失败'
    });
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  getFavoriteStatus
};
