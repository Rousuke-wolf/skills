// qwen.js
import OpenAI from "openai";
import { heritageListJSON } from "../utils/models.js";

const openai = new OpenAI({
  apiKey: "sk-bb2f9a5781d247568259cb014695d29a",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  dangerouslyAllowBrowser: true
});

const systemPrompt = `
你是一个"非物质文化遗产讲解员"，性格亲切自然，像导游一样和用户聊天。

当前可展示的非遗展品列表（index 从 0 开始）：
${heritageListJSON}

你必须严格返回如下格式的 JSON，不要输出任何其他内容：
{
  "message": "对话内容",
  "isShowModel": false,
  "modelIndex": 0
}

行为规则：
- 正常介绍展品时：isShowModel=false，modelIndex 随便填 0
- 询问用户是否想查看 3D 模型时：isShowModel=false
- 用户明确表示想看 / 展示 / 查看某个展品时：isShowModel=true，modelIndex 填对应展品的 index
- 只输出 JSON，不要有任何前缀、后缀或 markdown 代码块
`;

// ─────────────────────────────────────────────
// 流式调用：返回 AsyncGenerator
// 每次 yield { __done: false, delta } 传递增量文字
// 结束时 yield { __done: true, message, isShowModel, modelIndex }
// ─────────────────────────────────────────────
export async function* chatWithAIStream(historyMessages = [], userInput) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userInput }
  ];

  let fullText = "";

  // ── 流式 JSON 解析状态机 ──────────────────────
  // 目标：一旦检测到 "message": " 开始，就逐字 yield 消息内容
  // 这样打字和 TTS 可以比等全部流结束提前 1~3 秒启动
  // 状态机：BEFORE_MSG → SKIP_SPACE → IN_MSG → AFTER_MSG
  // SKIP_SPACE 兼容 "message":"内容" 和 "message": "内容" 两种格式
  let parseState = "BEFORE_MSG";
  let msgBuffer  = "";
  const MSG_MARKER = '"message":';   // 只匹配到冒号，不含引号
  let escaped = false;

  try {
    const stream = await openai.chat.completions.create({
      model: "qwen-turbo",         // turbo：首 token 最快，无 thinking 开销
      messages,
      stream: true,
      // 若未来切回 qwen3 系列，保留此项可关闭 thinking，避免额外延迟
      // extra_body: { enable_thinking: false }
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      fullText += delta;

      // ── 逐字符扫描，提取 message 字段内容 ────
      for (const ch of delta) {
        if (parseState === "BEFORE_MSG") {
          msgBuffer += ch;
          // 滑动窗口：只保留最后 MSG_MARKER.length 个字符
          if (msgBuffer.length > MSG_MARKER.length) {
            msgBuffer = msgBuffer.slice(-MSG_MARKER.length);
          }
          if (msgBuffer.endsWith(MSG_MARKER)) {
            parseState = "SKIP_SPACE";   // 等待开头的 "，跳过可能的空格
          }

        } else if (parseState === "SKIP_SPACE") {
          // 跳过冒号后的空白，遇到 " 才真正进入内容
          if (ch === '"') {
            parseState = "IN_MSG";
            escaped = false;
          }
          // 其他字符（空格等）继续跳过

        } else if (parseState === "IN_MSG") {
          if (escaped) {
            // 转义字符：原样 yield（简单处理常见转义）
            const unescaped = ch === 'n' ? '\n' : ch === 't' ? '\t' : ch;
            yield { __done: false, __message: unescaped };
            escaped = false;
          } else if (ch === '\\') {
            escaped = true;
          } else if (ch === '"') {
            // message 字段结束
            parseState = "AFTER_MSG";
          } else {
            yield { __done: false, __message: ch };
          }
        }
        // AFTER_MSG：继续读完整 JSON，不再 yield 字符
      }
    }
  } catch (error) {
    console.error("AI 流式调用失败:", error);
    const fallbackMsg = "系统有点问题，我们稍后再试～";
    // 直接逐字 yield fallback，走相同通道
    for (const ch of fallbackMsg) {
      yield { __done: false, __message: ch };
    }
    fullText = JSON.stringify({ message: fallbackMsg, isShowModel: false, modelIndex: 0 });
  }

  // ── 流结束后解析完整 JSON ────────────────────
  const cleaned = fullText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    console.warn("无法解析 JSON：", fullText);
    data = { message: cleaned || "我刚才走神了，你说什么来着？", isShowModel: false, modelIndex: 0 };
  }
  if (typeof data.modelIndex !== "number") data.modelIndex = 0;
  yield { __done: true, ...data };
}

// ─────────────────────────────────────────────
// 保留原非流式接口，兼容其他调用方
// ─────────────────────────────────────────────
export async function chatWithAI(historyMessages = [], userInput) {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userInput }
    ];
    const completion = await openai.chat.completions.create({
      model: "qwen-plus",
      messages
    });
    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      data = { message: cleaned || "我刚才走神了，你说什么来着？", isShowModel: false, modelIndex: 0 };
    }
    if (typeof data.modelIndex !== "number") data.modelIndex = 0;
    return data;
  } catch (error) {
    console.error("AI 调用失败:", error);
    return { message: "系统有点问题，我们稍后再试～", isShowModel: false, modelIndex: 0 };
  }
}