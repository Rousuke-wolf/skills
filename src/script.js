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

let _typingTimer = null;   // ← 声明，避免 clearTimeout 报 ReferenceError
let _typingPaused = false;
let _typingResume = null;  // 暂停时保存 tick，用于 resume 继续
let _typingResolve = null; // 保存 Promise 的 resolve，stopTyping 直接调用结束 await

function pauseTyping() {
    _typingPaused = true;
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
}

function resumeTyping() {
    if (!_typingPaused || !_typingResume) return;
    _typingPaused = false;
    _typingResume(); // 从暂停处继续 tick
}

function stopTyping() {
    _typingPaused = false;
    _typingResume = null;
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
    // 直接 resolve Promise，让 await 立刻返回
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
// 流式逐字输出 AI 消息，打字开始时就同步播放语音
// ─────────────────────────────────────────────
// 流式逐字输出 AI 消息
// ─────────────────────────────────────────────
async function appendAIStream(historyMessages, userInput, onDone) {
    removeThinking();
    const el = document.getElementById("chatHistory");
    if (!el) return;

    const div = document.createElement("div");
    div.className = "message ai";
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;

    const stream = chatWithAIStream(historyMessages, userInput);
    let finalData = null;
    for await (const chunk of stream) {
        if (chunk.__done) finalData = chunk;
    }
    if (!finalData) return;

    const message = finalData.message || "";

    if (finalData.isShowModel) handleModelDisplay(finalData.modelIndex);

    const rate = (window._ttsSettings?.rate) ?? 1.2;
    const ESTIMATE_INTERVAL = Math.max(16, Math.floor(230 / rate));
    let i = 0;

    speak(message);
    if (typeof window.startLipsync === "function") window.startLipsync();
    updateTtsButtons(true);

    // ── 给气泡挂稳定 id，切页后可被 restoreCultureChat 重新认领 ──
    div.id = "_typingBubble";
    window._typingInProgress = true;

    stopTyping();
    await new Promise(resolve => {
        _typingResolve = resolve;   // ← 存起来，stopTyping 可直接结束 await
        function tick() {
            if (_typingPaused) { _typingResume = tick; return; }
            // 每次 tick 都重新查询 live DOM，页面切换后 div 会被重新认领
            const target = document.getElementById("_typingBubble") || div;
            const chatEl = document.getElementById("chatHistory");
            if (i < message.length) {
                target.innerText = message.slice(0, ++i);
                if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
                _typingTimer = setTimeout(tick, ESTIMATE_INTERVAL);
            } else {
                target.id = "";
                window._typingInProgress = false;
                stopTyping();
                resolve();
            }
        }
        _typingResume = tick;
        tick();
    });

    updateTtsButtons(false);
    // 打字结束后立即停止口型（TTS 的 stop 会在 tts.js 侧处理振幅归零）
    if (typeof window.stopLipsync === "function") window.stopLipsync();
    if (typeof onDone === "function") onDone(finalData);
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

        // ── 根据容器尺寸算 scale，之后不随窗口变化 ──
        function fitModel() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            app.renderer.resize(w, h);
            if (model.anchor) model.anchor.set(0.5, 0.28);
            model.x = w / 2;
            model.y = h * 0.55;
            // 语音全屏模式容器很宽，用更小系数保持中位大小视觉一致
            const isVoiceMode = document.querySelector(".app-wrapper")?.classList.contains("voice-mode");
            const BASE = isVoiceMode ? 0.00035 : 0.0007;
            model.scale.set(w * BASE * 1.1);
            // 同步滚轮基准，避免切换后滚轮跳变
            _baseScale = w * BASE;
        }
        // ── 滚轮缩放 ─────────────────────────────────
        let _baseScale  = container.clientWidth * 0.0007;
        let _zoomFactor = 1.1;          // 初始即中位值
        const ZOOM_MIN  = 0.8;
        const ZOOM_MAX  = 1.4;
        const ZOOM_STEP = 0.08;

        fitModel();

        model.interactive = true;
        model.on("pointerdown", () => {
            try { model.motion("TapBody"); } catch (e) { }
        });

        const ro = new ResizeObserver(() => fitModel());
        ro.observe(container);

        container.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            _zoomFactor = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, _zoomFactor + delta));
            model.scale.set(_baseScale * _zoomFactor);
        }, { passive: false });

        // ── 口型同步：motion 文件里有 ParamMouthOpenY 曲线，每帧会覆盖我们的值
        // 解决方案：用 app.ticker 在 model update 完成后强制写回口型值
        // pixi-live2d-display 在 PIXI.UPDATE_PRIORITY.HIGH (=25) 更新模型
        // 我们用 NORMAL (=0) 在其后执行，确保覆盖 motion 的结果
        const MOUTH_PARAMS = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y", "ParamMouthOpen"];
        let _mouthParam = null;

        // 探测参数名
        for (const name of MOUTH_PARAMS) {
            try {
                // getParameterValueById 不报错则参数存在
                model.internalModel.coreModel.setParameterValueById(name, 0);
                _mouthParam = name;
                console.log(`✅ 口型参数: ${name}`);
                break;
            } catch (e) {}
        }

        // 如果上面都失败，尝试遍历模型参数找嘴相关的
        if (!_mouthParam) {
            try {
                const count = model.internalModel.coreModel.getParameterCount();
                for (let i = 0; i < count; i++) {
                    const id = model.internalModel.coreModel.getParameterId(i);
                    if (id && id.toLowerCase().includes('mouth') && id.toLowerCase().includes('open')) {
                        _mouthParam = id;
                        console.log(`✅ 口型参数(遍历): ${id}`);
                        break;
                    }
                }
            } catch (e) {}
        }

        if (!_mouthParam) {
            console.warn("⚠️ 未找到嘴部参数，口型驱动降级");
        }

        // ticker 在 model update 之后运行（NORMAL priority = 0，低于 model 的 HIGH = 25）
        let _lipsyncSmoothed = 0;
        window._lipsyncActive = false;

        const _lipsyncTicker = () => {
            if (!_mouthParam) return;
            if (!window._lipsyncActive) {
                // 停止时也要归零（抵消 motion 里可能有非零值的帧）
                try { model.internalModel.coreModel.setParameterValueById(_mouthParam, 0); } catch (e) {}
                return;
            }
            const raw = window._ttsAmplitude ?? 0;
            // 响应快：0.3/0.7；平滑但不滞后
            _lipsyncSmoothed = _lipsyncSmoothed * 0.30 + raw * 0.70;
            const val = Math.min(1, _lipsyncSmoothed * 5.0);
            try {
                model.internalModel.coreModel.setParameterValueById(_mouthParam, val);
            } catch (e) {}
        };

        // 用 PIXI.UPDATE_PRIORITY.NORMAL (0) 注册，在模型 HIGH(25) 之后执行
        app.ticker.add(_lipsyncTicker, null, PIXI.UPDATE_PRIORITY?.NORMAL ?? 0);

        window.startLipsync = function () {
            window._lipsyncActive = true;
            _lipsyncSmoothed = 0;
        };

        window.stopLipsync = function () {
            window._lipsyncActive = false;
            _lipsyncSmoothed = 0;
        };

        // ── 表情自动探测：能用就保留，不能用就隐藏情绪栏 ──
        let _expressionSupported = false;
        try {
            // 尝试获取表情列表
            const exprMgr = model.internalModel?.motionManager?.expressionManager;
            const exprCount = exprMgr?.expressions?.length ?? 0;
            if (exprCount > 0) {
                _expressionSupported = true;
                console.log(`✅ 表情驱动可用，共 ${exprCount} 个表情`);
                // 设置默认表情
                try { model.expression(0); } catch (e) {}
            } else {
                // 尝试直接调用索引
                model.expression(0);
                _expressionSupported = true;
                console.log("✅ 表情驱动可用（通过索引）");
            }
        } catch (e) {
            _expressionSupported = false;
            console.warn("⚠️ 表情驱动不可用，隐藏情绪栏:", e.message);
        }

        // 根据探测结果决定是否显示情绪切换栏
        const emotionSwitch = document.querySelector(".emotion-switch");
        if (emotionSwitch) {
            emotionSwitch.style.display = _expressionSupported ? "" : "none";
        }

        // 同时更新 setEmotion，只在支持时实际调用
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
            if (!_expressionSupported) return;
            if (window.live2dModel) {
                try {
                    const map = { happy:"f01", peace:"f02", thoughtful:"f03", surprised:"f04", gentle:"f05" };
                    window.live2dModel.expression(map[emotion]);
                } catch (e) { console.warn("表情切换失败:", e); }
            }
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

    // TTS 停止
    if (ttsStopBtn) {
        ttsStopBtn.onclick = () => {
            stop();
            stopTyping();
            hideSpeechBubble(0);
            updateTtsButtons(false);
            const pauseBtn = document.getElementById("ttsControlBtn");
            if (pauseBtn) { pauseBtn.textContent = "⏸"; pauseBtn.title = "暂停语音"; }
            // 结束回复，立即解锁输入
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