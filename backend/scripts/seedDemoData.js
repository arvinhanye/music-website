const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Song = require('../models/Song');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uploadRoot = path.join(__dirname, '..', 'uploads');
const musicDir = path.join(uploadRoot, 'music');
const coverDir = path.join(uploadRoot, 'covers');

const demoSongs = [
  {
    title: 'Neon Morning',
    singer: 'Demo Studio',
    album: 'Dark Library',
    category: '电子',
    duration: 8,
    file: 'demo-neon-morning',
    colors: ['#fa2d48', '#6a4aff'],
    frequency: 261.63
  },
  {
    title: 'Moonlit Walk',
    singer: 'Campus Band',
    album: 'Quiet Notes',
    category: '民谣',
    duration: 8,
    file: 'demo-moonlit-walk',
    colors: ['#3b82f6', '#14b8a6'],
    frequency: 293.66
  },
  {
    title: 'Velvet Pulse',
    singer: 'Audio Lab',
    album: 'Synthetic Heart',
    category: '流行',
    duration: 8,
    file: 'demo-velvet-pulse',
    colors: ['#f97316', '#ec4899'],
    frequency: 329.63
  },
  {
    title: 'Silver Drive',
    singer: 'Road Session',
    album: 'After Class',
    category: '摇滚',
    duration: 8,
    file: 'demo-silver-drive',
    colors: ['#64748b', '#ef4444'],
    frequency: 349.23
  },
  {
    title: 'Late Checkout',
    singer: 'Night Window',
    album: 'Small Hours',
    category: '其他',
    duration: 8,
    file: 'demo-late-checkout',
    colors: ['#8b5cf6', '#22c55e'],
    frequency: 392
  },
  {
    title: 'City Bloom',
    singer: 'Demo Studio',
    album: 'Dark Library',
    category: '流行',
    duration: 8,
    file: 'demo-city-bloom',
    colors: ['#06b6d4', '#f43f5e'],
    frequency: 440
  }
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createWavBuffer = (durationSeconds, frequency) => {
  const sampleRate = 44100;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const samples = sampleRate * durationSeconds;
  const dataSize = samples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const fadeIn = Math.min(1, time / 0.2);
    const fadeOut = Math.min(1, (durationSeconds - time) / 0.35);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const tone = Math.sin(2 * Math.PI * frequency * time);
    const overtone = 0.35 * Math.sin(2 * Math.PI * frequency * 1.5 * time);
    const beat = 0.18 * Math.sin(2 * Math.PI * 2 * time);
    const sample = Math.max(-1, Math.min(1, (tone + overtone + beat) * 0.35 * envelope));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + index * 2);
  }

  return buffer;
};

const createCoverSvg = (song) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${song.colors[0]}"/>
      <stop offset="100%" stop-color="${song.colors[1]}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" rx="28" fill="url(#g)"/>
  <circle cx="502" cy="118" r="164" fill="rgba(255,255,255,0.18)"/>
  <circle cx="134" cy="504" r="210" fill="rgba(0,0,0,0.18)"/>
  <text x="54" y="394" fill="#fff" font-family="Arial, sans-serif" font-size="54" font-weight="700">${song.title}</text>
  <text x="58" y="450" fill="rgba(255,255,255,0.78)" font-family="Arial, sans-serif" font-size="28">${song.singer}</text>
  <path d="M450 250v112a52 52 0 1 1-26-45V200h100v50z" fill="rgba(255,255,255,0.88)"/>
</svg>`;

const seed = async () => {
  ensureDir(musicDir);
  ensureDir(coverDir);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_website';
  await mongoose.connect(mongoUri);

  let demoUser = await User.findOne({ username: 'demo' });

  if (!demoUser) {
    demoUser = await User.create({
      username: 'demo',
      password: await bcrypt.hash('123456', 10),
      role: 'user'
    });
  }

  for (const song of demoSongs) {
    const musicFile = `${song.file}.wav`;
    const coverFile = `${song.file}.svg`;
    const musicPath = path.join(musicDir, musicFile);
    const coverPath = path.join(coverDir, coverFile);

    if (!fs.existsSync(musicPath)) {
      fs.writeFileSync(musicPath, createWavBuffer(song.duration, song.frequency));
    }

    if (!fs.existsSync(coverPath)) {
      fs.writeFileSync(coverPath, createCoverSvg(song), 'utf8');
    }

    await Song.updateOne(
      { title: song.title, singer: song.singer },
      {
        $set: {
          title: song.title,
          singer: song.singer,
          album: song.album,
          category: song.category,
          duration: song.duration,
          musicUrl: `/uploads/music/${musicFile}`,
          coverUrl: `/uploads/covers/${coverFile}`,
          uploaderId: demoUser._id
        },
        $setOnInsert: {
          playCount: Math.floor(Math.random() * 80)
        }
      },
      { upsert: true }
    );
  }

  console.log('测试歌曲数据已生成');
  console.log('测试账号：demo / 123456');

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('生成测试数据失败:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
