<script setup>
import AppIcon from './AppIcon.vue';

const props = defineProps({
  songs: {
    type: Array,
    required: true
  },
  playingSongId: {
    type: String,
    default: ''
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  favoriteMap: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  pendingFavoriteId: {
    type: String,
    default: ''
  },
  pendingDeleteId: {
    type: String,
    default: ''
  },
  canDelete: {
    type: Function,
    default: () => false
  },
  showUploader: {
    type: Boolean,
    default: false
  }
});

defineEmits(['play', 'favorite', 'delete', 'detail']);

const favoriteLabel = (song) => (props.favoriteMap[song._id] ? '取消收藏' : '收藏');
</script>

<template>
  <div class="song-list">
    <article
      v-for="song in songs"
      :key="song._id"
      class="song-item"
      :class="{ playing: playingSongId === song._id }"
    >
      <img class="cover" :src="song.coverUrl || '/default-cover.svg'" alt="" />
      <div class="song-info">
        <button class="song-title" type="button" @click="$emit('detail', song)">
          {{ song.title }}
        </button>
        <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
        <span>
          {{ song.category || '其他' }} · 播放 {{ song.playCount || 0 }} 次
          <template v-if="showUploader && song.uploaderId && song.uploaderId.username">
            · 上传者 {{ song.uploaderId.username }}
          </template>
        </span>
      </div>
      <div class="song-actions">
        <button
          class="icon-button"
          type="button"
          :title="playingSongId === song._id && isPlaying ? '暂停' : '播放'"
          :disabled="loading"
          @click="$emit('play', song)"
        >
          <AppIcon
            :name="playingSongId === song._id && isPlaying ? 'pause' : 'play'"
            :size="17"
            :filled="playingSongId !== song._id || !isPlaying"
          />
        </button>
        <button
          class="icon-button favorite"
          type="button"
          :title="favoriteLabel(song)"
          :aria-pressed="Boolean(favoriteMap[song._id])"
          :disabled="loading || pendingFavoriteId === song._id"
          @click="$emit('favorite', song)"
        >
          <span v-if="pendingFavoriteId === song._id" class="button-spinner"></span>
          <AppIcon v-else name="heart" :size="18" :filled="Boolean(favoriteMap[song._id])" />
        </button>
        <button
          v-if="canDelete(song)"
          class="icon-button danger"
          type="button"
          title="删除"
          :disabled="loading || pendingDeleteId === song._id"
          @click="$emit('delete', song)"
        >
          <span v-if="pendingDeleteId === song._id" class="button-spinner"></span>
          <AppIcon v-else name="trash" :size="17" />
        </button>
      </div>
    </article>
  </div>
</template>
