<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">绣</div>
        <h1>个人中心</h1>
        <p>{{ user?.username || '' }}</p>
      </div>

      <!-- 修改密码 -->
      <form @submit.prevent="handleChangePwd" class="login-form">
        <h3 style="margin:0 0 16px;color:#3d1f0a;font-size:16px;">🔒 修改密码</h3>
        <div class="form-field">
          <label>旧密码</label>
          <input v-model="form.oldPassword" type="password" placeholder="请输入当前密码" required autocomplete="current-password" />
        </div>
        <div class="form-field">
          <label>新密码</label>
          <input v-model="form.newPassword" type="password" placeholder="至少 6 位" required minlength="6" autocomplete="new-password" />
        </div>
        <div class="form-field">
          <label>确认新密码</label>
          <input v-model="form.confirmPassword" type="password" placeholder="请再次输入新密码" required minlength="6" />
          <p v-if="pwdMismatch" class="field-hint-error">两次输入不一致</p>
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <p v-if="success" class="login-success">{{ success }}</p>
        <button type="submit" class="login-btn" :disabled="submitting">
          {{ submitting ? '请稍候...' : '修改密码' }}
        </button>
      </form>

      <p class="login-toggle">
        <router-link to="/">← 返回首页</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { authAPI } from '../api/client.js'

const router = useRouter()
const { user, logout } = useAuth()

const error = ref('')
const success = ref('')
const submitting = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const pwdMismatch = computed(() =>
  form.confirmPassword && form.newPassword !== form.confirmPassword
)

async function handleChangePwd() {
  error.value = ''
  success.value = ''

  if (form.newPassword !== form.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }
  if (!user.value) {
    router.push('/login')
    return
  }

  submitting.value = true
  try {
    await authAPI.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    success.value = '密码修改成功'
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,#faf6ef 0%,#f0e6d0 50%,#e8d5b8 100%);
}
.login-card {
  background:#fff; border-radius:24px; padding:40px 36px; width:100%; max-width:420px;
  box-shadow:0 8px 36px rgba(92,61,32,0.12); border:1px solid #ede3d0;
}
.login-header { text-align:center; margin-bottom:24px; }
.login-logo {
  width:48px; height:48px; background:#c0392b; color:white; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:20px; font-weight:bold; margin:0 auto 12px;
}
.login-header h1 { font-size:22px; color:#3d1f0a; margin:0 0 4px; }
.login-header p { font-size:14px; color:#9a7d64; margin:0; }
.form-field { margin-bottom:16px; }
.form-field label { display:block; font-size:13px; font-weight:600; color:#5c3d20; margin-bottom:6px; }
.form-field input {
  width:100%; padding:12px 14px; border:1px solid #e2d5c3; border-radius:10px;
  font-size:15px; color:#3d1f0a; background:#faf8f3;
  transition:border-color .2s; outline:none; box-sizing:border-box;
}
.form-field input:focus { border-color:#c9984a; box-shadow:0 0 0 3px rgba(201,152,74,.12); }
.field-hint-error { color:#c0392b; font-size:12px; margin:4px 0 0; }
.login-error { color:#c0392b; font-size:13px; margin:-4px 0 12px; text-align:center; }
.login-success { color:#2e7d32; font-size:13px; margin:-4px 0 12px; text-align:center; }
.login-btn {
  width:100%; padding:13px; background:#c0392b; color:white; border:none;
  border-radius:10px; font-size:16px; font-weight:600; cursor:pointer; transition:background .2s;
}
.login-btn:hover { background:#922b21; }
.login-btn:disabled { opacity:.6; cursor:not-allowed; }
.login-toggle { text-align:center; margin-top:20px; font-size:14px; }
.login-toggle a { color:#9a7d64; text-decoration:none; }
.login-toggle a:hover { color:#c0392b; }
</style>
