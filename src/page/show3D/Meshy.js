// Meshy.js — Meshy Text-to-3D API 集成 + AI 展品介绍 + TTS 播放
import { speak, pause, resume, stop, isPlaying, isPaused } from '../../tts.js';

// ── 配置区 ──────────────────────────────────────
const MESHY_API_KEY = "msy_9BOESjVcI8ETqeOnFM6U8wkFzUH6YCdyuL3G";
const MESHY_API_URL = "/meshy-api/openapi/v2/text-to-3d";
const MESHY_GLB_PROXY = "/meshy-glb";
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 300000; // 5 分钟

const QWEN_API_KEY = "sk-bb2f9a5781d247568259cb014695d29a";
const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// ── 跨页面持久化 ─────────────────────────────────
// window._meshyTask   = { taskId, prompt, startTime }
// window._meshyResult = { glbUrl, prompt, intro }
// window.meshyTask    = { status, resultUrl, prompt }

window.meshyTask = window.meshyTask || { status: "idle" };

// ── 状态提示 ─────────────────────────────────────
let _fadeTimer = null;

function setStatus(msg, isError = false, autoFade = false) {
  const el = document.getElementById("meshyStatus");
  if (!el) return;
  if (_fadeTimer) { clearTimeout(_fadeTimer); _fadeTimer = null; }

  if (!msg) {
    el.style.transition = "opacity 0.4s";
    el.style.opacity = "0";
    setTimeout(() => {
      el.classList.remove("visible");
      el.textContent = "";
      el.style.opacity = "1";
    }, 400);
    return;
  }

  el.style.transition = "none";
  el.style.opacity = "1";
  el.textContent = msg;
  el.style.color = isError ? "#c0392b" : "#8a6030";
  el.classList.add("visible");

  if (autoFade) {
    _fadeTimer = setTimeout(() => {
      el.style.transition = "opacity 0.8s ease";
      el.style.opacity = "0";
      setTimeout(() => {
        el.classList.remove("visible");
        el.textContent = "";
        el.style.opacity = "1";
        el.style.transition = "none";
      }, 800);
    }, 2500);
  }
}

function setBtnLoading(loading) {
  const btn = document.getElementById("meshyGenBtn");
  const text = document.getElementById("meshyBtnText");
  const inp = document.getElementById("meshyPrompt");
  if (!btn || !text) return;
  btn.disabled = loading;
  if (inp) inp.disabled = loading;
  text.textContent = loading ? "⏳ 生成中..." : "🪄 生成";
}

// ── TTS 按钮状态管理 ──────────────────────────────
function _setTtsBtnState(state) {
  const icon = document.getElementById("meshyTtsBtnIcon");
  const label = document.getElementById("meshyTtsBtnLabel");
  if (!icon || !label) return;
  if (state === "playing") {
    icon.textContent = "⏸";
    label.textContent = " 暂停朗读";
  } else if (state === "paused") {
    icon.textContent = "▶️";
    label.textContent = " 继续朗读";
  } else {
    icon.textContent = "🔊";
    label.textContent = " 朗读介绍";
  }
}

function _enableTtsBtn() {
  const btn = document.getElementById("meshyTtsBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";
}

// 轮询直到播放自然结束，恢复按钮到初始状态
let _watchTimer = null;
function _watchPlayEnd() {
  if (_watchTimer) clearInterval(_watchTimer);
  _watchTimer = setInterval(() => {
    if (!isPlaying() && !isPaused()) {
      clearInterval(_watchTimer);
      _watchTimer = null;
      _setTtsBtnState("idle");
    }
  }, 500);
}

// ── 注入 TTS 按钮到展品信息卡 ────────────────────
function injectTtsButton() {
  if (document.getElementById("meshyTtsBtn")) return;

  const card = document.querySelector(".model-info-card");
  if (!card) return;

  const btn = document.createElement("button");
  btn.id = "meshyTtsBtn";
  btn.disabled = true;
  btn.innerHTML = `<span id="meshyTtsBtnIcon">🔊</span><span id="meshyTtsBtnLabel"> 朗读介绍</span>`;
  btn.style.cssText = `
    margin-top: 14px;
    padding: 7px 20px;
    border: none;
    border-radius: 20px;
    background: #c8a96e;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: not-allowed;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: background 0.2s, opacity 0.2s, transform 0.1s;
    opacity: 0.4;
  `;

  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) btn.style.background = "#b8934e";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.background = "#c8a96e";
  });
  btn.addEventListener("mousedown", () => {
    if (!btn.disabled) btn.style.transform = "scale(0.96)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "scale(1)";
  });

  btn.addEventListener("click", () => {
    const introEl = document.getElementById("modelIntroText");
    const text = introEl?.textContent?.trim();
    if (!text || text === "✨ 正在生成展品介绍...") return;

    if (isPlaying()) {
      pause();
      _setTtsBtnState("paused");
    } else if (isPaused()) {
      resume();
      _setTtsBtnState("playing");
      _watchPlayEnd();
    } else {
      speak(text, null);
      _setTtsBtnState("playing");
      _watchPlayEnd();
    }
  });

  card.appendChild(btn);
}

// ── AI 生成展品介绍 ───────────────────────────────
async function generateIntro(prompt) {
  try {
    const res = await fetch(QWEN_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-turbo",
        messages: [
          {
            role: "system",
            content: "你是一位非物质文化遗产讲解员，语言亲切、生动。根据用户提供的展品名称或描述，用100-150字介绍该展品的历史背景、工艺特点和文化价值。只输出介绍正文，不要标题，不要多余内容。"
          },
          {
            role: "user",
            content: `请介绍这个展品：${prompt}`
          }
        ]
      })
    });

    if (!res.ok) throw new Error(`AI 请求失败 ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[Meshy] AI 介绍生成失败:", e);
    return null;
  }
}

// ── 将生成的模型注入 model-viewer ────────────────
function loadGeneratedModel(glbUrl, label, intro) {
  const viewBox = document.getElementById("modelViewBox");
  if (!viewBox) return;

  viewBox.querySelector(".model-empty-hint")?.remove();

  const old = document.getElementById("mainModelViewer");
  if (old) old.remove();

  const viewer = document.createElement("model-viewer");
  viewer.id = "mainModelViewer";
  viewer.setAttribute("src", glbUrl);
  viewer.setAttribute("auto-rotate", "");
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("shadow-intensity", "1");
  viewer.setAttribute("exposure", "1");
  viewer.style.cssText = "width:100%;height:100%;background:transparent;";
  viewBox.appendChild(viewer);

  // 更新展品信息卡
  const nameEl = document.getElementById("modelInfoName");
  const introEl = document.getElementById("modelIntroText");
  if (nameEl) nameEl.textContent = label || "AI 生成展品";
  if (introEl) introEl.textContent = intro || "✨ 正在生成展品介绍...";

  // 注入 TTS 按钮（已存在则跳过）
  injectTtsButton();

  // 有现成 intro 直接启用按钮
  if (intro) _enableTtsBtn();
}

// ── 模型加载后：异步拉取 AI 介绍 ─────────────────
async function afterModelLoaded(glbUrl, prompt) {
  const intro = await generateIntro(prompt);
  const finalIntro = intro || "由 Meshy AI 根据您的描述生成的 3D 展品模型。";

  const introEl = document.getElementById("modelIntroText");
  if (introEl) introEl.textContent = finalIntro;

  // 持久化 intro 供切页恢复用
  if (window._meshyResult) window._meshyResult.intro = finalIntro;

  // AI 介绍就绪，启用 TTS 按钮
  _enableTtsBtn();
}

// ── 轮询任务状态 ─────────────────────────────────
async function pollTask(taskId, prompt) {
  const deadline = Date.now() + POLL_TIMEOUT;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    if (window._meshyTask?.taskId !== taskId) return;

    let task;
    try {
      const res = await fetch(`${MESHY_API_URL}/${taskId}`, {
        headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
      });
      if (!res.ok) throw new Error(`轮询失败 ${res.status}`);
      task = await res.json();
    } catch (e) {
      setStatus(`❌ ${e.message}`, true);
      setBtnLoading(false);
      window._meshyTask = null;
      window.meshyTask = { status: "idle" };
      return;
    }

    if (task.progress !== undefined) {
      setStatus(`⚙️ 建模中 ${task.progress}%...`);
    }

    if (task.status === "SUCCEEDED") {
      const rawGlbUrl = task.model_urls?.glb || task.model_urls?.obj;
      if (!rawGlbUrl) {
        setStatus("❌ 未找到模型链接", true, true);
        setBtnLoading(false);
        window._meshyTask = null;
        window.meshyTask = { status: "idle" };
        return;
      }

      const glbUrl = `${MESHY_GLB_PROXY}?url=${encodeURIComponent(rawGlbUrl)}`;

      window._meshyResult = { glbUrl, prompt, intro: null };
      window._meshyTask = null;
      window.meshyTask = { status: "success", resultUrl: glbUrl, prompt };

      setStatus("✅ 生成完成！", false, true);
      setBtnLoading(false);

      // 先渲染模型（占位文字），再异步生成 AI 介绍
      loadGeneratedModel(glbUrl, prompt.slice(0, 20), null);
      afterModelLoaded(glbUrl, prompt); // 不 await，不阻塞
      return;

    } else if (task.status === "FAILED") {
      setStatus(`❌ ${task.task_error?.message || "生成失败"}`, true, true);
      setBtnLoading(false);
      window._meshyTask = null;
      window.meshyTask = { status: "idle" };
      return;

    } else if (task.status === "EXPIRED") {
      setStatus("❌ 任务超时，请重新生成", true, true);
      setBtnLoading(false);
      window._meshyTask = null;
      window.meshyTask = { status: "idle" };
      return;
    }
  }

  setStatus("❌ 等待超时，请重试", true, true);
  setBtnLoading(false);
  window._meshyTask = null;
  window.meshyTask = { status: "idle" };
}

// ── 主入口：提交新任务 ───────────────────────────
window.meshyGenerate = async function () {
  const input = document.getElementById("meshyPrompt");
  const prompt = input?.value?.trim();
  if (!prompt) {
    setStatus("请先输入描述内容", true, true);
    return;
  }

  stop();
  _setTtsBtnState("idle");

  setBtnLoading(true);
  setStatus("🚀 正在生成预览模型...");

  try {
    // ── 1️⃣ preview 阶段 ─────────────────────
    const previewRes = await fetch(MESHY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "preview",
        prompt,
        art_style: "realistic",
      })
    });

    if (!previewRes.ok) throw new Error("preview 创建失败");

    const { result: previewTaskId } = await previewRes.json();

    const previewTask = await pollTaskUntilDone(previewTaskId);

    const previewGlb = previewTask.model_urls?.glb;

    if (!previewGlb) throw new Error("preview 没有返回模型");

    // 👉 先显示白模（提升体验）
    const previewUrl = `${MESHY_GLB_PROXY}?url=${encodeURIComponent(previewGlb)}`;
    loadGeneratedModel(previewUrl, prompt.slice(0, 20), null);

    // ── 2️⃣ textured 阶段 ─────────────────────
    setStatus("🎨 正在生成贴图（高质量模型）...");

    const texRes = await fetch(MESHY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "refine",
        preview_task_id: previewTaskId,   // ⭐ 核心
        texture_resolution: 1024,
      })
    });

    if (!texRes.ok) throw new Error("textured 创建失败");

    const { result: texTaskId } = await texRes.json();

    const texTask = await pollTaskUntilDone(texTaskId);

    const finalGlb = texTask.model_urls?.glb;

    if (!finalGlb) throw new Error("textured 没有返回模型");

    const finalUrl = `${MESHY_GLB_PROXY}?url=${encodeURIComponent(finalGlb)}`;

    // 👉 覆盖成最终模型（带贴图）
    loadGeneratedModel(finalUrl, prompt.slice(0, 20), null);

    // 👉 异步生成介绍
    afterModelLoaded(finalUrl, prompt);

    setStatus("✅ 生成完成！", false, true);
    setBtnLoading(false);

  } catch (e) {
    console.error(e);
    setStatus(`❌ ${e.message}`, true, true);
    setBtnLoading(false);
  }
};

// ── 获取模型贴图 ───────────────────────────
async function pollTaskUntilDone(taskId) {
  const deadline = Date.now() + POLL_TIMEOUT;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const res = await fetch(`${MESHY_API_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` }
    });

    if (!res.ok) throw new Error(`轮询失败 ${res.status}`);

    const task = await res.json();

    if (task.progress !== undefined) {
      setStatus(`⚙️ 处理中 ${task.progress}%...`);
    }

    if (task.status === "SUCCEEDED") {
      return task;
    }

    if (task.status === "FAILED") {
      throw new Error(task.task_error?.message || "生成失败");
    }
  }

  throw new Error("等待超时");
}

// ── 页面 DOM 重建后恢复状态 ──────────────────────
function meshyRestoreState() {
  if (window._meshyResult) {
    const { glbUrl, prompt, intro } = window._meshyResult;
    loadGeneratedModel(glbUrl, prompt.slice(0, 20), intro);
    if (!intro) {
      // intro 还没拿到，重新生成
      afterModelLoaded(glbUrl, prompt);
    }
    const inp = document.getElementById("meshyPrompt");
    if (inp) inp.value = prompt;
    return;
  }

  if (window._meshyTask) {
    const { prompt, startTime } = window._meshyTask;
    if (Date.now() - startTime > POLL_TIMEOUT) {
      window._meshyTask = null;
      window.meshyTask = { status: "idle" };
      return;
    }
    const inp = document.getElementById("meshyPrompt");
    if (inp) inp.value = prompt;
    setBtnLoading(true);
    setStatus("⚙️ 生成任务进行中，请稍候...");
  }
}

// 挂载到 __rebindScriptEvents 钩子
const _origRebind = window.__rebindScriptEvents;
window.__rebindScriptEvents = function () {
  if (_origRebind) _origRebind();
  meshyRestoreState();
};

// 回车触发生成
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement?.id === "meshyPrompt") {
    window.meshyGenerate();
  }
});

// 首次加载恢复
meshyRestoreState();
