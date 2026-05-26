const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    singer: {
      type: String,
      required: true,
      trim: true
    },

    album: {
      type: String,
      default: '未知专辑'
    },

    category: {
      type: String,
      default: '其他'
    },

    duration: {
      type: Number,
      default: 0
    },

    musicUrl: {
      type: String,
      required: true
    },

    coverUrl: {
      type: String,
      default: ''
    },

    lyricUrl: {
      type: String,
      default: ''
    },

    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    playCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Song', songSchema);