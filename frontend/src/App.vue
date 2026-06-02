<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from './api';

const tabs = [
  { key: 'songs', label: '首页' },
  { key: 'upload', label: '上传歌曲', auth: true },
  { key: 'favorites', label: '我的收藏', auth: true }
];

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

const favoriteSongs = computed(() =>
  favorites.value.map((favorite) => favorite.songId).filter(Boolean)
);

const totalPlayCount = computed(() =>
  songs.value.reduce((sum, song) => sum + (Number(song.playCount) || 0), 0)
);

const currentSong = computed(() =>
  songs.value.find((song) => song._id === playingSongId.value) ||
  favoriteSongs.value.find((song) => song._id === playingSongId.value) ||
  null
);

const canDeleteSong = (song) => {
  if (!isLoggedIn.value || !song.uploaderId) {
    return false;
  }

  const uploaderId = typeof song.uploaderId === 'string' ? song.uploaderId : song.uploaderId._id;
  return user.value.role === 'admin' || uploaderId === user.value.id;
};

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
      <div>
        <h1>音乐网站</h1>
        <p>课程实验 MVP</p>
      </div>

      <nav class="nav-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="switchTab(tab)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="user-panel">
        <span v-if="isLoggedIn">{{ user.username }} · {{ user.role === 'admin' ? '管理员' : '用户' }}</span>
        <button v-if="isLoggedIn" type="button" @click="logout">退出</button>
      </div>
    </header>

    <main class="main-grid">
      <section class="content">
        <div v-if="message" class="notice">{{ message }}</div>

        <section v-if="activeTab === 'songs'" class="section">
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

          <div class="section-head">
            <h2>歌曲列表</h2>
            <form class="filters" @submit.prevent="loadSongs">
              <input v-model.trim="filters.keyword" placeholder="搜索歌曲、歌手、专辑" />
              <input v-model.trim="filters.category" placeholder="分类" />
              <button type="submit" :disabled="loading">搜索</button>
              <button class="secondary" type="button" :disabled="loading" @click="resetFilters">重置</button>
            </form>
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
                <h3>{{ song.title }}</h3>
                <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
                <span>
                  {{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次
                  <template v-if="song.uploaderId && song.uploaderId.username">
                    · 上传者 {{ song.uploaderId.username }}
                  </template>
                </span>
              </div>
              <div class="song-actions">
                <button type="button" :disabled="loading" @click="playSong(song)">
                  {{ playingSongId === song._id ? '播放中' : '播放' }}
                </button>
                <button type="button" :disabled="loading" @click="toggleFavorite(song)">
                  {{ favoriteMap[song._id] ? '已收藏' : '收藏' }}
                </button>
                <button
                  v-if="canDeleteSong(song)"
                  class="danger"
                  type="button"
                  :disabled="loading"
                  @click="deleteSong(song)"
                >
                  删除
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
            </label>
            <label>
              封面图片
              <input ref="coverInputRef" accept="image/*" type="file" @change="handleCoverFile" />
            </label>
            <button type="submit" :disabled="loading">提交上传</button>
          </form>
        </section>

        <section v-if="activeTab === 'favorites'" class="section">
          <h2>我的收藏</h2>

          <div v-if="favoriteSongs.length" class="song-list">
            <article v-for="song in favoriteSongs" :key="song._id" class="song-item">
              <img class="cover" :src="song.coverUrl || '/default-cover.svg'" alt="" />
              <div class="song-info">
                <h3>{{ song.title }}</h3>
                <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
                <span>{{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次</span>
              </div>
              <div class="song-actions">
                <button type="button" :disabled="loading" @click="playSong(song)">播放</button>
                <button type="button" :disabled="loading" @click="toggleFavorite(song)">取消收藏</button>
              </div>
            </article>
          </div>

          <div v-else class="empty">暂无收藏</div>
        </section>
      </section>

      <aside class="auth-card">
        <template v-if="!isLoggedIn">
          <div class="mode-switch">
            <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">
              登录
            </button>
            <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">
              注册
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
            <span>歌曲 {{ songs.length }}</span>
          </div>
          <button type="button" @click="activeTab = 'upload'">上传歌曲</button>
        </template>
      </aside>
    </main>

    <footer class="player">
      <div class="now-playing">
        <strong>{{ currentSong ? currentSong.title : '未播放歌曲' }}</strong>
        <span>{{ currentSong ? currentSong.singer : '请选择一首歌曲' }}</span>
      </div>
      <audio ref="audioRef" controls />
    </footer>
  </div>
</template>
