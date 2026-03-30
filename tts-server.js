import http from "http";
import { WebSocket } from "ws";
import { randomUUID } from "crypto";

// 👉【新增：数据库依赖】
import mysql from "mysql2/promise";

const API_KEY = "sk-77aee8a61cab46a18ab2ba7487223716";
const WS_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference";
const PORT = 3001;

const VOICE = "longling_v2";
const MODEL = "cosyvoice-v2";

// 👉【新增：数据库配置】
const DB_CONFIG = {
  host: "localhost",
  user: "root",
  password: "@Hcj10086",
  database: "cixiu_shujuku",
  charset: "utf8mb4"
};

// 👉【新增：数据库查询函数】
async function queryFromDB(question) {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    let [rows] = [];

    if (question.match(/苏绣|湘绣|蜀绣|粤绣|苗绣|京绣|鲁绣|汴绣|瑶绣|侗绣/)) {
      const k = question.match(/苏绣|湘绣|蜀绣|粤绣|苗绣|京绣|鲁绣|汴绣|瑶绣|侗绣/)[0];
      [rows] = await conn.execute("SELECT * FROM school WHERE name LIKE ?", [`%${k}%`]);
    } else if (question.includes("针法")) {
      [rows] = await conn.execute("SELECT * FROM stitch WHERE name LIKE ?", [`%${question}%`]);
    } else if (question.includes("纹样")) {
      [rows] = await conn.execute("SELECT * FROM pattern WHERE name LIKE ?", [`%${question}%`]);
    } else if (question.includes("作品")) {
      [rows] = await conn.execute("SELECT * FROM work WHERE title LIKE ?", [`%${question}%`]);
    } else {
      return "";
    }
    return rows?.length ? JSON.stringify(rows, null, 2) : "";
  } catch (err) {
    return "";
  } finally {
    if (conn) await conn.end();
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST" || req.url !== "/tts") {
    res.writeHead(404); res.end("Not found"); return;
  }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", async () => {  // 👉【新增：async】
    let text, volume, rate;
    try {
      ({ text, volume, rate } = JSON.parse(body));
    } catch {
      res.writeHead(400); res.end("Bad request"); return;
    }

    // 👉【新增：查询数据库】
    const dbInfo = await queryFromDB(text);

    // 👉【新增：拼接知识库 + 用户问题】
    const finalText = dbInfo
      ? `根据非遗知识库：${dbInfo}。请用自然口语回答：${text}`
      : text;

    const useVolume = (volume !== undefined) ? Number(volume) : 50;
    const useRate   = (rate   !== undefined) ? Number(rate)   : 1.2;

    const taskId = randomUUID();

    const ws = new WebSocket(WS_URL, {
      headers: { Authorization: `bearer ${API_KEY}` }
    });

    ws.on("open", () => {
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      });

      ws.send(JSON.stringify({
        header: { action: "run-task", task_id: taskId, streaming: "duplex" },
        payload: {
          task_group: "audio",
          task: "tts",
          function: "SpeechSynthesizer",
          model: MODEL,
          parameters: {
            voice: VOICE,
            format: "mp3",
            sample_rate: 22050,
            volume: useVolume,
            rate: useRate,
            pitch: 1.0
          },
          input: {}
        }
      }));

      ws.send(JSON.stringify({
        header: { action: "continue-task", task_id: taskId },
        payload: { input: {
          // 👉【修改：把 text 换成 finalText】
          text: finalText
        }}
      }));

      ws.send(JSON.stringify({
        header: { action: "finish-task", task_id: taskId },
        payload: { input: {} }
      }));
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        res.write(data);
      } else {
        const msg = JSON.parse(data.toString());
        if (msg.header?.event === "task-failed") {
          console.error("[TTS] 失败:", msg.header.error_code, msg.header.error_message);
        }
      }
    });

    ws.on("close", () => res.end());

    ws.on("error", (err) => {
      console.error("[TTS] WebSocket 错误:", err.message);
      if (!res.headersSent) { res.writeHead(500); }
      res.end();
    });
  });
});

server.listen(PORT, () => {
  console.log(`✅ TTS 代理服务已启动：http://localhost:${PORT}/tts`);
  console.log(`   音色：${VOICE}，模型：${MODEL}`);
});