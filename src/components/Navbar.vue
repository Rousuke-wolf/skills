<template>
  <div class="navbar">
    <router-link to="/" class="nav-logo">
      <div class="nav-logo-icon">绣</div>
      <span class="nav-logo-text">智传非遗</span>
    </router-link>
    <div class="nav-center">
      <router-link
        v-for="tab in tabs"
        :key="tab.id"
        :to="tab.path"
        class="nav-tab"
        active-class="active"
      >{{ tab.label }}</router-link>
    </div>
    <div class="nav-right">
      <router-link to="/teaching" class="nav-cta-btn">刺绣教学模式</router-link>
    </div>
  </div>
</template>

<script setup>
const tabs = [
  { id: 'home',     path: '/',          label: '首页' },
  { id: 'culture',  path: '/culture',   label: '刺绣文化' },
  { id: 'teaching', path: '/teaching',  label: '教学体验' },
  { id: '3d',       path: '/3d',        label: '3D展厅' },
  { id: 'about',    path: '/about',     label: '关于我们' },
]
</script>
