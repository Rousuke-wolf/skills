import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'data.db')

const db = new Database(dbPath)

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── 初始化数据库表 ──
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      avatar      TEXT    DEFAULT NULL,
      role        TEXT    DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT    NOT NULL,
      code        TEXT    NOT NULL,
      used        INTEGER DEFAULT 0,
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_verifications_email_code ON email_verifications(email, code);
    CREATE INDEX IF NOT EXISTS idx_verifications_expires ON email_verifications(expires_at);
  `)

  console.log('✅ SQLite 数据库初始化完成: ' + dbPath)
}

// ── 便捷查询方法（兼容原 MySQL query 接口）──
// 返回 [rows] 格式，与原 mysql2 的 pool.execute(sql, params) 一致
export function query(sql, params = []) {
  // 将 MySQL 风格的 ? 占位符转换为 SQLite 风格（两者相同，保留）
  // 将 MySQL 特定的日期函数转为 SQLite
  const converted = sql
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*(\d+)\s*MINUTE\)/gi,
      (_, min) => `datetime('now', '+${min} minutes')`)

  const isSelect = converted.trim().toUpperCase().startsWith('SELECT')
   || converted.trim().toUpperCase().startsWith('WITH')

  try {
    if (isSelect) {
      const rows = db.prepare(converted).all(...params)
      return [rows]
    } else {
      const result = db.prepare(converted).run(...params)
      // 兼容 mysql2 返回格式: [result] 其中 result 包含 insertId
      return [{ insertId: result.lastInsertRowid, changes: result.changes }]
    }
  } catch (err) {
    console.error('[db] SQL 错误:', err.message)
    console.error('[db] SQL:', converted)
    console.error('[db] Params:', params)
    throw err
  }
}

export default db
