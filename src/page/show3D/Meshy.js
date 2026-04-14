// meshy.js — Meshy Text-to-3D API 集成

// ── 配置区 ──────────────────────────────────────
const MESHY_API_KEY = "msy_9BOESjVcI8ETqeOnFM6U8wkFzUH6YCdyuL3G"; // ← 替换成你的 Meshy API Key
const MESHY_BASE    = "https://api.meshy.ai/openapi/v2/text-to-3d";
// ────────────────────────────────────────────────

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT  = 300000; // 5 分钟

// ── 跨页面持久化：存在 window 上，导航后可恢复 ──
// window._meshyTask = { taskId, prompt, startTime }
// window._meshyResult = { glbUrl, prompt }   ← 生成完成后保留结果

// ── 状态提示（带淡出）───────────────────────────
let _fadeTimer = null;

function setStatus(msg, isError = false, autoFade = false) {
  const el = document.getElementById("meshyStatus");
  if (!el) return;

  if (_fadeTimer) { clearTimeout(_fadeTimer); _fadeTimer = null; }

  if (!msg) {
    el.style.transition = "opacity 0.4s";
    el.style.opacity = "0";
    setTimeout(() => { el.classList.remove("visible"); el.textContent = ""; el.style.opacity = "1"; }, 400);
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
  const btn  = document.getElementById("meshyGenBtn");
  const text = document.getElementById("meshyBtnText");
  const inp  = document.getElementById("meshyPrompt");
  if (!btn || !text) return;
  btn.disabled = loading;
  if (inp) inp.disabled = loading;
  text.textContent = loading ? "⏳ 生成中..." : "🪄 生成";
}

// ── 模型加载到 model-viewer ──────────────────────
function loadGeneratedModel(glbUrl, label) {
  const viewBox = document.getElementById("modelViewBox");
  if (!viewBox) return;

  // 移除空状态提示
  viewBox.querySelector(".model-empty-hint")?.remove();

  // 复用或新建 model-viewer
  let viewer = document.getElementById("mainModelViewer");
  if (!viewer) {
    viewer = document.createElement("model-viewer");
    viewer.id = "mainModelViewer";
    // 与原有 hasModel 时的样式完全一致
    viewer.style.cssText = "width:100%;height:100%;background:transparent;";
    viewBox.appendChild(viewer);
  }

  viewer.setAttribute("src", glbUrl);
  viewer.setAttribute("auto-rotate", "");
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("shadow-intensity", "1");
  viewer.setAttribute("exposure", "1");

  // 更新展品信息卡
  const nameEl  = document.getElementById("modelInfoName");
  const introEl = document.getElementById("modelIntroText");
  if (nameEl)  nameEl.textContent  = label || "AI 生成展品";
  if (introEl) introEl.textContent = "由 Meshy AI 根据您的描述生成的 3D 展品模型。";
}

// ── 轮询核心（抽出供恢复调用）──────────────────
async function pollTask(taskId, prompt) {
  const deadline = Date.now() + POLL_TIMEOUT;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    // 检查任务是否仍然有效（用户没有开新任务）
    if (window._meshyTask?.taskId !== taskId) return;

    let task;
    try {
      const res = await fetch(`${MESHY_BASE}/${taskId}`, {
        headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
      });
      if (!res.ok) throw new Error(`轮询失败 ${res.status}`);
      task = await res.json();
    } catch (e) {
      setStatus(`❌ ${e.message}`, true);
      setBtnLoading(false);
      window._meshyTask = null;
      return;
    }

    // 更新进度（DOM 可能已重建，每次都重新查询）
    if (task.progress !== undefined) {
      setStatus(`⚙️ 建模中 ${task.progress}%...`);
    }

    if (task.status === "SUCCEEDED") {
      const glbUrl = task.model_urls?.glb || task.model_urls?.obj;
      if (!glbUrl) {
        setStatus("❌ 未找到模型链接", true, true);
        setBtnLoading(false);
        window._meshyTask = null;
        return;
      }

      // 保存结果供切页恢复用
      window._meshyResult = { glbUrl, prompt };
      window._meshyTask   = null;

      setStatus("✅ 生成完成！", false, true);  // 2.5s 后淡出
      loadGeneratedModel(glbUrl, prompt.slice(0, 20));
      setBtnLoading(false);
      return;

    } else if (task.status === "FAILED") {
      setStatus(`❌ ${task.task_error?.message || "生成失败"}`, true, true);
      setBtnLoading(false);
      window._meshyTask = null;
      return;

    } else if (task.status === "EXPIRED") {
      setStatus("❌ 任务超时，请重新生成", true, true);
      setBtnLoading(false);
      window._meshyTask = null;
      return;
    }
    // PENDING / IN_PROGRESS → 继续轮询
  }

  setStatus("❌ 等待超时，请重试", true, true);
  setBtnLoading(false);
  window._meshyTask = null;
}

// ── 主入口：提交新任务 ───────────────────────────
window.meshyGenerate = async function () {
  const input  = document.getElementById("meshyPrompt");
  const prompt = input?.value?.trim();
  if (!prompt) {
    setStatus("请先输入描述内容", true, true);  // 2.5s 后淡出
    return;
  }

  setBtnLoading(true);
  setStatus("🚀 正在提交生成任务...");

  try {
    const createRes = await fetch(MESHY_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "preview",
        prompt,
        art_style: "realistic",
        negative_prompt: "low quality, blurry",
        topology: "quad",
        target_polycount: 30000,
        should_remesh: true
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.message || `创建失败 ${createRes.status}`);
    }

    const { result: taskId } = await createRes.json();

    // 持久化任务信息
    window._meshyTask = { taskId, prompt, startTime: Date.now() };
    window._meshyResult = null;

    setStatus(`📋 任务已提交，AI 正在建模，请稍候...`);
    await pollTask(taskId, prompt);

  } catch (e) {
    console.error("[Meshy]", e);
    setStatus(`❌ ${e.message}`, true, true);
    setBtnLoading(false);
    window._meshyTask = null;
  }
};

// ── 页面重建后自动恢复状态 ──────────────────────
// renderApp 每次重建 DOM 后调用 __rebindScriptEvents
// 在此检查是否有未完成任务或已完成结果
function meshyRestoreState() {
  // 有已完成的结果 → 直接恢复展示
  if (window._meshyResult) {
    const { glbUrl, prompt } = window._meshyResult;
    loadGeneratedModel(glbUrl, prompt.slice(0, 20));
    // 恢复 input 里的提示词
    const inp = document.getElementById("meshyPrompt");
    if (inp) inp.value = prompt;
    return;
  }

  // 有进行中的任务 → 恢复轮询状态显示
  if (window._meshyTask) {
    const { taskId, prompt } = window._meshyTask;
    // 检查是否超时
    if (Date.now() - window._meshyTask.startTime > POLL_TIMEOUT) {
      window._meshyTask = null;
      return;
    }
    const inp = document.getElementById("meshyPrompt");
    if (inp) inp.value = prompt;
    setBtnLoading(true);
    setStatus(`⚙️ 生成任务进行中，请稍候...`);
    // 继续轮询（之前的 pollTask 循环还在后台跑，这里只更新 UI）
  }
}

// 挂载到 __rebindScriptEvents 执行后的钩子
const _origRebind = window.__rebindScriptEvents;
window.__rebindScriptEvents = function () {
  if (_origRebind) _origRebind();
  meshyRestoreState();
};

// 回车触发
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement?.id === "meshyPrompt") {
    window.meshyGenerate();
  }
});

// 首次加载时也恢复
meshyRestoreState();