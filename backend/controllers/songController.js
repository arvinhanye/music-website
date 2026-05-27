const Song = require('../models/Song');
const Favorite = require('../models/Favorite');
const mongoose = require('mongoose');

const toUploadPath = (folder, filename) => `/uploads/${folder}/${filename}`;

const isValidSongId = (id) => mongoose.Types.ObjectId.isValid(id);

// 上传歌曲
const uploadSong = async (req, res) => {
  try {
    const { title, singer, album, category, duration } = req.body;
    const musicFile = req.files && req.files.music ? req.files.music[0] : null;
    const coverFile = req.files && req.files.cover ? req.files.cover[0] : null;

    if (!title || !singer) {
      return res.status(400).json({
        message: '歌曲名称和歌手不能为空'
      });
    }

    if (!musicFile) {
      return res.status(400).json({
        message: '请上传音乐文件'
      });
    }

    const song = await Song.create({
      title,
      singer,
      album: album || '未知专辑',
      category: category || '其他',
      duration: Number(duration) || 0,
      musicUrl: toUploadPath('music', musicFile.filename),
      coverUrl: coverFile ? toUploadPath('covers', coverFile.filename) : '',
      uploaderId: req.user._id
    });

    res.status(201).json({
      message: '上传歌曲成功',
      song
    });
  } catch (error) {
    console.error('上传歌曲失败:', error);
    res.status(500).json({
      message: '服务器错误，上传歌曲失败'
    });
  }
};

// 获取歌曲列表
const getSongList = async (req, res) => {
  try {
    const { keyword, category } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { singer: { $regex: keyword, $options: 'i' } },
        { album: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const songs = await Song.find(query)
      .populate('uploaderId', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({
      message: '获取歌曲列表成功',
      songs
    });
  } catch (error) {
    console.error('获取歌曲列表失败:', error);
    res.status(500).json({
      message: '服务器错误，获取歌曲列表失败'
    });
  }
};

// 获取歌曲详情
const getSongDetail = async (req, res) => {
  try {
    if (!isValidSongId(req.params.id)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const song = await Song.findById(req.params.id).populate('uploaderId', 'username avatar');

    if (!song) {
      return res.status(404).json({
        message: '歌曲不存在'
      });
    }

    res.json({
      message: '获取歌曲详情成功',
      song
    });
  } catch (error) {
    console.error('获取歌曲详情失败:', error);
    res.status(500).json({
      message: '服务器错误，获取歌曲详情失败'
    });
  }
};

// 播放次数加一
const increasePlayCount = async (req, res) => {
  try {
    if (!isValidSongId(req.params.id)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!song) {
      return res.status(404).json({
        message: '歌曲不存在'
      });
    }

    res.json({
      message: '播放次数更新成功',
      playCount: song.playCount
    });
  } catch (error) {
    console.error('更新播放次数失败:', error);
    res.status(500).json({
      message: '服务器错误，更新播放次数失败'
    });
  }
};

// 删除歌曲
const deleteSong = async (req, res) => {
  try {
    if (!isValidSongId(req.params.id)) {
      return res.status(400).json({
        message: '歌曲 ID 格式不正确'
      });
    }

    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        message: '歌曲不存在'
      });
    }

    const isUploader = song.uploaderId && song.uploaderId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isUploader && !isAdmin) {
      return res.status(403).json({
        message: '没有权限删除这首歌曲'
      });
    }

    await Song.findByIdAndDelete(req.params.id);
    await Favorite.deleteMany({ songId: req.params.id });

    res.json({
      message: '删除歌曲成功'
    });
  } catch (error) {
    console.error('删除歌曲失败:', error);
    res.status(500).json({
      message: '服务器错误，删除歌曲失败'
    });
  }
};

module.exports = {
  uploadSong,
  getSongList,
  getSongDetail,
  increasePlayCount,
  deleteSong
};
