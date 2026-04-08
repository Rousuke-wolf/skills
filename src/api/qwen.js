// qwen.js
import OpenAI from "openai";
import { heritageListJSON } from "../utils/models.js";

const openai = new OpenAI({
  apiKey: "sk-77aee8a61cab46a18ab2ba7487223716",
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

  try {
    const stream = await openai.chat.completions.create({
      model: "qwen3-30b-a3b",
      messages,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        yield { __done: false, delta };
      }
    }
  } catch (error) {
    console.error("AI 流式调用失败:", error);
    const fallback = JSON.stringify({
      message: "系统有点问题，我们稍后再试～",
      isShowModel: false,
      modelIndex: 0
    });
    fullText = fallback;
    yield { __done: false, delta: fallback };
  }

  // 流结束后解析完整 JSON
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
      model: "qwen3-30b-a3b",
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
