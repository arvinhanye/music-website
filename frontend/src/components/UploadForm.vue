<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue';
import AppIcon from './AppIcon.vue';

defineProps({
  categories: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'invalid']);

const musicInputRef = ref(null);
const coverInputRef = ref(null);
const coverPreviewUrl = ref('');

const form = reactive({
  title: '',
  singer: '',
  album: '',
  category: '',
  duration: '',
  music: null,
  cover: null
});

const ready = computed(() => Boolean(form.title && form.singer && form.music));
const completedSteps = computed(() =>
  [form.title, form.singer, form.music, form.cover].filter(Boolean).length
);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const handleMusicFile = (event) => {
  form.music = event.target.files[0] || null;
};

const handleCoverFile = (event) => {
  form.cover = event.target.files[0] || null;

  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
    coverPreviewUrl.value = '';
  }

  if (form.cover) {
    coverPreviewUrl.value = URL.createObjectURL(form.cover);
  }
};

const reset = () => {
  Object.assign(form, {
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

const submit = () => {
  if (!ready.value) {
    emit('invalid');
    return;
  }

  const formData = new FormData();
  formData.append('title', form.title);
  formData.append('singer', form.singer);
  formData.append('album', form.album);
  formData.append('category', form.category);
  formData.append('duration', form.duration);
  formData.append('music', form.music);

  if (form.cover) {
    formData.append('cover', form.cover);
  }

  emit('submit', formData);
};

onUnmounted(() => {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
  }
});

defineExpose({ reset });
</script>

<template>
  <section class="section upload-page">
    <div class="upload-hero">
      <div>
        <span class="eyebrow">上传工作台</span>
        <h2>发布一首新歌曲</h2>
        <p>依次填写歌曲资料、选择分类并添加文件，右侧会实时生成发布预览。</p>
      </div>
      <div class="upload-readiness" :class="{ ready }">
        <div class="readiness-score">{{ completedSteps }}/4</div>
        <div>
          <strong>{{ ready ? '准备就绪' : '填写进度' }}</strong>
          <span>{{ ready ? '可以提交上传' : '歌曲名、歌手和音频为必填项' }}</span>
        </div>
      </div>
    </div>

    <form class="upload-workbench" @submit.prevent="submit">
      <div class="upload-fields">
        <div class="upload-step-head">
          <span>01</span>
          <div><h3>歌曲资料</h3><p>填写用于资料库展示的基本信息</p></div>
        </div>

        <div class="field-grid">
          <label>
            <span class="field-label">歌曲名称 <em>必填</em></span>
            <input v-model.trim="form.title" placeholder="例如 Neon Morning" />
          </label>
          <label>
            <span class="field-label">歌手 <em>必填</em></span>
            <input v-model.trim="form.singer" placeholder="例如 Demo Studio" />
          </label>
          <label>
            <span class="field-label">专辑 <em class="optional">可选</em></span>
            <input v-model.trim="form.album" placeholder="例如 Dark Library" />
          </label>
          <label>
            <span class="field-label">时长（秒） <em class="optional">可选</em></span>
            <input v-model.trim="form.duration" type="number" min="0" placeholder="180" />
          </label>
        </div>

        <div class="upload-divider"></div>
        <div class="upload-step-head">
          <span>02</span>
          <div><h3>音乐分类</h3><p>选择一个分类，方便资料库快速筛选</p></div>
        </div>

        <label>
          <span class="field-label">分类 <em class="optional">默认“其他”</em></span>
          <input v-model.trim="form.category" placeholder="输入或选择分类" />
        </label>
        <div class="category-bar upload-categories">
          <button
            v-for="category in categories.slice(1)"
            :key="category"
            type="button"
            :class="{ active: form.category === category }"
            @click="form.category = category"
          >
            {{ category }}
          </button>
        </div>

        <div class="upload-divider"></div>
        <div class="upload-step-head">
          <span>03</span>
          <div><h3>歌曲文件</h3><p>音频保存在服务器目录，MongoDB 仅记录访问路径</p></div>
        </div>

        <div class="upload-files">
          <label class="file-drop" :class="{ selected: form.music }">
            <span class="file-icon"><AppIcon name="music" :size="25" /></span>
            <strong>音乐文件 <em>必填</em></strong>
            <small>{{ form.music ? form.music.name : '点击选择音频文件' }}</small>
            <span v-if="form.music" class="file-size">{{ formatFileSize(form.music.size) }}</span>
            <input ref="musicInputRef" accept="audio/*" type="file" @change="handleMusicFile" />
          </label>
          <label class="file-drop" :class="{ selected: form.cover }">
            <span class="file-icon"><AppIcon name="image" :size="24" /></span>
            <strong>封面图片 <em class="optional">可选</em></strong>
            <small>{{ form.cover ? form.cover.name : '点击选择封面图片' }}</small>
            <span v-if="form.cover" class="file-size">{{ formatFileSize(form.cover.size) }}</span>
            <input ref="coverInputRef" accept="image/*" type="file" @change="handleCoverFile" />
          </label>
        </div>

        <div class="upload-actions">
          <button type="submit" :disabled="loading || !ready">
            <span v-if="loading" class="button-spinner"></span>
            {{ loading ? '正在上传...' : '发布到资料库' }}
          </button>
          <button class="secondary" type="button" :disabled="loading" @click="reset">重置内容</button>
        </div>
      </div>

      <aside class="upload-preview" :class="{ ready }">
        <div class="preview-label"><span>发布预览</span><strong>{{ ready ? 'READY' : 'DRAFT' }}</strong></div>
        <div class="preview-cover large">
          <img v-if="coverPreviewUrl" :src="coverPreviewUrl" alt="" />
          <span v-else><AppIcon name="music" :size="64" /></span>
        </div>
        <div class="preview-meta">
          <h3>{{ form.title || '新歌曲标题' }}</h3>
          <p>{{ form.singer || '待填写歌手' }} · {{ form.album || '未命名专辑' }}</p>
          <span>{{ form.category || '其他' }}</span>
        </div>
        <div class="upload-checklist">
          <div :class="{ done: form.title }"><span>{{ form.title ? '✓' : '○' }}</span>歌曲名称</div>
          <div :class="{ done: form.singer }"><span>{{ form.singer ? '✓' : '○' }}</span>歌手</div>
          <div :class="{ done: form.music }"><span>{{ form.music ? '✓' : '○' }}</span>音乐文件</div>
          <div :class="{ done: form.cover }"><span>{{ form.cover ? '✓' : '○' }}</span>封面图片（可选）</div>
        </div>
      </aside>
    </form>
  </section>
</template>
