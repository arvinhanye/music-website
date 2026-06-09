<script setup>
import AppIcon from './AppIcon.vue';

defineProps({
  song: {
    type: Object,
    required: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  },
  pendingFavorite: {
    type: Boolean,
    default: false
  },
  pendingDelete: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'play', 'favorite', 'delete']);
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal">
      <div class="modal-head">
        <h2>歌曲详情</h2>
        <button class="secondary icon-button" type="button" title="关闭" @click="$emit('close')">
          <AppIcon name="close" :size="18" />
        </button>
      </div>

      <div class="detail-layout">
        <img class="detail-cover" :src="song.coverUrl || '/default-cover.svg'" alt="" />
        <div class="detail-info">
          <span class="detail-category">{{ song.category || '其他' }}</span>
          <h3>{{ song.title }}</h3>
          <p>{{ song.singer }} · {{ song.album || '未知专辑' }}</p>
          <dl>
            <div><dt>分类</dt><dd>{{ song.category || '其他' }}</dd></div>
            <div><dt>时长</dt><dd>{{ song.duration || 0 }} 秒</dd></div>
            <div><dt>播放次数</dt><dd>{{ song.playCount || 0 }}</dd></div>
            <div>
              <dt>上传者</dt>
              <dd>{{ song.uploaderId && song.uploaderId.username ? song.uploaderId.username : '未知' }}</dd>
            </div>
            <div class="detail-path"><dt>音乐路径</dt><dd>{{ song.musicUrl }}</dd></div>
            <div class="detail-path"><dt>封面路径</dt><dd>{{ song.coverUrl || '未上传封面' }}</dd></div>
          </dl>
        </div>
      </div>

      <div class="modal-actions">
        <button class="icon-button wide" type="button" title="播放" @click="$emit('play', song)">
          <AppIcon name="play" :size="17" filled />
          播放
        </button>
        <button
          class="icon-button wide favorite"
          type="button"
          :title="isFavorite ? '取消收藏' : '收藏'"
          :aria-pressed="isFavorite"
          :disabled="pendingFavorite"
          @click="$emit('favorite', song)"
        >
          <span v-if="pendingFavorite" class="button-spinner"></span>
          <AppIcon v-else name="heart" :size="18" :filled="isFavorite" />
          {{ isFavorite ? '取消收藏' : '收藏' }}
        </button>
        <button
          v-if="canDelete"
          class="icon-button danger"
          type="button"
          title="删除"
          :disabled="pendingDelete"
          @click="$emit('delete', song)"
        >
          <span v-if="pendingDelete" class="button-spinner"></span>
          <AppIcon v-else name="trash" :size="17" />
        </button>
      </div>
    </section>
  </div>
</template>
