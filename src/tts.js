// tts.js - 流式播放，收到第一块立刻开始播
const TTS_PROXY = "http://localhost:3001/tts";
let currentSource = null;
let currentCtx = null;
let _lipsyncRaf = null;
let _lipsyncAnalyser = null;

// ── 音量驱动口型（替换原来的 sin 波）────────
function _startAudioLipsync(audioCtx) {
  // 复用传入的 audioCtx，创建分析器节点
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.5;
  const data = new Uint8Array(analyser.frequencyBinCount);
  _lipsyncAnalyser = analyser;

  // 把分析器挂到输出，这样所有 source 连到 destination 前都经过它
  // 注意：需要在 source.connect 时改成连 analyser，再由 analyser 连 destination
  // 见下方 flush() 里的修改

  function tick() {
    analyser.getByteFrequencyData(data);
    // 取人声主频段 80~3000Hz（fftSize=256 时约 index 2~20）
    const slice = data.slice(2, 20);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const mouthValue = Math.min(1, avg / 70);

    try {
      const m = window.live2dModel;
      if (m) m.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', mouthValue);
    } catch (e) { }

    _lipsyncRaf = requestAnimationFrame(tick);
  }
  tick();
  return analyser; // 返回供 source 连接用
}

function _stopAudioLipsync() {
  if (_lipsyncRaf) { cancelAnimationFrame(_lipsyncRaf); _lipsyncRaf = null; }
  _lipsyncAnalyser = null;
  try {
    const m = window.live2dModel;
    if (m) m.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);
  } catch (e) { }
}

export function speak(text, onDuration) {
  if (!text?.trim()) return;
  stop();
  (async () => {
    try {
      const settings = (typeof window !== "undefined" && window._ttsSettings) || {};
      const res = await fetch(TTS_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          volume: settings.volume ?? 50,
          rate: settings.rate ?? 1.2
        })
      });
      if (!res.ok || !res.body) { _fallback(text); return; }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      currentCtx = audioCtx;

      // 启动音量驱动口型，拿到 analyser 节点 ↓
      const analyser = _startAudioLipsync(audioCtx);

      const reader = res.body.getReader();
      let startTime = audioCtx.currentTime;
      let buffer = new Uint8Array(0);
      let totalDuration = 0;
      const MIN_CHUNK = 8192;

      const append = (data) => {
        const merged = new Uint8Array(buffer.length + data.length);
        merged.set(buffer);
        merged.set(data, buffer.length);
        buffer = merged;
      };

      const flush = async (force = false) => {
        if (buffer.length === 0) return;
        if (!force && buffer.length < MIN_CHUNK) return;
        const chunk = buffer.buffer.slice(0, buffer.byteLength);
        buffer = new Uint8Array(0);
        try {
          const decoded = await audioCtx.decodeAudioData(chunk);
          const source = audioCtx.createBufferSource();
          source.buffer = decoded;
          // 改成：source → analyser → destination ↓
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          source.start(Math.max(startTime, audioCtx.currentTime));
          startTime = Math.max(startTime, audioCtx.currentTime) + decoded.duration;
          totalDuration += decoded.duration;
          currentSource = source;
        } catch (e) { /* 帧不完整，忽略 */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) { await flush(true); break; }
        append(value);
        await flush();
      }

      if (typeof onDuration === "function" && totalDuration > 0) {
        onDuration(totalDuration);
      }
      // 音频播完后停口型（留 200ms 缓冲让最后一帧归零自然）↓
      setTimeout(_stopAudioLipsync, totalDuration * 1000 + 200);

    } catch (e) {
      console.error("[TTS] 异常:", e);
      _stopAudioLipsync();
      _fallback(text);
    }
  })();
}

export function pause() {
  if (currentCtx && currentCtx.state === "running") currentCtx.suspend();
  window.speechSynthesis?.pause();
}

export function resume() {
  if (currentCtx && currentCtx.state === "suspended") currentCtx.resume();
  window.speechSynthesis?.resume();
}

export function stop() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) { }
    currentSource = null;
  }
  if (currentCtx) {
    try { currentCtx.close(); } catch (e) { }
    currentCtx = null;
  }
  // 停止口型 ↓
  _stopAudioLipsync();
  window.speechSynthesis?.cancel();
}

export function isPlaying() {
  return !!(currentCtx && currentCtx.state === "running");
}

function _fallback(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  window.speechSynthesis.speak(u);
}
