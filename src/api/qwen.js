// chatApi.js
import OpenAI from "openai";

// ✅ 初始化（建议只初始化一次）
const openai = new OpenAI({
  apiKey: "sk-77aee8a61cab46a18ab2ba7487223716", // ⚠️ 建议放后端
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  dangerouslyAllowBrowser: true
});

// ✅ 非遗列表
const heritageList = `
[
  { "index": 1, "name": "rabbit" },
  { "index": 2, "name": "lion" }
]
`;

// ✅ system prompt（固定）
const systemPrompt = `
你是一个“非物质文化遗产讲解员”，性格亲切自然，像导游一样和用户聊天。

非遗列表：
${heritageList}

你必须返回 JSON：
{
  "message": "对话内容",
  "isShowModel": false,
  "modelIndex": 0
}

规则：
- 正常介绍：isShowModel=false
- 询问是否展示：isShowModel=false
- 用户同意：isShowModel=true + 正确 index
- 只输出 JSON
`;

/**
 * ✅ 核心函数（对外暴露）
 * @param {Array} historyMessages - 聊天历史
 * @param {string} userInput - 用户输入
 * @returns {Promise<{message: string, isShowModel: boolean, modelIndex: number}>}
 */
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

    const content = completion.choices[0].message.content;

    // ✅ 解析 JSON（带兜底）
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      // ❗防止AI偶尔乱格式
      data = {
        message: content,
        isShowModel: false,
        modelIndex: 0
      };
    }

    return data;

  } catch (error) {
    console.error("AI调用失败:", error);

    return {
      message: "系统有点问题，我们稍后再试～",
      isShowModel: false,
      modelIndex: 0
    };
  }
}