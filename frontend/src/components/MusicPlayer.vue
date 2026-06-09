<script setup>
import { onMounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';

defineProps({
  currentSong: {
    type: Object,
    default: null
  },
  hasQueue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['previous', 'next', 'ended', 'error', 'state-change']);

const audioRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);

const formatTime = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

const setPlaying = (value) => {
  isPlaying.value = value;
  emit('state-change', value);
};

const playSong = async (song, isNewSong) => {
  if (!audioRef.value) {
    return;
  }

  if (isNewSong) {
    currentTime.value = 0;
    duration.value = Number(song.duration) || 0;
    audioRef.value.src = song.musicUrl;
  } else if (!audioRef.value.paused) {
    audioRef.value.pause();
    return;
  }

  try {
    await audioRef.value.play();
  } catch (error) {
    setPlaying(false);
    emit('error');
    throw error;
  }
};

const togglePlayback = async () => {
  if (!audioRef.value || !audioRef.value.src) {
    emit('next');
    return;
  }

  if (audioRef.value.paused) {
    try {
      await audioRef.value.play();
    } catch (error) {
      emit('error');
    }
  } else {
    audioRef.value.pause();
  }
};

const seekAudio = (event) => {
  const nextTime = Number(event.target.value);
  audioRef.value.currentTime = nextTime;
  currentTime.value = nextTime;
};

const setVolume = (event) => {
  const nextVolume = Number(event.target.value);
  volume.value = nextVolume;
  audioRef.value.volume = nextVolume;
};

const reset = () => {
  if (!audioRef.value) {
    return;
  }

  audioRef.value.pause();
  audioRef.value.removeAttribute('src');
  audioRef.value.load();
  currentTime.value = 0;
  duration.value = 0;
  setPlaying(false);
};

const syncDuration = () => {
  if (audioRef.value && Number.isFinite(audioRef.value.duration)) {
    duration.value = audioRef.value.duration;
  }
};

const syncTime = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime || 0;
  }
};

const handleEnded = () => {
  setPlaying(false);
  emit('ended');
};

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = volume.value;
  }
});

defineExpose({ playSong, reset });
</script>

<template>
  <footer class="player" :class="{ active: currentSong, compact: !currentSong }">
    <div class="now-playing">
      <img :src="currentSong && currentSong.coverUrl ? currentSong.coverUrl : '/default-cover.svg'" alt="" />
      <div>
        <strong>{{ currentSong ? currentSong.title : '未播放歌曲' }}</strong>
        <span>{{ currentSong ? currentSong.singer : '请选择一首歌曲' }}</span>
      </div>
    </div>
    <div class="player-controls">
      <button class="secondary icon-button transport" type="button" title="上一首" :disabled="!hasQueue" @click="$emit('previous')">
        <AppIcon name="previous" :size="19" />
      </button>
      <button class="icon-button play-toggle" type="button" :title="isPlaying ? '暂停' : '播放'" :disabled="!hasQueue" @click="togglePlayback">
        <AppIcon :name="isPlaying ? 'pause' : 'play'" :size="19" :filled="!isPlaying" />
      </button>
      <div class="player-progress">
        <input
          aria-label="播放进度"
          :disabled="!currentSong"
          :max="duration || 0"
          min="0"
          step="0.1"
          type="range"
          :value="currentTime"
          @input="seekAudio"
        />
        <div class="player-time">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>
      <label class="volume-control" title="音量">
        <AppIcon name="volume" :size="18" />
        <input
          aria-label="音量"
          max="1"
          min="0"
          step="0.05"
          type="range"
          :value="volume"
          @input="setVolume"
        />
      </label>
      <button class="secondary icon-button transport" type="button" title="下一首" :disabled="!hasQueue" @click="$emit('next')">
        <AppIcon name="next" :size="19" />
      </button>
      <audio
        ref="audioRef"
        @durationchange="syncDuration"
        @ended="handleEnded"
        @pause="setPlaying(false)"
        @play="setPlaying(true)"
        @timeupdate="syncTime"
      />
    </div>
  </footer>
</template>
