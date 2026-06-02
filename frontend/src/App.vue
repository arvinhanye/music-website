<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
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

onMounted(async () => {
  await loadSongs();

  if (isLoggedIn.value) {
    await loadFavorites();
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

      <div class="user-panel">
        <span v-if="isLoggedIn">{{ user.username }} · {{ user.role === 'admin' ? '管理员' : '用户' }}</span>
        <button v-if="isLoggedIn" class="icon-button wide" type="button" title="退出登录" @click="logout">
          <span>⎋</span>
          退出
        </button>
      </div>
    </header>

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
                <button class="secondary" type="button" @click="activeTab = isLoggedIn ? 'upload' : 'songs'">
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

        <section v-if="activeTab === 'upload'" class="section narrow">
          <h2>上传歌曲</h2>
          <form class="form" @submit.prevent="submitUpload">
            <label>
              歌曲名称
              <input v-model.trim="uploadForm.title" />
            </label>
            <label>
              歌手
              <input v-model.trim="uploadForm.singer" />
            </label>
            <label>
              专辑
              <input v-model.trim="uploadForm.album" />
            </label>
            <label>
              分类
              <input v-model.trim="uploadForm.category" />
            </label>
            <label>
              时长（秒）
              <input v-model.trim="uploadForm.duration" type="number" min="0" />
            </label>
            <label>
              音乐文件
              <input ref="musicInputRef" accept="audio/*" type="file" @change="handleMusicFile" />
              <span v-if="uploadForm.music" class="file-name">{{ uploadForm.music.name }}</span>
            </label>
            <label>
              封面图片
              <input ref="coverInputRef" accept="image/*" type="file" @change="handleCoverFile" />
              <span v-if="uploadForm.cover" class="file-name">{{ uploadForm.cover.name }}</span>
            </label>
            <button type="submit" :disabled="loading">
              {{ loading ? '上传中...' : '＋ 提交上传' }}
            </button>
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
      </section>

      <aside class="auth-card">
        <template v-if="!isLoggedIn">
          <h2>账户</h2>
          <p>登录后可以上传、收藏和管理自己的歌曲。</p>
          <div class="mode-switch">
            <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">
              ⎋ 登录
            </button>
            <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">
              ＋ 注册
            </button>
          </div>

          <form class="form" @submit.prevent="submitAuth">
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
          <h2>{{ user.username }}</h2>
          <p>{{ user.role === 'admin' ? '管理员账号' : '普通用户账号' }}</p>
          <div class="side-stats">
            <span>收藏 {{ favoriteSongs.length }}</span>
            <span>上传 {{ uploadedSongs.length }}</span>
            <span>歌曲 {{ songs.length }}</span>
          </div>
          <button type="button" @click="activeTab = 'upload'">＋ 上传歌曲</button>
        </template>
      </aside>
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
