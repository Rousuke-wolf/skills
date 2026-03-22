import { chatWithAI } from "./api/qwen";
import { speak, stop } from "./tts.js";

let chatHistoryData = [];

// ─────────────────────────────────────────────
// 模型切换 → 切换到非遗展陈 tab
// ─────────────────────────────────────────────
function handleModelDisplay(index) {
    if (typeof window.switchTab === "function") {
        window.switchTab("3d", index);
    }
}

function showModelError(message) {
    const canvas = document.getElementById("live2d");
    if (!canvas?.parentElement) return;
    const container = canvas.parentElement;
    container.querySelector(".live2d-error-message")?.remove();
    const el = document.createElement("div");
    el.className = "live2d-error-message";
    el.style.cssText = `
    color:#fbbf24;text-align:center;padding:20px;
    background:rgba(0,0,0,0.8);border-radius:10px;
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);width:80%;
    z-index:100;border:1px solid #fbbf24;line-height:1.6;
  `;
    el.innerHTML = `<div style="font-size:18px;">❌ ${message}</div>`;
    container.appendChild(el);
}

// ─────────────────────────────────────────────
// 情绪切换
// ─────────────────────────────────────────────
window.setEmotion = function (emotion) {
    document.querySelectorAll(".emotion-btn").forEach(btn => {
        btn.classList.remove("active");
        const t = btn.innerText;
        if (
            (emotion === "happy" && t.includes("开心")) ||
            (emotion === "peace" && t.includes("平静")) ||
            (emotion === "thoughtful" && t.includes("思考")) ||
            (emotion === "surprised" && t.includes("惊讶")) ||
            (emotion === "gentle" && t.includes("温柔"))
        ) btn.classList.add("active");
    });
    if (window.live2dModel) {
        try {
            const map = { happy: "exp_01", peace: "exp_02", thoughtful: "exp_03", surprised: "exp_04", gentle: "exp_05" };
            window.live2dModel.expression(map[emotion]);
        } catch (e) { console.warn("表情切换失败:", e); }
    }
};

// ─────────────────────────────────────────────
// 快捷提问
// ─────────────────────────────────────────────
window.quickQuestion = function (question) {
    const history = document.getElementById("chatHistory");
    if (!history) return;
    appendUser(question);
    (async () => {
        const res = await chatWithAI(chatHistoryData, question);
        chatHistoryData.push({ role: "user", content: question });
        chatHistoryData.push({ role: "assistant", content: res.message });
        appendAI(res.message);
        if (res.isShowModel) handleModelDisplay(res.modelIndex);
    })();
};

// ─────────────────────────────────────────────
// 消息气泡
// ─────────────────────────────────────────────
function appendUser(text) {
    const el = document.getElementById("chatHistory");
    if (!el) return;
    const div = document.createElement("div");
    div.className = "message user";
    div.innerText = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function appendAI(text) {
    const el = document.getElementById("chatHistory");
    if (!el) return;
    const div = document.createElement("div");
    div.className = "message ai";
    div.innerText = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    speak(text); // ← 使用 CosyVoice
}

// ─────────────────────────────────────────────
// 语音识别
// ─────────────────────────────────────────────
let recognition;
let recognizing = false;

function initRecognition(voiceStatus) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { voiceStatus.innerText = "当前浏览器不支持语音识别"; return null; }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => { recognizing = true; voiceStatus.innerText = "正在听..."; };
    rec.onend = () => { recognizing = false; voiceStatus.innerText = "语音结束"; };
    rec.onerror = (e) => { recognizing = false; voiceStatus.innerText = "语音识别出错"; console.error(e); };
    rec.onresult = async (e) => {
        const text = e.results[0][0].transcript;
        appendUser(text);
        try {
            const res = await chatWithAI(chatHistoryData, text);
            chatHistoryData.push({ role: "user", content: text });
            chatHistoryData.push({ role: "assistant", content: res.message });
            appendAI(res.message);
            if (res.isShowModel) handleModelDisplay(res.modelIndex);
        } catch (err) {
            console.error("AI调用失败:", err);
            appendAI("刚刚有点问题，我们再试一次吧～");
        }
    };
    return rec;
}

function stopRecognition() {
    if (recognition && recognizing) recognition.stop();
}

// ─────────────────────────────────────────────
// Live2D 初始化（可重复调用）
// ─────────────────────────────────────────────
async function initLive2D() {
    if (window.live2dApp) {
        try { window.live2dApp.destroy(true, { children: true, texture: true }); } catch (e) { }
        window.live2dApp = null;
        window.live2dModel = null;
    }
    try {
        if (typeof PIXI === "undefined") { showModelError("PIXI 库加载失败"); return; }
        if (typeof Live2DCubismCore === "undefined") { showModelError("Cubism Core 未加载"); return; }
        if (!PIXI.live2d?.Live2DModel) { showModelError("Cubism4 插件未正确加载"); return; }

        const canvas = document.getElementById("live2d");
        const container = document.querySelector(".character-3d");
        if (!canvas || !container) { showModelError("找不到 Live2D 显示区域"); return; }

        const app = new PIXI.Application({ view: canvas, resizeTo: container, transparent: true, autoStart: true });
        const model = await PIXI.live2d.Live2DModel.from("..\\public\\model\\hiyori\\hiyori.model3.json");

        window.live2dApp = app;
        window.live2dModel = model;
        app.stage.addChild(model);

        if (model.anchor) model.anchor.set(0.5, 1);
        model.x = app.renderer.width / 2;
        model.y = app.renderer.height * 1.02;
        model.scale.set(0.15);
        model.interactive = true;
        model.on("pointerdown", () => {
            try { model.motion("TapBody"); } catch (e) { }
        });

        window.addEventListener("resize", () => {
            if (!window.live2dModel || !window.live2dApp) return;
            window.live2dModel.x = window.live2dApp.renderer.width / 2;
            window.live2dModel.y = window.live2dApp.renderer.height * 1.02;
            window.live2dModel.scale.set(0.11);
        });

        try { model.expression("exp_01"); } catch (e) { }
        console.log("✅ Live2D 模型加载成功");
    } catch (error) {
        console.error("Live2D 初始化失败:", error);
        showModelError("模型加载失败，请检查控制台报错");
    }
}

// ─────────────────────────────────────────────
// 绑定页面交互事件
// ─────────────────────────────────────────────
function bindEvents() {
    const sendBtn = document.getElementById("sendBtn");
    const input = document.getElementById("textInput");
    const voiceBtn = document.getElementById("voiceChatBtn");
    const appWrapper = document.querySelector(".app-wrapper");
    const voiceUI = document.getElementById("voiceModeUI");
    const startBtn = document.getElementById("startVoice");
    const stopBtn = document.getElementById("stopVoice");
    const backBtn = document.getElementById("backTextChat");
    const voiceStatus = document.getElementById("voiceStatus");
    const playIntroBtn = document.getElementById("playIntroBtn");
    const audioStatus = document.getElementById("audioStatus");
    const modelIntroText = document.getElementById("modelIntroText");

    // 文本发送
    if (sendBtn && input) {
        sendBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;
            appendUser(text);
            input.value = "";
            const res = await chatWithAI(chatHistoryData, text);
            chatHistoryData.push({ role: "user", content: text });
            chatHistoryData.push({ role: "assistant", content: res.message });
            appendAI(res.message);
            if (res.isShowModel) handleModelDisplay(res.modelIndex);
        };
        // 回车发送
        input.onkeydown = (e) => {
            if (e.key === "Enter") sendBtn.onclick();
        };
    }

    // 进入语音模式
    if (voiceBtn && appWrapper && voiceUI && voiceStatus) {
        voiceBtn.onclick = () => {
            appWrapper.classList.add("voice-mode");
            voiceUI.style.display = "flex";
            voiceStatus.innerText = "点击麦克风开始语音聊天";
        };
    }

    // 返回文本模式
    if (backBtn && appWrapper && voiceUI) {
        backBtn.onclick = () => {
            appWrapper.classList.remove("voice-mode");
            voiceUI.style.display = "none";
            stopRecognition();
            stop(); // 停止 TTS
        };
    }

    // 开始语音识别
    if (startBtn && voiceStatus) {
        startBtn.onclick = () => {
            stop(); // 先停掉正在说的话
            if (!recognition) recognition = initRecognition(voiceStatus);
            if (recognition) recognition.start();
        };
    }

    // 停止语音识别
    if (stopBtn) {
        stopBtn.onclick = () => stopRecognition();
    }

    // 展品介绍语音播放按钮
    let introPlaying = false;
    if (playIntroBtn && audioStatus && modelIntroText) {
        playIntroBtn.onclick = async () => {
            if (introPlaying) {
                stop();
                introPlaying = false;
                playIntroBtn.classList.remove("playing");
                playIntroBtn.innerHTML = "🎤";
                audioStatus.innerText = "";
                return;
            }

            const text = modelIntroText.innerText.trim();
            if (!text) return;

            introPlaying = true;
            playIntroBtn.classList.add("playing");
            playIntroBtn.innerHTML = "■";
            audioStatus.innerText = "正在播放讲解，点击按钮可停止";

            await speak(text);

            introPlaying = false;
            playIntroBtn.classList.remove("playing");
            playIntroBtn.innerHTML = "🎤";
            audioStatus.innerText = "";
        };
    }
}

// ─────────────────────────────────────────────
// 供 main.js 在每次 renderApp 后调用
// ─────────────────────────────────────────────
window.__rebindScriptEvents = function () {
    bindEvents();
    window.setEmotion("happy");
    initLive2D();
};

// ─────────────────────────────────────────────
// 首次页面加载
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    window.setEmotion("happy");
    initLive2D();
    console.log("✅ 页面初始化完成");
});