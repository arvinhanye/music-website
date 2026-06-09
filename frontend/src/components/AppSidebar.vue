<script setup>
import AppIcon from './AppIcon.vue';

defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTab: {
    type: String,
    required: true
  },
  isLoggedIn: {
    type: Boolean,
    required: true
  },
  accountInitial: {
    type: String,
    default: ''
  }
});

defineEmits(['select-tab', 'open-account']);
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="app-mark"><AppIcon name="music" :size="24" /></div>
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
        :aria-current="activeTab === tab.key ? 'page' : undefined"
        type="button"
        @click="$emit('select-tab', tab)"
      >
        <span><AppIcon :name="tab.icon" :size="16" /></span>
        {{ tab.label }}
      </button>
    </nav>
  </header>

  <button class="account-trigger" type="button" title="账户" @click="$emit('open-account')">
    <span v-if="isLoggedIn">{{ accountInitial }}</span>
    <span v-else><AppIcon name="user" :size="17" /></span>
  </button>
</template>
