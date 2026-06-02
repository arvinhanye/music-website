<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { api } from './api';

const tabs = [
  { key: 'songs', label: '资料库', icon: '⌘' },
  { key: 'upload', label: '上传歌曲', icon: '＋', auth: true },
  { key: 'uploads', label: '我的上传', icon: '↑', auth: true },
  { key: 'favorites', label: '我的收藏', icon: '♡', auth: true }
];

const categories = ['全部', '流行', '民谣', '摇滚', '电子', '其他'];

const activeTab = ref('songs');
const mode = ref('login');
const message = ref('');
const loading = ref(false);
const user = ref(JSON.parse(localStorage.getItem('music_user') || 'null'));
const token = ref(localStorage.getItem('music_token') || '');
const songs = ref([]);
const favorites = ref([]);
const favoriteMap = reactive({});
const playingSongId = ref('');
const selectedSong = ref(null);
const coverPreviewUrl = ref('');
const audioRef = ref(null);
const musicInputRef = ref(null);
const coverInputRef = ref(null);

const authForm = reactive({
  username: '',
  password: ''
});

const filters = reactive({
  keyword: '',
  category: ''
});

const uploadForm = reactive({
  title: '',
  singer: '',
  album: '',
  category: '',
  duration: '',
  music: null,
  cover: null
});

const isLoggedIn = computed(() => Boolean(token.value && user.value));

const accountInitial = computed(() =>
  user.value && user.value.username ? user.value.username.slice(0, 1).toUpperCase() : '未'
);

const getUploaderId = (song) => {
  if (!song.uploaderId) {
    return '';
  }

  return typeof song.uploaderId === 'string' ? song.uploaderId : song.uploaderId._id;
};

const isSongUploader = (song) =>
  isLoggedIn.value && getUploaderId(song) === user.value.id;

const favoriteSongs = computed(() =>
  favorites.value.map((favorite) => favorite.songId).filter(Boolean)
);

const uploadedSongs = computed(() =>
  songs.value.filter((song) => isSongUploader(song))
);

const featuredSong = computed(() => currentSong.value || songs.value[0] || null);

const previewSongs = computed(() => songs.value.slice(0, 5));

const totalPlayCount = computed(() =>
  songs.value.reduce((sum, song) => sum + (Number(song.playCount) || 0), 0)
);

const currentSong = computed(() =>
  songs.value.find((song) => song._id === playingSongId.value) ||
  favoriteSongs.value.find((song) => song._id === playingSongId.value) ||
  null
);

const currentQueue = computed(() =>
  activeTab.value === 'favorites' ? favoriteSongs.value : songs.value
);

const currentSongIndex = computed(() =>
  currentQueue.value.findIndex((song) => song._id === playingSongId.value)
);

const uploadReady = computed(() =>
  Boolean(uploadForm.title && uploadForm.singer && uploadForm.music)
);

const uploadPreviewTitle = computed(() => uploadForm.title || '新歌曲标题');

const uploadPreviewSinger = computed(() => uploadForm.singer || '待填写歌手');

const uploadPreviewAlbum = computed(() => uploadForm.album || '未命名专辑');

const uploadPreviewCategory = computed(() => uploadForm.category || '其他');

const canDeleteSong = (song) => {
  if (!isLoggedIn.value || !song.uploaderId) {
    return false;
  }

  return user.value.role === 'admin' || isSongUploader(song);
};

const getFavoriteIcon = (song) => (favoriteMap[song._id] ? '♥' : '♡');

const getFavoriteLabel = (song) => (favoriteMap[song._id] ? '取消收藏' : '收藏');

const showMessage = (text) => {
  message.value = text;
};

const saveAuth = (data) => {
  token.value = data.token;
  user.value = data.user;
  localStorage.setItem('music_token', data.token);
  localStorage.setItem('music_user', JSON.stringify(data.user));
};

const logout = () => {
  token.value = '';
  user.value = null;
  favorites.value = [];
  Object.keys(favoriteMap).forEach((key) => {
    delete favoriteMap[key];
  });
  localStorage.removeItem('music_token');
  localStorage.removeItem('music_user');
  activeTab.value = 'songs';
  showMessage('已退出登录');
};

const submitAuth = async () => {
  if (!authForm.username || !authForm.password) {
    showMessage('请输入用户名和密码');
    return;
  }

  loading.value = true;

  try {
    const action = mode.value === 'login' ? api.login : api.register;
    const data = await action({
      username: authForm.username,
      password: authForm.password
    });

    saveAuth(data);
    showMessage(data.message);
    await loadSongs();
    await loadFavorites();
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
  }
};

const loadSongs = async () => {
  loading.value = true;

  try {
    const data = await api.getSongs(filters);
    songs.value = data.songs || [];

    if (isLoggedIn.value) {
      await loadFavoriteStatuses();
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
  }
};

const resetFilters = async () => {
  filters.keyword = '';
  filters.category = '';
  await loadSongs();
};

const selectCategory = async (category) => {
  filters.category = category === '全部' ? '' : category;
  await loadSongs();
};

const loadFavoriteStatuses = async () => {
  await Promise.all(
    songs.value.map(async (song) => {
      try {
        const data = await api.getFavoriteStatus(song._id);
        favoriteMap[song._id] = data.isFavorite;
      } catch (error) {
        favoriteMap[song._id] = false;
      }
    })
  );
};

const loadFavorites = async () => {
  if (!isLoggedIn.value) {
    return;
  }

  loading.value = true;

  try {
    const data = await api.getFavorites();
    favorites.value = data.favorites || [];
    favorites.value.forEach((favorite) => {
      if (favorite.songId && favorite.songId._id) {
        favoriteMap[favorite.songId._id] = true;
      }
    });
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
  }
};

const toggleFavorite = async (song) => {
  if (!isLoggedIn.value) {
    showMessage('请先登录');
    return;
  }

  try {
    if (favoriteMap[song._id]) {
      const data = await api.removeFavorite(song._id);
      favoriteMap[song._id] = false;
      showMessage(data.message);
    } else {
      const data = await api.addFavorite(song._id);
      favoriteMap[song._id] = true;
      showMessage(data.message);
    }

    await loadFavorites();
  } catch (error) {
    showMessage(error.message);
  }
};

const playSong = async (song) => {
  playingSongId.value = song._id;

  if (audioRef.value) {
    audioRef.value.src = song.musicUrl;
    await audioRef.value.play();
  }

  try {
    const data = await api.increasePlayCount(song._id);
    song.playCount = data.playCount;
  } catch (error) {
    showMessage(error.message);
  }
};

const playByOffset = async (offset) => {
  if (!currentQueue.value.length) {
    showMessage('暂无可播放歌曲');
    return;
  }

  const currentIndex = currentSongIndex.value === -1 ? 0 : currentSongIndex.value;
  const nextIndex = (currentIndex + offset + currentQueue.value.length) % currentQueue.value.length;
  await playSong(currentQueue.value[nextIndex]);
};

const playPrevious = async () => {
  await playByOffset(-1);
};

const playNext = async () => {
  await playByOffset(1);
};

const handleAudioEnded = async () => {
  if (currentQueue.value.length > 1) {
    await playNext();
  }
};

const openSongDetail = (song) => {
  selectedSong.value = song;
};

const closeSongDetail = () => {
  selectedSong.value = null;
};

const deleteSong = async (song) => {
  if (!canDeleteSong(song)) {
    showMessage('没有权限删除这首歌曲');
    return;
  }

  const confirmed = window.confirm(`确定删除《${song.title}》吗？`);

  if (!confirmed) {
    return;
  }

  loading.value = true;

  try {
    const data = await api.deleteSong(song._id);
    showMessage(data.message);

    if (playingSongId.value === song._id && audioRef.value) {
      audioRef.value.pause();
      audioRef.value.removeAttribute('src');
      playingSongId.value = '';
    }

    if (selectedSong.value && selectedSong.value._id === song._id) {
      selectedSong.value = null;
    }

    delete favoriteMap[song._id];
    await loadSongs();
    await loadFavorites();
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
  }
};

const handleMusicFile = (event) => {
  uploadForm.music = event.target.files[0] || null;
};

const handleCoverFile = (event) => {
  uploadForm.cover = event.target.files[0] || null;

  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
    coverPreviewUrl.value = '';
  }

  if (uploadForm.cover) {
    coverPreviewUrl.value = URL.createObjectURL(uploadForm.cover);
  }
};

const clearUploadForm = () => {
  Object.assign(uploadForm, {
    title: '',
    singer: '',
    album: '',
    category: '',
    duration: '',
    music: null,
    cover: null
  });

  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
    coverPreviewUrl.value = '';
  }

  if (musicInputRef.value) {
    musicInputRef.value.value = '';
  }

  if (coverInputRef.value) {
    coverInputRef.value.value = '';
  }
};

const submitUpload = async () => {
  if (!uploadForm.title || !uploadForm.singer || !uploadForm.music) {
    showMessage('请填写歌曲名称、歌手并选择音乐文件');
    return;
  }

  const formData = new FormData();
  formData.append('title', uploadForm.title);
  formData.append('singer', uploadForm.singer);
  formData.append('album', uploadForm.album);
  formData.append('category', uploadForm.category);
  formData.append('duration', uploadForm.duration);
  formData.append('music', uploadForm.music);

  if (uploadForm.cover) {
    formData.append('cover', uploadForm.cover);
  }

  loading.value = true;

  try {
    const data = await api.uploadSong(formData);
    showMessage(data.message);
    Object.assign(uploadForm, {
      title: '',
      singer: '',
      album: '',
      category: '',
      duration: '',
      music: null,
      cover: null
    });

    if (musicInputRef.value) {
      musicInputRef.value.value = '';
    }

    if (coverInputRef.value) {
      coverInputRef.value.value = '';
    }

    if (coverPreviewUrl.value) {
      URL.revokeObjectURL(coverPreviewUrl.value);
      coverPreviewUrl.value = '';
    }

    activeTab.value = 'songs';
    await loadSongs();
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
  }
};

const switchTab = async (tab) => {
  if (tab.auth && !isLoggedIn.value) {
    showMessage('请先登录');
    activeTab.value = 'account';
    return;
  }

  activeTab.value = tab.key;

  if (tab.key === 'favorites') {
    await loadFavorites();
  }

  if (tab.key === 'uploads') {
    await loadSongs();
  }
};

const openAccount = () => {
  activeTab.value = 'account';
};

onMounted(async () => {
  await loadSongs();

  if (isLoggedIn.value) {
    await loadFavorites();
  }
});

onUnmounted(() => {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="app-mark">♪</div>
        <div>
          <h1>Music Lab</h1>
          <p>课程实验资料库</p>
        </div>
      </div>

      <nav class="nav-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="switchTab(tab)"
        >
          <span>{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <button class="account-trigger" type="button" title="账户" @click="openAccount">
      <span>{{ isLoggedIn ? accountInitial : '⌾' }}</span>
    </button>

    <main class="main-grid">
      <section class="content">
        <div v-if="message" class="notice">{{ message }}</div>

        <section v-if="activeTab === 'songs'" class="section">
          <div class="library-hero">
            <div class="hero-copy">
              <span class="eyebrow">资料库精选</span>
              <h2>{{ featuredSong ? featuredSong.title : '开始建立你的音乐库' }}</h2>
              <p>
                {{ featuredSong ? `${featuredSong.singer} · ${featuredSong.album || '未知专辑'}` : '上传第一首歌曲后，这里会展示你的最新音乐。' }}
              </p>
              <div class="hero-actions">
                <button v-if="featuredSong" type="button" :disabled="loading" @click="playSong(featuredSong)">
                  ▶ 播放精选
                </button>
                <button class="secondary" type="button" @click="activeTab = isLoggedIn ? 'upload' : 'account'">
                  {{ isLoggedIn ? '＋ 上传歌曲' : '登录后上传' }}
                </button>
              </div>
            </div>
            <img
              class="hero-cover"
              :src="featuredSong && featuredSong.coverUrl ? featuredSong.coverUrl : '/default-cover.svg'"
              alt=""
            />
          </div>

          <div class="stats">
            <div>
              <strong>{{ songs.length }}</strong>
              <span>歌曲</span>
            </div>
            <div>
              <strong>{{ totalPlayCount }}</strong>
              <span>播放</span>
            </div>
            <div>
              <strong>{{ favoriteSongs.length }}</strong>
              <span>收藏</span>
            </div>
          </div>

          <div v-if="previewSongs.length" class="preview-row">
            <article v-for="song in previewSongs" :key="song._id" class="preview-card" @click="openSongDetail(song)">
              <img :src="song.coverUrl || '/default-cover.svg'" alt="" />
              <strong>{{ song.title }}</strong>
              <span>{{ song.singer }}</span>
            </article>
          </div>

          <div class="section-head">
            <h2>歌曲列表</h2>
            <form class="filters" @submit.prevent="loadSongs">
              <input v-model.trim="filters.keyword" placeholder="搜索歌曲、歌手、专辑" />
              <input v-model.trim="filters.category" placeholder="分类" />
              <button type="submit" :disabled="loading">搜索</button>
              <button class="secondary icon-button" type="button" title="重置" :disabled="loading" @click="resetFilters">
                ↺
              </button>
            </form>
          </div>

          <div class="category-bar">
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              :class="{ active: (category === '全部' && !filters.category) || filters.category === category }"
              :disabled="loading"
              @click="selectCategory(category)"
            >
              {{ category }}
            </button>
          </div>

          <div v-if="songs.length" class="song-list">
            <article
              v-for="song in songs"
              :key="song._id"
              class="song-item"
              :class="{ playing: playingSongId === song._id }"
            >
              <img
                class="cover"
                :src="song.coverUrl || '/default-cover.svg'"
                alt=""
              />
              <div class="song-info">
                <button class="song-title" type="button" @click="openSongDetail(song)">
                  {{ song.title }}
                </button>
                <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
                <span>
                  {{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次
                  <template v-if="song.uploaderId && song.uploaderId.username">
                    · 上传者 {{ song.uploaderId.username }}
                  </template>
                </span>
              </div>
              <div class="song-actions">
                <button class="icon-button" type="button" :title="playingSongId === song._id ? '播放中' : '播放'" :disabled="loading" @click="playSong(song)">
                  {{ playingSongId === song._id ? '●' : '▶' }}
                </button>
                <button class="icon-button favorite" type="button" :title="getFavoriteLabel(song)" :disabled="loading" @click="toggleFavorite(song)">
                  {{ getFavoriteIcon(song) }}
                </button>
                <button
                  v-if="canDeleteSong(song)"
                  class="icon-button danger"
                  type="button"
                  title="删除"
                  :disabled="loading"
                  @click="deleteSong(song)"
                >
                  ×
                </button>
              </div>
            </article>
          </div>

          <div v-else class="empty">暂无歌曲</div>
        </section>

        <section v-if="activeTab === 'upload'" class="section upload-page">
          <div class="upload-hero">
            <div>
              <span class="eyebrow">上传工作台</span>
              <h2>发布一首新歌曲</h2>
              <p>填写歌曲信息，选择音频和封面。MongoDB 只保存文件路径，音频文件会放在 uploads 目录。</p>
            </div>
            <div class="upload-readiness" :class="{ ready: uploadReady }">
              <strong>{{ uploadReady ? '准备就绪' : '待补全' }}</strong>
              <span>{{ uploadReady ? '可以提交上传' : '需要歌曲名、歌手和音乐文件' }}</span>
            </div>
          </div>

          <form class="upload-workbench" @submit.prevent="submitUpload">
            <div class="upload-fields">
              <div class="field-grid">
                <label>
                  歌曲名称
                  <input v-model.trim="uploadForm.title" placeholder="例如 Neon Morning" />
                </label>
                <label>
                  歌手
                  <input v-model.trim="uploadForm.singer" placeholder="例如 Demo Studio" />
                </label>
                <label>
                  专辑
                  <input v-model.trim="uploadForm.album" placeholder="例如 Dark Library" />
                </label>
                <label>
                  时长（秒）
                  <input v-model.trim="uploadForm.duration" type="number" min="0" placeholder="180" />
                </label>
              </div>

              <label>
                分类
                <input v-model.trim="uploadForm.category" placeholder="输入或选择分类" />
              </label>

              <div class="category-bar upload-categories">
                <button
                  v-for="category in categories.slice(1)"
                  :key="category"
                  type="button"
                  :class="{ active: uploadForm.category === category }"
                  @click="uploadForm.category = category"
                >
                  {{ category }}
                </button>
              </div>

              <div class="upload-files">
                <label class="file-drop">
                  <span class="file-icon">♫</span>
                  <strong>音乐文件</strong>
                  <small>{{ uploadForm.music ? uploadForm.music.name : '选择音频文件' }}</small>
                  <input ref="musicInputRef" accept="audio/*" type="file" @change="handleMusicFile" />
                </label>
                <label class="file-drop">
                  <span class="file-icon">▧</span>
                  <strong>封面图片</strong>
                  <small>{{ uploadForm.cover ? uploadForm.cover.name : '选择封面图片，可选' }}</small>
                  <input ref="coverInputRef" accept="image/*" type="file" @change="handleCoverFile" />
                </label>
              </div>

              <div class="upload-actions">
                <button type="submit" :disabled="loading || !uploadReady">
                  {{ loading ? '上传中...' : '＋ 提交上传' }}
                </button>
                <button class="secondary" type="button" :disabled="loading" @click="clearUploadForm">
                  清空
                </button>
              </div>
            </div>

            <aside class="upload-preview">
              <div class="preview-cover large">
                <img v-if="coverPreviewUrl" :src="coverPreviewUrl" alt="" />
                <span v-else>♪</span>
              </div>
              <div class="preview-meta">
                <h3>{{ uploadPreviewTitle }}</h3>
                <p>{{ uploadPreviewSinger }} · {{ uploadPreviewAlbum }}</p>
                <span>{{ uploadPreviewCategory }}</span>
              </div>
              <div class="upload-checklist">
                <div :class="{ done: uploadForm.title }">
                  <span>{{ uploadForm.title ? '✓' : '○' }}</span>
                  歌曲名称
                </div>
                <div :class="{ done: uploadForm.singer }">
                  <span>{{ uploadForm.singer ? '✓' : '○' }}</span>
                  歌手
                </div>
                <div :class="{ done: uploadForm.music }">
                  <span>{{ uploadForm.music ? '✓' : '○' }}</span>
                  音乐文件
                </div>
                <div :class="{ done: uploadForm.cover }">
                  <span>{{ uploadForm.cover ? '✓' : '○' }}</span>
                  封面图片
                </div>
              </div>
            </aside>
          </form>
        </section>

        <section v-if="activeTab === 'uploads'" class="section">
          <div class="section-head">
            <div>
              <h2>我的上传</h2>
              <p class="section-subtitle">共 {{ uploadedSongs.length }} 首歌曲</p>
            </div>
            <button type="button" @click="activeTab = 'upload'">继续上传</button>
          </div>

          <div v-if="uploadedSongs.length" class="song-list">
            <article
              v-for="song in uploadedSongs"
              :key="song._id"
              class="song-item"
              :class="{ playing: playingSongId === song._id }"
            >
              <img class="cover" :src="song.coverUrl || '/default-cover.svg'" alt="" />
              <div class="song-info">
                <button class="song-title" type="button" @click="openSongDetail(song)">
                  {{ song.title }}
                </button>
                <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
                <span>{{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次</span>
              </div>
              <div class="song-actions">
                <button class="icon-button" type="button" title="播放" :disabled="loading" @click="playSong(song)">▶</button>
                <button class="icon-button favorite" type="button" :title="getFavoriteLabel(song)" :disabled="loading" @click="toggleFavorite(song)">
                  {{ getFavoriteIcon(song) }}
                </button>
                <button class="icon-button danger" type="button" title="删除" :disabled="loading" @click="deleteSong(song)">
                  ×
                </button>
              </div>
            </article>
          </div>

          <div v-else class="empty">还没有上传歌曲</div>
        </section>

        <section v-if="activeTab === 'favorites'" class="section">
          <div class="section-head">
            <div>
              <h2>我的收藏</h2>
              <p class="section-subtitle">保存在账号里的喜欢歌曲</p>
            </div>
          </div>

          <div v-if="favoriteSongs.length" class="song-list">
            <article v-for="song in favoriteSongs" :key="song._id" class="song-item">
              <img class="cover" :src="song.coverUrl || '/default-cover.svg'" alt="" />
              <div class="song-info">
                <button class="song-title" type="button" @click="openSongDetail(song)">
                  {{ song.title }}
                </button>
                <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
                <span>{{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次</span>
              </div>
              <div class="song-actions">
                <button class="icon-button" type="button" title="播放" :disabled="loading" @click="playSong(song)">▶</button>
                <button class="icon-button favorite" type="button" title="取消收藏" :disabled="loading" @click="toggleFavorite(song)">♥</button>
              </div>
            </article>
          </div>

          <div v-else class="empty">暂无收藏</div>
        </section>

        <section v-if="activeTab === 'account'" class="section account-page">
          <div class="section-head">
            <div>
              <h2>账户</h2>
              <p class="section-subtitle">登录后可以上传、收藏和管理自己的歌曲</p>
            </div>
          </div>

          <template v-if="!isLoggedIn">
            <div class="mode-switch">
              <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">
                ⎋ 登录
              </button>
              <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">
                ＋ 注册
              </button>
            </div>

            <form class="form account-form" @submit.prevent="submitAuth">
              <label>
                用户名
                <input v-model.trim="authForm.username" autocomplete="username" />
              </label>
              <label>
                密码
                <input v-model="authForm.password" autocomplete="current-password" type="password" />
              </label>
              <button type="submit" :disabled="loading">
                {{ mode === 'login' ? '登录' : '注册' }}
              </button>
            </form>
          </template>

          <template v-else>
            <div class="account-summary">
              <div class="account-avatar">{{ accountInitial }}</div>
              <div>
                <h3>{{ user.username }}</h3>
                <p>{{ user.role === 'admin' ? '管理员账号' : '普通用户账号' }}</p>
              </div>
            </div>

            <div class="account-stats">
              <div>
                <strong>{{ favoriteSongs.length }}</strong>
                <span>收藏</span>
              </div>
              <div>
                <strong>{{ uploadedSongs.length }}</strong>
                <span>上传</span>
              </div>
              <div>
                <strong>{{ songs.length }}</strong>
                <span>歌曲</span>
              </div>
            </div>

            <div class="account-actions">
              <button type="button" @click="activeTab = 'upload'">＋ 上传歌曲</button>
              <button class="secondary" type="button" @click="activeTab = 'uploads'">查看我的上传</button>
              <button class="secondary" type="button" @click="logout">退出登录</button>
            </div>
          </template>
        </section>
      </section>
    </main>

    <div v-if="selectedSong" class="modal-backdrop" @click.self="closeSongDetail">
      <section class="modal">
        <div class="modal-head">
          <h2>歌曲详情</h2>
          <button class="secondary icon-button" type="button" title="关闭" @click="closeSongDetail">×</button>
        </div>

        <div class="detail-layout">
          <img class="detail-cover" :src="selectedSong.coverUrl || '/default-cover.svg'" alt="" />
          <div class="detail-info">
            <h3>{{ selectedSong.title }}</h3>
            <p>{{ selectedSong.singer }} · {{ selectedSong.album || '未知专辑' }}</p>
            <dl>
              <div>
                <dt>分类</dt>
                <dd>{{ selectedSong.category || '其他' }}</dd>
              </div>
              <div>
                <dt>时长</dt>
                <dd>{{ selectedSong.duration || 0 }} 秒</dd>
              </div>
              <div>
                <dt>播放次数</dt>
                <dd>{{ selectedSong.playCount || 0 }}</dd>
              </div>
              <div>
                <dt>上传者</dt>
                <dd>{{ selectedSong.uploaderId && selectedSong.uploaderId.username ? selectedSong.uploaderId.username : '未知' }}</dd>
              </div>
              <div>
                <dt>音乐路径</dt>
                <dd>{{ selectedSong.musicUrl }}</dd>
              </div>
              <div>
                <dt>封面路径</dt>
                <dd>{{ selectedSong.coverUrl || '未上传封面' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="modal-actions">
          <button class="icon-button" type="button" title="播放" :disabled="loading" @click="playSong(selectedSong)">▶</button>
          <button class="icon-button favorite" type="button" :title="getFavoriteLabel(selectedSong)" :disabled="loading" @click="toggleFavorite(selectedSong)">
            {{ getFavoriteIcon(selectedSong) }}
          </button>
          <button
            v-if="canDeleteSong(selectedSong)"
            class="icon-button danger"
            type="button"
            title="删除"
            :disabled="loading"
            @click="deleteSong(selectedSong)"
          >
            ×
          </button>
        </div>
      </section>
    </div>

    <footer class="player">
      <div class="now-playing">
        <img :src="currentSong && currentSong.coverUrl ? currentSong.coverUrl : '/default-cover.svg'" alt="" />
        <div>
          <strong>{{ currentSong ? currentSong.title : '未播放歌曲' }}</strong>
          <span>{{ currentSong ? currentSong.singer : '请选择一首歌曲' }}</span>
        </div>
      </div>
      <div class="player-controls">
        <button class="secondary icon-button transport" type="button" title="上一首" :disabled="!currentQueue.length" @click="playPrevious">⏮</button>
        <audio ref="audioRef" controls @ended="handleAudioEnded" />
        <button class="secondary icon-button transport" type="button" title="下一首" :disabled="!currentQueue.length" @click="playNext">⏭</button>
      </div>
    </footer>
  </div>
</template>
