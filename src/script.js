import { chatWithAI, chatWithAIStream } from "./api/qwen";
import { speak, stop, pause, resume, isPlaying } from "./tts.js";

let chatHistoryData = [
    {
        role: "system",
        content: `你是"绫韵"，刺绣文化数字人讲解员。只回答刺绣相关问题（历史、四大名绣、苗绣、针法、工具、非遗保护）。非刺绣话题请礼貌拒绝并引导回刺绣。回答亲切专业，100字以内为宜。`
    }
];

// ── 输入锁：模块级，供 stop 按钮随时解锁 ────────
let _replyStopped = false;

function lockInput() {
    _replyStopped = false;
    window._cultureInputLocked = true;
    const sendBtn   = document.getElementById("sendBtn");
    const input     = document.getElementById("textInput");
    const inputArea = sendBtn?.closest(".input-area");
    if (sendBtn)   sendBtn.disabled = true;
    if (input)     input.disabled = true;
    if (inputArea) inputArea.classList.add("sending");
    // 禁用所有知识卡片
    document.querySelectorAll(".culture-mini-card").forEach(c => {
        c.style.pointerEvents = "none";
        c.style.opacity = "0.45";
    });
    // 禁用换一批按钮
    const refreshBtn = document.querySelector(".culture-cards-refresh");
    if (refreshBtn) {
        refreshBtn.style.pointerEvents = "none";
        refreshBtn.style.opacity = "0.45";
    }
}

function unlockInput() {
    _replyStopped = true;
    window._cultureInputLocked = false;
    const sendBtn   = document.getElementById("sendBtn");
    const input     = document.getElementById("textInput");
    const inputArea = sendBtn?.closest(".input-area");
    if (sendBtn)   sendBtn.disabled = false;
    if (input)     input.disabled = false;
    if (inputArea) inputArea.classList.remove("sending");
    // 恢复所有知识卡片
    document.querySelectorAll(".culture-mini-card").forEach(c => {
        c.style.pointerEvents = "";
        c.style.opacity = "";
    });
    // 恢复换一批按钮
    const refreshBtn = document.querySelector(".culture-cards-refresh");
    if (refreshBtn) {
        refreshBtn.style.pointerEvents = "";
        refreshBtn.style.opacity = "";
    }
}

// ─────────────────────────────────────────────
// 语音设置（音量 0-100，语速 0.5-2.0）
// ─────────────────────────────────────────────
window._ttsSettings = { volume: 50, rate: 1.2 };

window.toggleVoiceSettings = function () {
    const panel = document.getElementById("voiceSettingsPanel");
    if (panel) panel.classList.toggle("open");
};

window.updateVoiceSetting = function (key, value) {
    const num = parseFloat(value);
    window._ttsSettings[key] = num;
    if (key === "volume") {
        const el = document.getElementById("vsVolumeVal");
        if (el) el.textContent = Math.round(num);
    } else if (key === "rate") {
        const el = document.getElementById("vsRateVal");
        if (el) el.textContent = num.toFixed(1) + "x";
    }
};


// ─────────────────────────────────────────────
// 对话历史裁剪：最多保留 system + 最近 6 轮（12条）
// 发送前裁剪，保证每次 API 请求 token 数稳定
// ─────────────────────────────────────────────
const MAX_HISTORY_ROUNDS = 6;

function trimHistory() {
    const sys  = chatHistoryData[0];   // system prompt 永远保留
    const rest = chatHistoryData.slice(1);
    const limit = MAX_HISTORY_ROUNDS * 2;  // 6轮 = 12条
    if (rest.length > limit) {
        chatHistoryData = [sys, ...rest.slice(rest.length - limit)];
    }
}

// 发送前调用，返回裁剪后的副本（不直接修改 chatHistoryData）
function getContextForAPI() {
    const sys  = chatHistoryData[0];
    const rest = chatHistoryData.slice(1);
    const limit = MAX_HISTORY_ROUNDS * 2;
    const trimmed = rest.length > limit ? rest.slice(rest.length - limit) : rest;
    return [sys, ...trimmed];
}

let _typingTimer = null;
let _typingPaused = false;
let _typingResume = null;
let _typingResolve = null;
// 世代计数器：每次新 appendAIStream 调用时递增，旧调用自动失效
let _streamGeneration = 0;

function pauseTyping() {
    _typingPaused = true;
    // 清除计划中的 tick，但 _typingResume 由 tick 自身维护，无需在此设置
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
}

function resumeTyping() {
    if (!_typingPaused) return;
    _typingPaused = false;
    // _typingResume 由 tick 在每次执行开头注册，此处直接调用即可
    if (_typingResume) {
        const r = _typingResume;
        _typingResume = null;
        r();
    }
}

function stopTyping() {
    _typingPaused = false;
    _typingResume = null;
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
    if (_typingResolve) { _typingResolve(); _typingResolve = null; }
}


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

// setEmotion 在 initLive2D 内部定义（根据表情探测结果自动启用/禁用）
window.setEmotion = window.setEmotion || function () {};

// ─────────────────────────────────────────────
// TTS 控制按钮状态
// ─────────────────────────────────────────────
function updateTtsButtons(playing) {
    const pauseBtn = document.getElementById("ttsControlBtn");
    const stopBtn = document.getElementById("ttsStopBtn");
    if (pauseBtn) pauseBtn.classList.toggle("active", playing);
    if (stopBtn) stopBtn.classList.toggle("active", playing);
}

// ─────────────────────────────────────────────
// 快捷提问
// ─────────────────────────────────────────────
window.quickQuestion = function (question) {
    const history = document.getElementById("chatHistory");
    if (!history) return;
    // 先打断当前一切输出，再开新对话
    _streamGeneration++;
    stop();
    stopTyping();
    if (typeof window.stopLipsync === "function") window.stopLipsync();
    updateTtsButtons(false);

    lockInput();
    appendUser(question);
    appendThinking();
    (async () => {
        await appendAIStream(getContextForAPI(), question, (res) => {
            _onAIDone(question, res.message);
        });
        if (!_replyStopped) unlockInput();
    })();
};

// ─────────────────────────────────────────────
// 打断当前输出（停止语音 + 打字）
// ─────────────────────────────────────────────
function interruptCurrent() {
    stop();
    stopTyping();
    if (typeof window.stopLipsync === "function") window.stopLipsync();
    updateTtsButtons(false);
}

// ─────────────────────────────────────────────
// 按句子切分文本（中英文标点）
// ─────────────────────────────────────────────
function splitSentences(text) {
    // 按句末标点切，保留标点在句尾
    const parts = text.split(/(?<=[。！？!?…]+)/);
    return parts.map(s => s.trim()).filter(s => s.length > 0);
}

function appendThinking() {
    const el = document.getElementById("chatHistory");
    if (!el) return null;
    const div = document.createElement("div");
    div.className = "message thinking";
    div.id = "thinkingBubble";
    div.innerHTML = `
        <div class="thinking-dots"><span></span><span></span><span></span></div>
        <span>正在思考...</span>
    `;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
}

function removeThinking() {
    document.getElementById("thinkingBubble")?.remove();
}

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
    removeThinking();
    const el = document.getElementById("chatHistory");
    if (!el) return;
    const div = document.createElement("div");
    div.className = "message ai";
    div.innerText = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    speak(text);
    updateTtsButtons(true);
}

// ─────────────────────────────────────────────
// 流式接收 AI 回复，收完后同步启动打字 + TTS
// ─────────────────────────────────────────────
async function appendAIStream(historyMessages, userInput, onDone) {
    const myGen = ++_streamGeneration;
    const isAborted = () => _streamGeneration !== myGen;

    removeThinking();
    const el = document.getElementById("chatHistory");
    if (!el) return;

    const div = document.createElement("div");
    div.className = "message ai";
    // 注意：此处不立即设置 id，等到打字阶段才设置
    // 避免 div 在 DOM 中但未开始打字时，id 泄漏给其他调用的 tick
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;

    window._typingInProgress = true;

    // ── 阶段一：流式接收，仅缓冲字符 ────────────
    let collectedMessage = "";
    let finalData = null;

    const stream = chatWithAIStream(historyMessages, userInput);
    for await (const chunk of stream) {
        if (isAborted()) break;
        if (chunk.__done) { finalData = chunk; break; }
        const chars = chunk.__message != null
            ? [chunk.__message]
            : [...(chunk.delta ?? "")];
        for (const c of chars) { if (c) collectedMessage += c; }
    }

    // ── 被终止：移除空气泡，干净退出 ─────────────
    if (isAborted()) {
        div.remove();
        window._typingInProgress = false;
        return;
    }

    // ── 兜底：状态机未提取时用 finalData.message ──
    if (!collectedMessage.trim() && finalData?.message) {
        collectedMessage = finalData.message;
    }
    if (!collectedMessage.trim()) {
        div.remove();
        window._typingInProgress = false;
        return;
    }

    // ── 阶段二：TTS 先启动，打字延迟等待 ─────────
    speak(collectedMessage);
    if (typeof window.startLipsync === "function") window.startLipsync();
    updateTtsButtons(true);

    const TTS_STARTUP_MS = 350;
    const rate = (window._ttsSettings?.rate) ?? 1.2;
    const CHAR_INTERVAL = Math.max(30, Math.round(1000 / (rate * 4.2)));

    await new Promise(r => setTimeout(r, TTS_STARTUP_MS));

    if (isAborted()) {
        div.remove();
        window._typingInProgress = false;
        stop();
        return;
    }

    // ── 阶段三：打字 ─────────────────────────────
    const charArray = [...collectedMessage];
    let i = 0;

    // 打字开始时才挂 id，结束或中断时立即摘掉
    // 保证同一时刻 DOM 里最多只有一个 _typingBubble
    div.id = "_typingBubble";

    stopTyping();
    await new Promise(resolve => {
        _typingResolve = resolve;

        (function tick() {
            // ── 每次 tick 开头都注册自己，确保 pause/resume 可用 ──
            _typingResume = tick;

            if (_typingPaused) return;   // 暂停：_typingResume 已注册，等 resumeTyping 调用

            // 检测外部 stop：立即结束
            if (isAborted()) {
                div.id = "";             // 摘掉 id，防止 id 泄漏
                _typingResume = null;
                resolve();
                return;
            }

            if (i < charArray.length) {
                // 始终用 div 直接写，不依赖 getElementById（更安全）
                div.innerText = collectedMessage.slice(0, ++i);
                const chatEl = document.getElementById("chatHistory");
                if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
                _typingTimer = setTimeout(tick, CHAR_INTERVAL);
            } else {
                // 正常打完
                div.id = "";
                _typingResume = null;
                window._typingInProgress = false;
                stopTyping();
                resolve();
            }
        })();
    });

    // ── 无论以何种方式退出打字，都确保 id 被清除 ──
    div.id = "";
    window._typingInProgress = false;

    updateTtsButtons(false);
    if (typeof window.stopLipsync === "function") window.stopLipsync();

    if (!isAborted() && finalData) {
        if (finalData.isShowModel) handleModelDisplay(finalData.modelIndex);
        if (typeof onDone === "function") onDone(finalData);
    }
}

// onDone 回调里统一 trim（sendBtn 和 quickQuestion 都走这里）
function _onAIDone(userText, resMsg) {
    chatHistoryData.push({ role: "user",      content: userText });
    chatHistoryData.push({ role: "assistant", content: resMsg  });
    trimHistory();
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
        interruptCurrent();
        voiceStatus.innerText = "正在思考...";
        appendUser(text);
        appendThinking();
        try {
            await appendAIStream(getContextForAPI(), text, (res) => {
                _onAIDone(text, res.message);
                voiceStatus.innerText = "点击麦克风继续";
            });
        } catch (err) {
            removeThinking();
            console.error("AI调用失败:", err);
            appendAI("刚刚有点问题，我们再试一次吧～");
            voiceStatus.innerText = "出错了，请重试";
        }
    };
    return rec;
}

function stopRecognition() {
    if (recognition && recognizing) recognition.stop();
}

// ─────────────────────────────────────────────
// Live2D 初始化（仅文化页调用，其他页有 canvas 才执行）
// ─────────────────────────────────────────────
async function initLive2D() {
    // 文化页才有 live2d canvas，其他页直接跳过
    const canvas = document.getElementById("live2d");
    if (!canvas) return;

    if (window.live2dApp) {
        try { window.live2dApp.destroy(true, { children: true, texture: true }); } catch (e) {}
        window.live2dApp = null;
        window.live2dModel = null;
    }
    try {
        if (typeof PIXI === "undefined") { showModelError("PIXI 库加载失败"); return; }
        if (typeof Live2DCubismCore === "undefined") { showModelError("Cubism Core 未加载"); return; }
        if (!PIXI.live2d?.Live2DModel) { showModelError("Cubism4 插件未正确加载"); return; }

        const container = document.querySelector(".character-3d");
        if (!container) { showModelError("找不到 Live2D 显示区域"); return; }

        const app = new PIXI.Application({
            view: canvas,
            width: container.clientWidth,
            height: container.clientHeight,
            transparent: true,
            autoStart: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        const model = await PIXI.live2d.Live2DModel.from("..\\public\\model\\hiyori\\hiyori.model3.json");

        window.live2dApp = app;
        window.live2dModel = model;
        app.stage.addChild(model);

        // ── 自适应尺寸 ──────────────────────────────
        let _baseScale  = container.clientWidth * 0.0007;
        let _zoomFactor = 1.1;
        const ZOOM_MIN  = 0.8;
        const ZOOM_MAX  = 1.4;
        const ZOOM_STEP = 0.08;

        function fitModel() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            app.renderer.resize(w, h);
            if (model.anchor) model.anchor.set(0.5, 0.28);
            model.x = w / 2;
            model.y = h * 0.55;
            const isVoiceMode = document.querySelector(".app-wrapper")?.classList.contains("voice-mode");
            const BASE = isVoiceMode ? 0.00035 : 0.0007;
            model.scale.set(w * BASE * _zoomFactor);
            _baseScale = w * BASE;
        }
        fitModel();

        model.interactive = true;
        model.on("pointerdown", () => {
            try { model.motion("TapBody"); } catch (e) {}
        });

        const ro = new ResizeObserver(() => fitModel());
        ro.observe(container);

        // ── 滚轮缩放 ─────────────────────────────────
        container.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            _zoomFactor = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, _zoomFactor + delta));
            model.scale.set(_baseScale * _zoomFactor);
        }, { passive: false });

        // ── 口型同步 ─────────────────────────────────
        const MOUTH_PARAMS = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y", "ParamMouthOpen"];
        let _mouthParam = null;
        for (const name of MOUTH_PARAMS) {
            try {
                model.internalModel.coreModel.setParameterValueById(name, 0);
                _mouthParam = name;
                console.log(`✅ 口型参数: ${name}`);
                break;
            } catch (e) {}
        }
        if (!_mouthParam) {
            try {
                const count = model.internalModel.coreModel.getParameterCount();
                for (let i = 0; i < count; i++) {
                    const id = model.internalModel.coreModel.getParameterId(i);
                    if (id?.toLowerCase().includes("mouth") && id?.toLowerCase().includes("open")) {
                        _mouthParam = id;
                        console.log(`✅ 口型参数(遍历): ${id}`);
                        break;
                    }
                }
            } catch (e) {}
        }

        let _lipsyncSmoothed = 0;
        window._lipsyncActive = false;

        const _lipsyncTicker = () => {
            if (!_mouthParam) return;
            if (!window._lipsyncActive) {
                try { model.internalModel.coreModel.setParameterValueById(_mouthParam, 0); } catch (e) {}
                return;
            }
            const raw = window._ttsAmplitude ?? 0;
            _lipsyncSmoothed = _lipsyncSmoothed * 0.30 + raw * 0.70;
            const val = Math.min(1, _lipsyncSmoothed * 5.0);
            try { model.internalModel.coreModel.setParameterValueById(_mouthParam, val); } catch (e) {}
        };
        app.ticker.add(_lipsyncTicker, null, PIXI.UPDATE_PRIORITY?.NORMAL ?? 0);

        window.startLipsync = function () { window._lipsyncActive = true;  _lipsyncSmoothed = 0; };
        window.stopLipsync  = function () { window._lipsyncActive = false; _lipsyncSmoothed = 0; };

        // ── 表情探测 ─────────────────────────────────
        let _expressionSupported = false;
        try {
            const exprMgr   = model.internalModel?.motionManager?.expressionManager;
            const exprCount = exprMgr?.expressions?.length ?? 0;
            if (exprCount > 0) {
                _expressionSupported = true;
                try { model.expression(0); } catch (e) {}
            } else {
                model.expression(0);
                _expressionSupported = true;
            }
        } catch (e) {
            _expressionSupported = false;
        }

        const emotionSwitch = document.querySelector(".emotion-switch");
        if (emotionSwitch) emotionSwitch.style.display = _expressionSupported ? "" : "none";

        window.setEmotion = function (emotion) {
            document.querySelectorAll(".emotion-btn").forEach(btn => {
                btn.classList.remove("active");
                const t = btn.innerText;
                if (
                    (emotion === "happy"      && t.includes("开心")) ||
                    (emotion === "peace"      && t.includes("平静")) ||
                    (emotion === "thoughtful" && t.includes("思考")) ||
                    (emotion === "surprised"  && t.includes("惊讶")) ||
                    (emotion === "gentle"     && t.includes("温柔"))
                ) btn.classList.add("active");
            });
            if (!_expressionSupported || !window.live2dModel) return;
            try {
                const map = { happy:"f01", peace:"f02", thoughtful:"f03", surprised:"f04", gentle:"f05" };
                window.live2dModel.expression(map[emotion]);
            } catch (e) {}
        };

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
    const ttsControlBtn = document.getElementById("ttsControlBtn");
    const ttsStopBtn = document.getElementById("ttsStopBtn");
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
            // 先打断当前一切输出，再开新对话
            _streamGeneration++;
            stop();
            stopTyping();
            if (typeof window.stopLipsync === "function") window.stopLipsync();
            updateTtsButtons(false);

            lockInput();
            appendUser(text);
            input.value = "";
            appendThinking();
            await appendAIStream(getContextForAPI(), text, (res) => {
                _onAIDone(text, res.message);
            });
            if (!_replyStopped) {
                unlockInput();
                input.focus();
            }
        };
        // 回车发送
        input.onkeydown = (e) => {
            if (e.key === "Enter" && !sendBtn.disabled) sendBtn.onclick();
        };
    }

    // 进入语音模式（不停止 TTS）
    if (voiceBtn && appWrapper && voiceUI && voiceStatus) {
        voiceBtn.onclick = () => {
            appWrapper.classList.add("voice-mode");
            voiceUI.style.display = "flex";
            voiceStatus.innerText = "点击麦克风开始语音聊天";
        };
    }

    // 语音控制面板拖动
    const panel = document.querySelector(".voice-control-panel");
    if (panel) {
        let isDragging = false;
        let startX, startY, initLeft, initTop;

        panel.addEventListener("mousedown", (e) => {
            // 点击按钮时不触发拖动
            if (e.target.tagName === "BUTTON") return;
            isDragging = true;
            const rect = voiceUI.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initLeft = rect.left;
            initTop  = rect.top;
            // 切换到绝对坐标模式，脱离 transform 居中
            voiceUI.style.left      = initLeft + "px";
            voiceUI.style.top       = initTop  + "px";
            voiceUI.style.bottom    = "auto";
            voiceUI.style.transform = "none";
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            voiceUI.style.left = (initLeft + dx) + "px";
            voiceUI.style.top  = (initTop  + dy) + "px";
        });

        document.addEventListener("mouseup", () => { isDragging = false; });

        // 触屏支持
        panel.addEventListener("touchstart", (e) => {
            if (e.target.tagName === "BUTTON") return;
            const t = e.touches[0];
            isDragging = true;
            const rect = voiceUI.getBoundingClientRect();
            startX = t.clientX; startY = t.clientY;
            initLeft = rect.left; initTop = rect.top;
            voiceUI.style.left = initLeft + "px";
            voiceUI.style.top  = initTop  + "px";
            voiceUI.style.bottom = "auto";
            voiceUI.style.transform = "none";
        }, { passive: true });

        document.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            voiceUI.style.left = (initLeft + t.clientX - startX) + "px";
            voiceUI.style.top  = (initTop  + t.clientY - startY) + "px";
        }, { passive: true });

        document.addEventListener("touchend", () => { isDragging = false; });
    }

    // TTS 暂停/继续
    if (ttsControlBtn) {
        ttsControlBtn.onclick = () => {
            if (isPlaying()) {
                pause();
                pauseTyping();
                ttsControlBtn.textContent = "▶";
                ttsControlBtn.title = "继续语音";
            } else {
                resume();
                resumeTyping();
                ttsControlBtn.textContent = "⏸";
                ttsControlBtn.title = "暂停语音";
            }
        };
    }

    // TTS 停止 + 中断当前流式输出
    if (ttsStopBtn) {
        ttsStopBtn.onclick = () => {
            _streamGeneration++;   // 让当前所有进行中的 appendAIStream 调用失效
            stop();
            stopTyping();
            if (typeof window.stopLipsync === "function") window.stopLipsync();
            if (typeof hideSpeechBubble === "function") hideSpeechBubble(0);
            updateTtsButtons(false);
            const pauseBtn = document.getElementById("ttsControlBtn");
            if (pauseBtn) { pauseBtn.textContent = "⏸"; pauseBtn.title = "暂停语音"; }
            unlockInput();
        };
    }

    // 返回文本模式（不停止 TTS）
    if (backBtn && appWrapper && voiceUI) {
        backBtn.onclick = () => {
            appWrapper.classList.remove("voice-mode");
            voiceUI.style.display = "none";
            stopRecognition();
            // 重置麦克风状态
            if (startBtn) {
                startBtn.classList.remove("recording");
                startBtn.textContent = "🎙";
            }
            if (voiceStatus) voiceStatus.innerText = "点击麦克风开始说话";
        };
    }

    // 麦克风切换：点一下开始录音，再点一下结束
    if (startBtn && voiceStatus) {
        startBtn.onclick = () => {
            if (recognizing) {
                // 正在录音 → 点击结束
                stopRecognition();
                startBtn.classList.remove("recording");
                startBtn.textContent = "🎙";
                voiceStatus.innerText = "点击麦克风开始说话";
            } else {
                // 未录音 → 点击开始：先打断大模型当前发言
                stop();
                stopTyping();
                updateTtsButtons(false);
                if (typeof window.stopLipsync === "function") window.stopLipsync();
                // 再开始录音
                if (!recognition) recognition = initRecognition(voiceStatus);
                if (recognition) {
                    recognition.start();
                    startBtn.classList.add("recording");
                    startBtn.textContent = "⏹";
                }
            }
        };
    }

    // 结束对话按钮（✕）：退出语音模式
    if (stopBtn && appWrapper && voiceUI) {
        stopBtn.onclick = () => {
            stopRecognition();
            appWrapper.classList.remove("voice-mode");
            voiceUI.style.display = "none";
            if (startBtn) {
                startBtn.classList.remove("recording");
                startBtn.textContent = "🎙";
            }
        };
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
// 教学页 GLB 数字人初始化
// ─────────────────────────────────────────────
async function initTeachingGLB() {
    const viewer    = document.getElementById("teachingViewer");
    const container = document.getElementById("teachingViewerWrap");
    if (!viewer || !container) return;

    const GLB_MODELS = {
        idle: "/model/character/idle(model).glb",
        talk: "/model/character/talk(model).glb",
        walk: "/model/character/walk (model) .glb",
        wave: "/model/character/wave(model).glb",
    };

    // 固定视角参数（theta=0, phi=90deg正面），只允许滚轮改半径
    const FIXED_THETA = "0deg";
    const FIXED_PHI   = "90deg";
    let _radius = 2.2;
    let currentState = "";
    let waveReturnTimer = null;

    // 切换 GLB：换 src 后锁定视角并确保自动播放
    window.setCharacterState = function (state) {
        if (!GLB_MODELS[state] || state === currentState) return;
        currentState = state;
        viewer.setAttribute("src", GLB_MODELS[state]);
        // src 变更后 model-viewer 会重置 cameraOrbit，需重新锁定
        viewer.addEventListener("load", function onLoad() {
            viewer.removeEventListener("load", onLoad);
            viewer.cameraOrbit = `${FIXED_THETA} ${FIXED_PHI} ${_radius}m`;
            // 确保动画自动播放
            viewer.play?.();
        }, { once: true });
    };

    // 兼容 appendAIStream 调用
    window.startLipsync = () => window.setCharacterState("talk");
    window.stopLipsync  = () => window.setCharacterState("idle");

    window.playMotion = function (name, returnDelay = 3000) {
        if (!GLB_MODELS[name]) return;
        clearTimeout(waveReturnTimer);
        window.setCharacterState(name);
        if (name === "wave" || name === "walk") {
            waveReturnTimer = setTimeout(
                () => window.setCharacterState("idle"),
                returnDelay
            );
        }
    };

    // ── 仅滚轮缩放，不允许拖拽旋转 ──────────────
    // HTML 里已去掉 camera-controls，鼠标拖拽完全无效
    // 这里只处理滚轮 → 改半径
    const ZOOM_MIN  = 0.4;
    const ZOOM_MAX  = 3.0;
    const ZOOM_STEP = 0.10;

    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        _radius -= e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        _radius  = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, _radius));
        // 每次缩放都锁定 theta/phi，防止视角漂移
        viewer.cameraOrbit = `${FIXED_THETA} ${FIXED_PHI} ${_radius}m`;
    }, { passive: false });

    // 阻止触摸拖动（移动端）
    container.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    // 首次加载完成后锁定视角
    viewer.addEventListener("load", () => {
        viewer.cameraOrbit = `${FIXED_THETA} ${FIXED_PHI} ${_radius}m`;
        viewer.play?.();
    }, { once: true });

    // 进入页面先 wave 一次
    window.playMotion("wave", 3000);
    console.log("✅ 教学页 GLB 初始化成功");
}

// ─────────────────────────────────────────────
// 供 main.js 在每次 renderApp 后调用
// ─────────────────────────────────────────────
window.__rebindScriptEvents = function () {
    bindEvents();
    // 判断规则：
    //   文化页 / 3D展示页 → 有 #live2d canvas → 初始化 Live2D
    //   教学页            → 有 #teachingViewer → 初始化 GLB 3D
    if (document.getElementById("live2d")) {
        window.setEmotion("happy");
        initLive2D();
    } else if (document.getElementById("teachingViewer")) {
        initTeachingGLB();
    }
};

// ─────────────────────────────────────────────
// 首次页面加载
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    if (document.getElementById("live2d")) {
        window.setEmotion("happy");
        initLive2D();
    } else if (document.getElementById("teachingViewer")) {
        initTeachingGLB();
    }
    console.log("✅ 页面初始化完成");
});