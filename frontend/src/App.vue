<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { api } from './api';
import AppIcon from './components/AppIcon.vue';
import AppSidebar from './components/AppSidebar.vue';
import MusicPlayer from './components/MusicPlayer.vue';
import SongList from './components/SongList.vue';
import SongModal from './components/SongModal.vue';
import UploadForm from './components/UploadForm.vue';

let messageTimer;

const tabs = [
  { key: 'songs', label: '资料库', icon: 'library' },
  { key: 'upload', label: '上传歌曲', icon: 'plus', auth: true },
  { key: 'uploads', label: '我的上传', icon: 'upload', auth: true },
  { key: 'favorites', label: '我的收藏', icon: 'heart', auth: true }
];

const categories = ['全部', '流行', '民谣', '摇滚', '电子', '其他'];

const activeTab = ref('songs');
const mode = ref('login');
const message = ref('');
const loading = ref(false);
const hasLoadedSongs = ref(false);
const user = ref(JSON.parse(localStorage.getItem('music_user') || 'null'));
const token = ref(localStorage.getItem('music_token') || '');
const songs = ref([]);
const favorites = ref([]);
const favoriteMap = reactive({});
const playingSongId = ref('');
const isPlaying = ref(false);
const pendingFavoriteId = ref('');
const pendingDeleteId = ref('');
const selectedSong = ref(null);
const playerRef = ref(null);
const uploadFormRef = ref(null);

const authForm = reactive({
  username: '',
  password: ''
});

const filters = reactive({
  keyword: '',
  category: ''
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

const previewSongs = computed(() => songs.value.slice(0, 4));

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

const getFavoriteLabel = (song) => (favoriteMap[song._id] ? '取消收藏' : '收藏');

const showMessage = (text) => {
  message.value = text;

  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    message.value = '';
  }, 3000);
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
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
    hasLoadedSongs.value = true;
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

const loadFavorites = async (showLoading = true) => {
  if (!isLoggedIn.value) {
    return;
  }

  if (showLoading) {
    loading.value = true;
  }

  try {
    const data = await api.getFavorites();
    favorites.value = data.favorites || [];

    Object.keys(favoriteMap).forEach((key) => {
      delete favoriteMap[key];
    });

    favorites.value.forEach((favorite) => {
      if (favorite.songId && favorite.songId._id) {
        favoriteMap[favorite.songId._id] = true;
      }
    });
  } catch (error) {
    showMessage(error.message);
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
};

const toggleFavorite = async (song) => {
  if (!isLoggedIn.value) {
    showMessage('请先登录');
    return;
  }

  pendingFavoriteId.value = song._id;

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

    await loadFavorites(false);
  } catch (error) {
    showMessage(error.message);
  } finally {
    pendingFavoriteId.value = '';
  }
};

const playSong = async (song) => {
  if (!playerRef.value) {
    return;
  }

  const isNewSong = playingSongId.value !== song._id;

  try {
    if (isNewSong) {
      playingSongId.value = song._id;
    }

    await playerRef.value.playSong(song, isNewSong);

    if (!isNewSong) {
      return;
    }

    const data = await api.increasePlayCount(song._id);
    song.playCount = data.playCount;
  } catch (error) {
    isPlaying.value = false;
    showMessage('音频播放失败，请重试');
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

const handleGlobalKeydown = (event) => {
  if (event.key === 'Escape' && selectedSong.value) {
    closeSongDetail();
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
  pendingDeleteId.value = song._id;

  try {
    const data = await api.deleteSong(song._id);
    showMessage(data.message);

    if (playingSongId.value === song._id && playerRef.value) {
      playerRef.value.reset();
      playingSongId.value = '';
      isPlaying.value = false;
    }

    if (selectedSong.value && selectedSong.value._id === song._id) {
      selectedSong.value = null;
    }

    delete favoriteMap[song._id];
    await loadSongs();
    await loadFavorites(false);
  } catch (error) {
    showMessage(error.message);
  } finally {
    loading.value = false;
    pendingDeleteId.value = '';
  }
};

const submitUpload = async (formData) => {
  loading.value = true;

  try {
    const data = await api.uploadSong(formData);
    showMessage(data.message);
    uploadFormRef.value?.reset();
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
  window.addEventListener('keydown', handleGlobalKeydown);
  await loadSongs();

  if (isLoggedIn.value) {
    await loadFavorites();
  }
});

onUnmounted(() => {
  window.clearTimeout(messageTimer);
  window.removeEventListener('keydown', handleGlobalKeydown);
  document.body.style.overflow = '';
});

watch(selectedSong, (song) => {
  document.body.style.overflow = song ? 'hidden' : '';
});
</script>

<template>
  <div class="app-shell">
    <AppSidebar
      :tabs="tabs"
      :active-tab="activeTab"
      :is-logged-in="isLoggedIn"
      :account-initial="accountInitial"
      @select-tab="switchTab"
      @open-account="openAccount"
    />

    <main class="main-grid">
      <section class="content">
        <Transition name="toast">
          <div v-if="message" class="notice" role="status">{{ message }}</div>
        </Transition>

        <TransitionGroup name="page" tag="div" class="page-stack">
        <section v-if="activeTab === 'songs'" key="songs" class="section">
          <div v-if="!hasLoadedSongs" class="library-skeleton" aria-label="正在加载歌曲">
            <div class="skeleton-block skeleton-hero"></div>
            <div class="skeleton-stats">
              <span v-for="item in 3" :key="item" class="skeleton-block"></span>
            </div>
            <div class="skeleton-cards">
              <span v-for="item in 4" :key="item" class="skeleton-block"></span>
            </div>
            <div class="skeleton-list">
              <span v-for="item in 4" :key="item" class="skeleton-block"></span>
            </div>
          </div>

          <template v-else>
          <div class="library-hero">
            <div class="hero-copy">
              <span class="eyebrow">资料库精选</span>
              <h2>{{ featuredSong ? featuredSong.title : '开始建立你的音乐库' }}</h2>
              <p>
                {{ featuredSong ? `${featuredSong.singer} · ${featuredSong.album || '未知专辑'}` : '上传第一首歌曲后，这里会展示你的最新音乐。' }}
              </p>
              <div class="hero-actions">
                <button v-if="featuredSong" type="button" :disabled="loading" @click="playSong(featuredSong)">
                  <AppIcon name="play" :size="17" filled />
                  播放精选
                </button>
                <button class="secondary" type="button" @click="activeTab = isLoggedIn ? 'upload' : 'account'">
                  <AppIcon :name="isLoggedIn ? 'plus' : 'user'" :size="17" />
                  {{ isLoggedIn ? '上传歌曲' : '登录后上传' }}
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

          <div v-if="previewSongs.length" class="recent-section">
            <div class="mini-section-head">
              <div>
                <span class="eyebrow">资料库更新</span>
                <h2>最近加入</h2>
              </div>
              <span>最新 {{ previewSongs.length }} 首歌曲</span>
            </div>
            <div class="preview-row">
              <article
                v-for="song in previewSongs"
                :key="song._id"
                class="preview-card"
                role="button"
                tabindex="0"
                @click="openSongDetail(song)"
                @keydown.enter="openSongDetail(song)"
              >
                <img :src="song.coverUrl || '/default-cover.svg'" alt="" />
                <strong>{{ song.title }}</strong>
                <span>{{ song.singer }}</span>
              </article>
            </div>
          </div>

          <div class="section-head">
            <div>
              <h2>全部歌曲</h2>
              <p class="section-subtitle">按名称、歌手或专辑快速查找</p>
            </div>
            <form class="filters" @submit.prevent="loadSongs">
              <input v-model.trim="filters.keyword" placeholder="搜索歌曲、歌手、专辑" />
              <button type="submit" :disabled="loading">搜索</button>
              <button class="secondary icon-button" type="button" title="重置" :disabled="loading" @click="resetFilters">
                <AppIcon name="reset" :size="18" />
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

          <SongList
            v-if="songs.length"
            :songs="songs"
            :playing-song-id="playingSongId"
            :is-playing="isPlaying"
            :favorite-map="favoriteMap"
            :loading="loading"
            :pending-favorite-id="pendingFavoriteId"
            :pending-delete-id="pendingDeleteId"
            :can-delete="canDeleteSong"
            show-uploader
            @play="playSong"
            @favorite="toggleFavorite"
            @delete="deleteSong"
            @detail="openSongDetail"
          />

          <div v-else class="empty">暂无歌曲</div>
          </template>
        </section>

        <UploadForm
          v-if="activeTab === 'upload'"
          ref="uploadFormRef"
          key="upload"
          :categories="categories"
          :loading="loading"
          @submit="submitUpload"
          @invalid="showMessage('请填写歌曲名称、歌手并选择音乐文件')"
        />

        <section v-if="activeTab === 'uploads'" key="uploads" class="section">
          <div class="section-head">
            <div>
              <h2>我的上传</h2>
              <p class="section-subtitle">共 {{ uploadedSongs.length }} 首歌曲</p>
            </div>
            <button type="button" @click="activeTab = 'upload'">继续上传</button>
          </div>

          <SongList
            v-if="uploadedSongs.length"
            :songs="uploadedSongs"
            :playing-song-id="playingSongId"
            :is-playing="isPlaying"
            :favorite-map="favoriteMap"
            :loading="loading"
            :pending-favorite-id="pendingFavoriteId"
            :pending-delete-id="pendingDeleteId"
            :can-delete="canDeleteSong"
            @play="playSong"
            @favorite="toggleFavorite"
            @delete="deleteSong"
            @detail="openSongDetail"
          />

          <div v-else class="empty-state">
            <span class="empty-icon"><AppIcon name="upload" :size="28" /></span>
            <h3>还没有上传歌曲</h3>
            <p>上传一首测试音乐，就可以在这里进行管理。</p>
            <button type="button" @click="activeTab = 'upload'">上传第一首歌曲</button>
          </div>
        </section>

        <section v-if="activeTab === 'favorites'" key="favorites" class="section">
          <div class="section-head">
            <div>
              <h2>我的收藏</h2>
              <p class="section-subtitle">保存在账号里的喜欢歌曲</p>
            </div>
          </div>

          <SongList
            v-if="favoriteSongs.length"
            :songs="favoriteSongs"
            :playing-song-id="playingSongId"
            :is-playing="isPlaying"
            :favorite-map="favoriteMap"
            :loading="loading"
            :pending-favorite-id="pendingFavoriteId"
            :can-delete="canDeleteSong"
            @play="playSong"
            @favorite="toggleFavorite"
            @delete="deleteSong"
            @detail="openSongDetail"
          />

          <div v-else class="empty-state">
            <span class="empty-icon"><AppIcon name="heart" :size="28" /></span>
            <h3>收藏列表还是空的</h3>
            <p>在资料库点击爱心，喜欢的歌曲会保存在这里。</p>
            <button type="button" @click="activeTab = 'songs'">浏览资料库</button>
          </div>
        </section>

        <section v-if="activeTab === 'account'" key="account" class="section account-page">
          <div class="section-head">
            <div>
              <h2>账户</h2>
              <p class="section-subtitle">登录后可以上传、收藏和管理自己的歌曲</p>
            </div>
          </div>

          <template v-if="!isLoggedIn">
            <div class="account-login-grid">
              <div class="account-intro">
                <span class="eyebrow">账户功能</span>
                <h3>管理你的音乐资料库</h3>
                <p>登录后可以上传歌曲、收藏音乐，并管理自己发布的内容。</p>
                <div class="account-benefits">
                  <span>✓ 保存个人收藏</span>
                  <span>✓ 管理上传歌曲</span>
                  <span>✓ 保留登录状态</span>
                </div>
              </div>

              <div class="account-panel">
                <div class="mode-switch">
                  <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">
                    登录
                  </button>
                  <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">
                    注册
                  </button>
                </div>

                <form class="form account-form" @submit.prevent="submitAuth">
                  <label>
                    用户名
                    <input v-model.trim="authForm.username" autocomplete="username" placeholder="请输入用户名" />
                  </label>
                  <label>
                    密码
                    <input
                      v-model="authForm.password"
                      :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                      type="password"
                      placeholder="请输入密码"
                    />
                  </label>
                  <button type="submit" :disabled="loading">
                    {{ loading ? '请稍候...' : mode === 'login' ? '登录账户' : '创建账户' }}
                  </button>
                </form>
              </div>
            </div>
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
              <button type="button" @click="activeTab = 'upload'">
                <AppIcon name="plus" :size="17" />
                上传歌曲
              </button>
              <button class="secondary" type="button" @click="activeTab = 'uploads'">查看我的上传</button>
              <button class="secondary" type="button" @click="logout">退出登录</button>
            </div>
          </template>
        </section>
        </TransitionGroup>
      </section>
    </main>

    <Transition name="modal">
      <SongModal
        v-if="selectedSong"
        :song="selectedSong"
        :is-favorite="Boolean(favoriteMap[selectedSong._id])"
        :can-delete="canDeleteSong(selectedSong)"
        :pending-favorite="pendingFavoriteId === selectedSong._id"
        :pending-delete="pendingDeleteId === selectedSong._id"
        @close="closeSongDetail"
        @play="playSong"
        @favorite="toggleFavorite"
        @delete="deleteSong"
      />
    </Transition>

    <MusicPlayer
      ref="playerRef"
      :current-song="currentSong"
      :has-queue="Boolean(currentQueue.length)"
      @previous="playPrevious"
      @next="currentSong ? playNext() : playSong(currentQueue[0])"
      @ended="handleAudioEnded"
      @error="showMessage('音频播放失败，请重试')"
      @state-change="isPlaying = $event"
    />
  </div>
</template>
