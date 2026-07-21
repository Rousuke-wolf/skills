<template>
  <router-view />
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth.js'

const router = useRouter()
const { isLoggedIn, user, checkAuth } = useAuth()

// 启动时恢复登录态
onMounted(async () => {
  await checkAuth()
})

// 每次路由切换后，重新同步导航栏用户状态
// 页面用 v-html 重建 DOM 会导致导航栏回到默认"登录/注册"按钮
router.afterEach(async () => {
  await nextTick()
  await nextTick()   // 双 nextTick 确保 v-html + bindEvents 完成
  if (isLoggedIn.value && user.value?.username) {
    window.updateNavUser?.(user.value.username)
  }
})
</script>
