import { chatWithAI, chatWithAIStream } from "./api/qwen";
import { speak, stop, pause, resume, isPlaying } from "./tts.js";

let chatHistoryData = [
  {
    role: "system",
    content: `你是"绫韵"，一位专注于中国传统刺绣文化的数字人讲解员。你只回答与刺绣相关的问题，包括：刺绣历史、四大名绣（苏绣、湘绣、蜀绣、粤绣）、少数民族刺绣（苗绣等）、针法技法（平针、回针、锁边针、缎针等）、刺绣工具材料、非物质文化遗产保护等话题。
如果用户询问与刺绣无关的内容（如兔儿爷、舞狮、其他非遗项目或任何其他话题），请礼貌地说明你只专注于刺绣文化，并引导用户提问刺绣相关内容。
回答风格：亲切、专业、富有文化底蕴，适当使用刺绣相关的比喻和意象。`
  }
];

// ── 输入锁：模块级，供 stop 按钮随时解锁 ────────
let _replyStopped = false;

function lockInput() {
  _replyStopped = false;
  window._cultureInputLocked = true;
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("textInput");
  const inputArea = sendBtn?.closest(".input-area");
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.disabled = true;
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
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("textInput");
  const inputArea = sendBtn?.closest(".input-area");
  if (sendBtn) sendBtn.disabled = false;
  if (input) input.disabled = false;
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
let _typingTimer = null;
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
      // Hiyori 模型实际表情名（可在 hiyori.model3.json Expressions 里查）
      const map = {
        happy: "f01",
        peace: "f02",
        thoughtful: "f03",
        surprised: "f04",
        gentle: "f05"
      };
      window.live2dModel.expression(map[emotion]);
    } catch (e) { console.warn("表情切换失败:", e); }
  }
};

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
    await appendAIStream(chatHistoryData, question, (res) => {
      chatHistoryData.push({ role: "user", content: question });
      chatHistoryData.push({ role: "assistant", content: res.message });
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

  stopTyping();
  await new Promise(resolve => {
    _typingResolve = resolve;   // ← 存起来，stopTyping 可直接结束 await
    function tick() {
      if (_typingPaused) { _typingResume = tick; return; }
      if (i < message.length) {
        div.innerText = message.slice(0, ++i);
        el.scrollTop = el.scrollHeight;
        _typingTimer = setTimeout(tick, ESTIMATE_INTERVAL);
      } else {
        stopTyping();
        resolve();
      }
    }
    _typingResume = tick;
    tick();
  });

  const lipsyncDuration = Math.max(2000, message.length * 300);
  setTimeout(() => {
    if (typeof window.stopLipsync === "function") window.stopLipsync();
  }, lipsyncDuration);

  if (document.querySelector('.app-wrapper')?.classList.contains('voice-mode')) {
    const preview = message.slice(0, 22);
    const rest = message.slice(22, 44);
    const rest2 = message.length > 44 ? message.slice(44, 60) + '…' : '';
    showSpeechBubble([preview, rest, rest2]);
  }

  updateTtsButtons(false);
  if (typeof onDone === "function") onDone(finalData);
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
      await appendAIStream(chatHistoryData, text, (res) => {
        chatHistoryData.push({ role: "user", content: text });
        chatHistoryData.push({ role: "assistant", content: res.message });
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
    let _baseScale = container.clientWidth * 0.0007;
    let _zoomFactor = 1.1;          // 初始即中位值
    const ZOOM_MIN = 0.8;
    const ZOOM_MAX = 1.4;
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

    // ── 口型同步：TTS 播放时实时驱动嘴部参数 ──
    let _lipsyncTimer = null;
    window._lipsyncActive = false;

    window.startLipsync = function () {
      window._lipsyncActive = true;
      let phase = 0;
      function tick() {
        if (!window._lipsyncActive) {
          // 嘴巴归零
          try { model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0); } catch (e) { }
          return;
        }
        // 用 sin 波模拟自然说话节奏
        phase += 0.18;
        const openY = Math.max(0, Math.sin(phase) * 0.85);
        try {
          model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", openY);
        } catch (e) { }
        _lipsyncTimer = setTimeout(tick, 60);
      }
      tick();
    };

    window.stopLipsync = function () {
      window._lipsyncActive = false;
      if (_lipsyncTimer) { clearTimeout(_lipsyncTimer); _lipsyncTimer = null; }
      try { model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0); } catch (e) { }
    };

    // ── 表情切换（需对应模型实际 Expression 名称）──
    // Hiyori 默认表情名，可打开 hiyori.model3.json 的 Expressions 确认
    try { model.expression("f01"); } catch (e) {
      try { model.expression(0); } catch (e2) { } // fallback 用索引
    }

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
      await appendAIStream(chatHistoryData, text, (res) => {
        chatHistoryData.push({ role: "user", content: text });
        chatHistoryData.push({ role: "assistant", content: res.message });
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
      showRandomGreet()
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
      initTop = rect.top;
      // 切换到绝对坐标模式，脱离 transform 居中
      voiceUI.style.left = initLeft + "px";
      voiceUI.style.top = initTop + "px";
      voiceUI.style.bottom = "auto";
      voiceUI.style.transform = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      voiceUI.style.left = (initLeft + dx) + "px";
      voiceUI.style.top = (initTop + dy) + "px";
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
      voiceUI.style.top = initTop + "px";
      voiceUI.style.bottom = "auto";
      voiceUI.style.transform = "none";
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      voiceUI.style.left = (initLeft + t.clientX - startX) + "px";
      voiceUI.style.top = (initTop + t.clientY - startY) + "px";
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
      hideSpeechBubble();
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
      hideSpeechBubble()
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
      hideSpeechBubble()
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
