// qwen.js
import OpenAI from "openai";
import { heritageListJSON } from "../utils/models.js";

const openai = new OpenAI({
  apiKey: "sk-bb2f9a5781d247568259cb014695d29a",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  dangerouslyAllowBrowser: true
});

// API Key 单独保存，供图片生成接口直接使用（不走 OpenAI SDK）
const DASHSCOPE_KEY = "sk-bb2f9a5781d247568259cb014695d29a";

const systemPrompt = `
你是"绫韵"，刺绣文化数字人讲解员。只回答刺绣相关问题（历史、四大名绣、苗绣、针法、工具、非遗保护）。非刺绣话题请礼貌拒绝并引导回刺绣。回答亲切专业，100字以内为宜。

你必须严格返回如下格式的 JSON，不要输出任何其他内容：
{
  "message": "对话内容",
  "isGenerateImage": false,
  "imagePrompt": ""
}

isGenerateImage 规则（只有以下情况才设为 true）：
- 用户明确要求"看图""展示""生成图片""画一下"等
- 用户询问某种具体绣品、针法或纹样的视觉样式，图片能显著帮助理解
- 其他正常问答：isGenerateImage=false，imagePrompt 留空字符串

imagePrompt 规则（isGenerateImage=true 时填写）：
- 用中文写，15~30字，描述刺绣主题画面
- 格式示例："中国传统苏绣，精细丝线刺绣，牡丹花卉图案，金丝底布，工笔风格"
- 只输出 JSON，不要有任何前缀、后缀或 markdown 代码块
`;

// ─────────────────────────────────────────────
// 图片生成：调用通义万相 wanx2.1-t2i-turbo
// 采用「提交任务 → 轮询结果」的异步模式
// 返回图片 URL 字符串，失败则返回 null
// ─────────────────────────────────────────────
export async function generateImage(prompt) {
  // 使用 compatible-mode 端点，与聊天 API 同源，避免 CORS 问题
  // DashScope compatible-mode 的图片生成接口兼容 OpenAI images.generate 格式
  const IMAGES_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/images/generations";

  try {
    const res = await fetch(IMAGES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DASHSCOPE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "wanx2.1-t2i-turbo",
        prompt,
        n: 1,
        size: "512x512"    // compatible-mode 用 x 分隔，原生 API 用 *
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("生图请求失败:", res.status, errText);
      return null;
    }

    const json = await res.json();

    // compatible-mode 同步返回：data[0].url
    const url = json?.data?.[0]?.url;
    if (url) {
      console.log("✅ 图片生成成功:", url);
      return url;
    }

    // 部分版本返回异步 task_id，兜底轮询
    const taskId = json?.output?.task_id;
    if (!taskId) {
      console.error("未获取到图片 URL 或 task_id:", json);
      return null;
    }

    // ── 异步兜底：轮询任务结果 ──────────────
    console.log("图片生成为异步模式，开始轮询 task:", taskId);
    const QUERY_BASE = "https://dashscope.aliyuncs.com/api/v1/tasks/";
    const MAX_POLLS = 20;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const pollRes  = await fetch(QUERY_BASE + taskId, {
          headers: { "Authorization": `Bearer ${DASHSCOPE_KEY}` }
        });
        const pollJson = await pollRes.json();
        const status   = pollJson?.output?.task_status;
        if (status === "SUCCEEDED") {
          const pollUrl = pollJson?.output?.results?.[0]?.url;
          if (pollUrl) return pollUrl;
        } else if (status === "FAILED") {
          console.error("生图任务失败:", pollJson);
          return null;
        }
      } catch (e) {
        console.error("轮询出错:", e);
        return null;
      }
    }
    console.warn("生图超时（60s）");
    return null;

  } catch (err) {
    console.error("generateImage 调用异常:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// 流式调用：返回 AsyncGenerator
// 每次 yield { __done: false, __message } 传递增量文字
// 结束时 yield { __done: true, message, isGenerateImage, imagePrompt }
// ─────────────────────────────────────────────
export async function* chatWithAIStream(historyMessages = [], userInput) {
  // ── 单次非流式调用 ───────────────────────────────────────────────────────
  // appendAIStream 内部本来就是"收完全部 token 再打字"，流式对用户体验无实际提升
  // 改为非流式可以直接用 response_format:json_object，彻底解决 JSON 解析问题
  // ──────────────────────────────────────────────────────────────────────────
  const messages = [
    ...historyMessages,
    { role: "user", content: userInput }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "qwen-turbo",
      messages,
      stream: false,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("[qwen] 原始返回:", raw);

    let data;
    try {
      data = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
    } catch (e) {
      console.warn("[qwen] JSON解析失败，原文:", raw);
      // 兜底：把原文当 message
      data = { message: raw || "我刚才走神了，你说什么来着？", isGenerateImage: false, imagePrompt: "" };
    }

    const message         = typeof data.message       === "string"  ? data.message       : "";
    const isGenerateImage = data.isGenerateImage === true;
    const imagePrompt     = typeof data.imagePrompt   === "string"  ? data.imagePrompt   : "";
    const modelIndex      = typeof data.modelIndex    === "number"  ? data.modelIndex    : 0;
    const isShowModel     = data.isShowModel === true;

    console.log("[qwen] 解析结果:", { message, isGenerateImage, imagePrompt });

    // 逐字 yield，供 appendAIStream 收集（与原流式接口兼容）
    for (const ch of message) {
      yield { __done: false, __message: ch };
    }

    yield { __done: true, message, isGenerateImage, imagePrompt, modelIndex, isShowModel };

  } catch (error) {
    console.error("[qwen] API调用失败:", error);
    const fallbackMsg = "系统有点问题，我们稍后再试～";
    for (const ch of fallbackMsg) {
      yield { __done: false, __message: ch };
    }
    yield { __done: true, message: fallbackMsg, isGenerateImage: false, imagePrompt: "", modelIndex: 0, isShowModel: false };
  }
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
    const raw     = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      data = { message: cleaned || "我刚才走神了，你说什么来着？", isGenerateImage: false, imagePrompt: "" };
    }
    if (typeof data.isGenerateImage !== "boolean") data.isGenerateImage = false;
    if (typeof data.imagePrompt     !== "string")  data.imagePrompt     = "";
    if (typeof data.modelIndex      !== "number")  data.modelIndex      = 0;
    return data;
  } catch (error) {
    console.error("AI 调用失败:", error);
    return { message: "系统有点问题，我们稍后再试～", isGenerateImage: false, imagePrompt: "" };
  }
}