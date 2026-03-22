import { chatWithAI } from "./api/qwen";

let chatHistoryData = [];

// ─────────────────────────────────────────────
// 模型跳转 → 现在改为切换 Tab，不跳页面
// ─────────────────────────────────────────────
function handleModelDisplay(index) {
    console.log("👉 切换到非遗展陈，模型 index =", index);
    if (typeof window.switchTab === "function") {
        window.switchTab("3d", index);
    }
}

// ─────────────────────────────────────────────
// 错误提示
// ─────────────────────────────────────────────
function showModelError(message) {
    console.error("模型错误:", message);
    const canvas = document.getElementById("live2d");
    if (!canvas || !canvas.parentElement) return;
    const container = canvas.parentElement;
    const old = container.querySelector(".live2d-error-message");
    if (old) old.remove();
    const errorMsg = document.createElement("div");
    errorMsg.className = "live2d-error-message";
    errorMsg.style.cssText = `
        color:#fbbf24; text-align:center; padding:20px;
        background:rgba(0,0,0,0.8); border-radius:10px;
        position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%); width:80%;
        z-index:100; border:1px solid #fbbf24; line-height:1.6;
    `;
    errorMsg.innerHTML = `<div style="font-size:18px;">❌ ${message}</div>`;
    container.appendChild(errorMsg);
}

// ─────────────────────────────────────────────
// 情绪切换（全局，供 onclick 调用）
// ─────────────────────────────────────────────
window.setEmotion = function (emotion) {
    document.querySelectorAll(".emotion-btn").forEach(btn => {
        btn.classList.remove("active");
        const t = btn.innerText;
        if (
            (emotion === "happy"     && t.includes("开心")) ||
            (emotion === "peace"     && t.includes("平静")) ||
            (emotion === "thoughtful"&& t.includes("思考")) ||
            (emotion === "surprised" && t.includes("惊讶")) ||
            (emotion === "gentle"    && t.includes("温柔"))
        ) btn.classList.add("active");
    });

    if (window.live2dModel) {
        try {
            const map = { happy:"exp_01", peace:"exp_02", thoughtful:"exp_03", surprised:"exp_04", gentle:"exp_05" };
            window.live2dModel.expression(map[emotion]);
        } catch (e) { console.warn("表情切换失败:", e); }
    }
};

// ─────────────────────────────────────────────
// 快捷提问（全局，供 onclick 调用）
// ─────────────────────────────────────────────
window.quickQuestion = function (question) {
    const history = document.getElementById("chatHistory");
    if (!history) return;
    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.textContent = question;
    history.appendChild(userMsg);

    (async () => {
        const res = await chatWithAI(chatHistoryData, question);
        chatHistoryData.push({ role:"user", content:question });
        chatHistoryData.push({ role:"assistant", content:res.message });
        appendAI(res.message);
        if (res.isShowModel) handleModelDisplay(res.modelIndex);
    })();

    history.scrollTop = history.scrollHeight;
};

// ─────────────────────────────────────────────
// 语音相关
// ─────────────────────────────────────────────
let recognition;
let recognizing = false;

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
    speak(text);
}

function initRecognition(voiceStatus) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { voiceStatus.innerText = "当前浏览器不支持语音识别"; return null; }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart  = () => { recognizing = true;  voiceStatus.innerText = "正在听..."; };
    rec.onend    = () => { recognizing = false; voiceStatus.innerText = "语音结束"; };
    rec.onerror  = (e) => { recognizing = false; voiceStatus.innerText = "语音识别出错"; console.error(e); };
    rec.onresult = async (e) => {
        const text = e.results[0][0].transcript;
        appendUser(text);
        try {
            const res = await chatWithAI(chatHistoryData, text);
            chatHistoryData.push({ role:"user", content:text });
            chatHistoryData.push({ role:"assistant", content:res.message });
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

function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    window.speechSynthesis.speak(u);
}

// ─────────────────────────────────────────────
// Live2D 初始化（可重复调用）
// ─────────────────────────────────────────────
async function initLive2D() {
    // 先销毁旧实例，防止重复创建
    if (window.live2dApp) {
        try { window.live2dApp.destroy(true, { children: true, texture: true }); } catch(e) {}
        window.live2dApp = null;
        window.live2dModel = null;
    }

    try {
        if (typeof PIXI === "undefined")                   { showModelError("PIXI 库加载失败"); return; }
        if (typeof Live2DCubismCore === "undefined")        { showModelError("Cubism Core 未加载"); return; }
        if (!PIXI.live2d || !PIXI.live2d.Live2DModel)     { showModelError("Cubism4 插件未正确加载"); return; }

        const canvas    = document.getElementById("live2d");
        const container = document.querySelector(".character-3d");
        if (!canvas || !container) { showModelError("找不到 Live2D 显示区域"); return; }

        const app = new PIXI.Application({
            view: canvas,
            resizeTo: container,
            transparent: true,
            autoStart: true,
        });

        const model = await PIXI.live2d.Live2DModel.from(
            "..\\public\\model\\hiyori\\hiyori.model3.json"
        );

        window.live2dApp   = app;
        window.live2dModel = model;

        app.stage.addChild(model);

        if (model.anchor) model.anchor.set(0.5, 1);

        model.x = app.renderer.width / 2;
        model.y = app.renderer.height * 1.02;
        model.scale.set(0.15);

        model.interactive = true;
        model.on("pointerdown", () => {
            try { model.motion("TapBody"); } catch(e) { console.warn("点击动作失败:", e); }
        });

        window.addEventListener("resize", () => {
            if (!window.live2dModel || !window.live2dApp) return;
            window.live2dModel.x = window.live2dApp.renderer.width / 2;
            window.live2dModel.y = window.live2dApp.renderer.height * 1.02;
            window.live2dModel.scale.set(0.11);
        });

        try { model.expression("exp_01"); } catch(e) { console.warn("初始表情失败:", e); }

        console.log("✅ Live2D 模型加载成功");
    } catch (error) {
        console.error("Live2D 初始化失败:", error);
        showModelError("模型加载失败，请检查控制台报错");
    }
}

// ─────────────────────────────────────────────
// 绑定页面交互事件（tab 切换后重新调用）
// ─────────────────────────────────────────────
function bindEvents() {
    const sendBtn      = document.getElementById("sendBtn");
    const input        = document.getElementById("textInput");
    const voiceBtn     = document.getElementById("voiceChatBtn");
    const appWrapper   = document.querySelector(".app-wrapper");
    const voiceUI      = document.getElementById("voiceModeUI");
    const startBtn     = document.getElementById("startVoice");
    const stopBtn      = document.getElementById("stopVoice");
    const backBtn      = document.getElementById("backTextChat");
    const voiceStatus  = document.getElementById("voiceStatus");
    const playIntroBtn = document.getElementById("playIntroBtn");
    const audioStatus  = document.getElementById("audioStatus");
    const modelIntroText = document.getElementById("modelIntroText");

    if (sendBtn && input) {
        sendBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;
            appendUser(text);
            input.value = "";
            const res = await chatWithAI(chatHistoryData, text);
            chatHistoryData.push({ role:"user", content:text });
            chatHistoryData.push({ role:"assistant", content:res.message });
            appendAI(res.message);
            if (res.isShowModel) handleModelDisplay(res.modelIndex);
        };
    }

    if (voiceBtn && appWrapper && voiceUI && voiceStatus) {
        voiceBtn.onclick = () => {
            appWrapper.classList.add("voice-mode");
            voiceUI.style.display = "flex";
            voiceStatus.innerText = "点击麦克风开始语音聊天";
        };
    }

    if (backBtn && appWrapper && voiceUI) {
        backBtn.onclick = () => {
            appWrapper.classList.remove("voice-mode");
            voiceUI.style.display = "none";
            stopRecognition();
        };
    }

    if (startBtn && voiceStatus) {
        startBtn.onclick = () => {
            if (!recognition) recognition = initRecognition(voiceStatus);
            if (recognition) recognition.start();
        };
    }

    if (stopBtn) {
        stopBtn.onclick = () => stopRecognition();
    }

    // 展品语音讲解按钮
    let introSpeaking = false;
    if (playIntroBtn && audioStatus && modelIntroText) {
        playIntroBtn.onclick = () => {
            if (introSpeaking) {
                window.speechSynthesis.cancel();
                introSpeaking = false;
                playIntroBtn.classList.remove("playing");
                playIntroBtn.innerHTML = "🎤";
                audioStatus.innerText = "";
                return;
            }
            const text = modelIntroText.innerText.trim();
            if (!text) return;
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "zh-CN"; u.rate = 1; u.pitch = 1; u.volume = 1;
            u.onstart = () => { introSpeaking = true;  playIntroBtn.classList.add("playing"); playIntroBtn.innerHTML = "■"; audioStatus.innerText = "正在播放讲解，点击按钮可停止"; };
            u.onend   = () => { introSpeaking = false; playIntroBtn.classList.remove("playing"); playIntroBtn.innerHTML = "🎤"; audioStatus.innerText = ""; };
            u.onerror = () => { introSpeaking = false; playIntroBtn.classList.remove("playing"); playIntroBtn.innerHTML = "🎤"; audioStatus.innerText = ""; };
            window.speechSynthesis.speak(u);
        };
    }
}

// ─────────────────────────────────────────────
// 供 main.js 在每次 renderApp 后调用
// ─────────────────────────────────────────────
window.__rebindScriptEvents = function () {
    bindEvents();
    window.setEmotion("happy");
    initLive2D();  // 每次 tab 切换都重新初始化 Live2D
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