const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// 防止同一个用户重复收藏同一首歌
favoriteSchema.index({ userId: 1, songId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);