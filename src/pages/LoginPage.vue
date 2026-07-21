<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">绣</div>
        <h1>智传非遗</h1>
        <p>{{ isForgot ? '重置密码' : (isRegister ? '创建账号' : '欢迎回来') }}</p>
      </div>

      <!-- ══ 登录模式切换（仅登录时显示）══ -->
      <div v-if="!isRegister && !isForgot" class="login-mode-tabs">
        <button
          :class="['mode-tab', { active: loginMode === 'password' }]"
          @click="switchMode('password')"
        >密码登录</button>
        <button
          :class="['mode-tab', { active: loginMode === 'code' }]"
          @click="switchMode('code')"
        >验证码登录</button>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <!-- ══ 用户名（仅注册）══ -->
        <div v-if="isRegister" class="form-field">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="至少 2 个字符" required minlength="2" autocomplete="username" />
        </div>

        <!-- ══ 邮箱 ══ -->
        <div class="form-field">
          <label>邮箱</label>
          <div class="email-row">
            <input
              v-model="form.email"
              type="email"
              placeholder="请输入邮箱"
              required
              autocomplete="email"
            />
            <!-- 需要验证码时显示发送按钮 -->
            <button
              v-if="showSendCode"
              type="button"
              class="send-code-btn"
              :disabled="codeCountdown > 0"
              @click="handleSendCode"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s` : '发送验证码' }}
            </button>
          </div>
        </div>

        <!-- ══ 验证码（注册 或 验证码登录）══ -->
        <div v-if="showSendCode" class="form-field">
          <label>验证码</label>
          <input
            v-model="form.code"
            type="text"
            placeholder="请输入 6 位验证码"
            maxlength="6"
            required
            autocomplete="one-time-code"
            inputmode="numeric"
          />
        </div>

        <!-- ══ 密码（密码登录 / 注册 / 忘记密码）══ -->
        <div v-if="showPassword" class="form-field">
          <label>{{ isForgot ? '新密码' : (isRegister ? '设置密码' : '密码') }}</label>
          <input v-model="form.password" type="password" placeholder="至少 6 位" required minlength="6" autocomplete="new-password" />
          <!-- 密码登录模式下：忘记密码链接 -->
          <p v-if="!isRegister && !isForgot && loginMode === 'password'" class="forgot-link">
            <a href="#" @click.prevent="startForgot">忘记密码？</a>
          </p>
        </div>

        <!-- ══ 确认密码（注册 或 忘记密码）══ -->
        <div v-if="isRegister || isForgot" class="form-field">
          <label>确认密码</label>
          <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" required minlength="6" autocomplete="new-password" />
          <p v-if="passwordMismatch" class="field-hint-error">两次输入的密码不一致</p>
        </div>

        <!-- 提示信息 -->
        <p v-if="error" class="login-error">{{ error }}</p>
        <p v-if="successMsg" class="login-success">{{ successMsg }}</p>

        <button type="submit" class="login-btn" :disabled="submitting">
          {{ submitting ? '请稍候...' : submitLabel }}
        </button>
      </form>

      <p class="login-toggle">
        <template v-if="isForgot">
          <a href="#" @click.prevent="cancelForgot">← 返回登录</a>
        </template>
        <template v-else>
          {{ isRegister ? '已有账号？' : '没有账号？' }}
          <a href="#" @click.prevent="toggleRegister">{{ isRegister ? '去登录' : '去注册' }}</a>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { authAPI } from '../api/client.js'

const router = useRouter()
const route = useRoute()
const { login, register } = useAuth()

const isRegister = ref(false)
const isForgot = ref(false)
const loginMode = ref('password')   // 'password' | 'code'
const error = ref('')
const successMsg = ref('')
const submitting = ref(false)
const codeCountdown = ref(0)
let countdownTimer = null

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  code: '',
})

// ── 显示哪些字段 ──
const showSendCode = computed(() => isRegister.value || isForgot.value || loginMode.value === 'code')
const showPassword = computed(() => isRegister.value || isForgot.value || loginMode.value === 'password')
const passwordMismatch = computed(() =>
  (isRegister.value || isForgot.value) && form.confirmPassword && form.password !== form.confirmPassword
)
const submitLabel  = computed(() => {
  if (isForgot.value) return '重置密码'
  if (isRegister.value) return '注册'
  return loginMode.value === 'code' ? '验证并登录' : '登录'
})

// ── 入口 ──
onMounted(() => {
  if (route.query.mode === 'register') isRegister.value = true
})

// ── 切换登录模式 ──
function switchMode(mode) {
  loginMode.value = mode
  error.value = ''
  successMsg.value = ''
  form.code = ''
  form.password = ''
}

// ── 切换注册/登录 ──
function toggleRegister() {
  isRegister.value = !isRegister.value
  isForgot.value = false
  loginMode.value = 'password'
  resetForm()
}

// ── 忘记密码 ──
function startForgot() {
  isForgot.value = true
  isRegister.value = false
  error.value = ''
  successMsg.value = ''
  // 保留当前 email 方便用户
  form.code = ''
  form.password = ''
  form.confirmPassword = ''
}

function cancelForgot() {
  isForgot.value = false
  loginMode.value = 'password'
  resetForm()
}

function resetForm() {
  error.value = ''
  successMsg.value = ''
  form.email = ''
  form.password = ''
  form.confirmPassword = ''
  form.username = ''
  form.code = ''
  codeCountdown.value = 0
  clearInterval(countdownTimer)
}

// ── 发送验证码 ──
async function handleSendCode() {
  error.value = ''
  successMsg.value = ''

  if (!form.email) { error.value = '请先输入邮箱'; return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { error.value = '邮箱格式不正确'; return }

  try {
    const purpose = isRegister.value ? 'register' : isForgot.value ? 'reset' : 'login'
    const result = await authAPI.sendCode({ email: form.email, purpose })

    // 开发模式：直接展示验证码
    if (result.devCode) {
      successMsg.value = `🔧 开发模式 — 验证码: ${result.devCode}（5 分钟内有效）`
      form.code = result.devCode  // 自动填入
    } else {
      successMsg.value = '验证码已发送，请查收邮件'
    }
    codeCountdown.value = 60
    clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) clearInterval(countdownTimer)
    }, 1000)
  } catch (err) {
    // 限流 → 解析剩余秒数，开始倒计时
    const match = err.message.match(/(\d+)\s*秒/)
    if (match) {
      const remain = parseInt(match[1])
      codeCountdown.value = remain
      clearInterval(countdownTimer)
      countdownTimer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) clearInterval(countdownTimer)
      }, 1000)
      // 不显示错误文字，按钮上倒计时就是提示
    } else {
      error.value = err.message
    }
  }
}

// ── 提交 ──
async function handleSubmit() {
  error.value = ''
  successMsg.value = ''
  submitting.value = true

  try {
    if (isForgot.value) {
      if (form.password !== form.confirmPassword) {
        error.value = '两次输入的密码不一致'
        submitting.value = false
        return
      }
      await authAPI.resetPassword({ email: form.email, code: form.code, password: form.password })
      successMsg.value = '密码重置成功，请使用新密码登录'
      setTimeout(() => cancelForgot(), 1500)
      submitting.value = false
      return
    }
    if (isRegister.value) {
      if (form.password !== form.confirmPassword) {
        error.value = '两次输入的密码不一致'
        submitting.value = false
        return
      }
      await register(form.username, form.email, form.password, form.code)
    } else if (loginMode.value === 'code') {
      await login(form.email, form.code, 'code')
    } else {
      await login(form.email, form.password)
    }
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #faf6ef 0%, #f0e6d0 50%, #e8d5b8 100%);
}
.login-card {
  background: #fff;
  border-radius: 24px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 36px rgba(92, 61, 32, 0.12);
  border: 1px solid #ede3d0;
}
.login-header {
  text-align: center;
  margin-bottom: 24px;
}
.login-logo {
  width: 48px; height: 48px;
  background: #c0392b; color: white;
  border-radius: 12px; display: flex;
  align-items: center; justify-content: center;
  font-size: 20px; font-weight: bold;
  margin: 0 auto 12px;
}
.login-header h1 {
  font-size: 22px; color: #3d1f0a; margin: 0 0 4px;
}
.login-header p {
  font-size: 14px; color: #9a7d64; margin: 0;
}

/* ══ 模式切换标签 ══ */
.login-mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border: 1px solid #e2d5c3;
  border-radius: 10px;
  overflow: hidden;
}
.mode-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: #faf8f3;
  color: #9a7d64;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.mode-tab.active {
  background: #c0392b;
  color: white;
  font-weight: 600;
}
.mode-tab:not(.active):hover {
  background: #f0ebe0;
  color: #5c3d20;
}

/* ══ 表单 ══ */
.form-field {
  margin-bottom: 16px;
}
.form-field label {
  display: block;
  font-size: 13px; font-weight: 600; color: #5c3d20; margin-bottom: 6px;
}
.form-field input {
  width: 100%; padding: 12px 14px;
  border: 1px solid #e2d5c3; border-radius: 10px;
  font-size: 15px; color: #3d1f0a; background: #faf8f3;
  transition: border-color 0.2s; outline: none;
  box-sizing: border-box;
}
.form-field input:focus {
  border-color: #c9984a; box-shadow: 0 0 0 3px rgba(201, 152, 74, 0.12);
}

.email-row {
  display: flex; gap: 8px;
}
.email-row input { flex: 1; }
.send-code-btn {
  flex-shrink: 0;
  padding: 0 14px; height: 44px;
  border: 1px solid #c9984a; border-radius: 10px;
  background: #faf6ef; color: #8b6240;
  font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  transition: all 0.2s;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.send-code-btn:hover:not(:disabled) { background: #c9984a; color: white; }
.send-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.login-error {
  color: #c0392b; font-size: 13px; margin: -4px 0 12px; text-align: center;
  white-space: pre-line;
}
.login-success {
  color: #2e7d32; font-size: 13px; margin: -4px 0 12px; text-align: center;
}
.field-hint-error {
  color: #c0392b; font-size: 12px; margin: 4px 0 0; text-align: left;
}
.login-btn {
  width: 100%; padding: 13px;
  background: #c0392b; color: white; border: none;
  border-radius: 10px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
  margin-top: 4px;
}
.login-btn:hover { background: #922b21; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.login-toggle {
  text-align: center; margin-top: 20px; font-size: 14px; color: #9a7d64;
}
.login-toggle a {
  color: #c0392b; text-decoration: none; font-weight: 600; cursor: pointer;
}
.forgot-link {
  margin-top: 6px; text-align: right;
}
.forgot-link a {
  color: #9a7d64; font-size: 13px; text-decoration: none; font-weight: 400;
}
.forgot-link a:hover { color: #c0392b; }
</style>
