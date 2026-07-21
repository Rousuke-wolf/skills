import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  // 未配置 SMTP 则不可用
  if (!host || !user || !pass) {
    console.warn('[email] SMTP 未配置，验证码功能禁用。请在 .env 中设置 SMTP_HOST / SMTP_USER / SMTP_PASS')
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user, pass },
  })

  console.log(`[email] SMTP 已配置: ${user}`)
  return transporter
}

// SMTP 测试连接
export async function testSmtpConnection() {
  const t = getTransporter()
  if (!t) return { ok: false, message: 'SMTP 未配置' }
  try {
    await t.verify()
    return { ok: true, message: 'SMTP 连接成功' }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

// 发送验证码邮件
export async function sendVerificationCode(toEmail, code) {
  const t = getTransporter()
  if (!t) throw new Error('邮件服务未配置')

  await t.sendMail({
    from: process.env.SMTP_USER,
    to: toEmail,
    subject: '邮箱验证码 — 智传非遗',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px 24px;
                  font-family:'Microsoft YaHei',sans-serif;background:#faf6ef;
                  border-radius:16px;border:1px solid #ede3d0;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="display:inline-block;width:44px;height:44px;
                       background:#c0392b;color:white;border-radius:11px;
                       line-height:44px;font-size:18px;font-weight:bold;">绣</span>
          <h2 style="margin:8px 0 0;color:#3d1f0a;">智传非遗</h2>
        </div>
        <p style="color:#5c3d20;font-size:15px;">您好，感谢注册智传非遗！</p>
        <p style="color:#5c3d20;font-size:15px;">您的验证码是：</p>
        <div style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;font-size:28px;font-weight:700;
                       letter-spacing:6px;color:#c0392b;background:#fff;
                       padding:12px 28px;border-radius:10px;
                       border:1px dashed #c9984a;">${code}</span>
        </div>
        <p style="color:#9a7d64;font-size:13px;">验证码 5 分钟内有效，请勿转发给他人。</p>
        <hr style="border:none;border-top:1px solid #ede3d0;margin:20px 0;">
        <p style="color:#b0907a;font-size:12px;text-align:center;">
          如果这不是您的操作，请忽略此邮件。
        </p>
      </div>
    `,
  })
}

// 检查邮件服务是否可用
export function isEmailAvailable() {
  return getTransporter() !== null
}
