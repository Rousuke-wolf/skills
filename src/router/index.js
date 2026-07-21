import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',             name: 'home',     component: () => import('../pages/HomePage.vue') },
  { path: '/culture',      name: 'culture',  component: () => import('../pages/CulturePage.vue') },
  { path: '/teaching',     name: 'teaching', component: () => import('../pages/TeachingPage.vue') },
  { path: '/3d',           name: '3d',       component: () => import('../pages/Show3DPage.vue') },
  { path: '/about',        name: 'about',    component: () => import('../pages/AboutPage.vue') },
  { path: '/login',        name: 'login',    component: () => import('../pages/LoginPage.vue') },
  { path: '/profile',      name: 'profile',  component: () => import('../pages/ProfilePage.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
  }
  next()
})

export default router
