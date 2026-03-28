// tts.js - 流式播放，收到第一块立刻开始播
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource = null;
let currentCtx = null;

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
          rate:   settings.rate   ?? 1.2
        })
      });

      if (!res.ok || !res.body) { _fallback(text); return; }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      currentCtx = audioCtx;

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
          source.connect(audioCtx.destination);
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

      // 流结束后回调真实时长
      if (typeof onDuration === "function" && totalDuration > 0) {
        onDuration(totalDuration);
      }

    } catch (e) {
      console.error("[TTS] 异常:", e);
      _fallback(text);
    }
  })();
}

// ── 暂停 ─────────────────────────────────────
export function pause() {
  if (currentCtx && currentCtx.state === "running") {
    currentCtx.suspend();
  }
  window.speechSynthesis?.pause();
}

// ── 恢复 ─────────────────────────────────────
export function resume() {
  if (currentCtx && currentCtx.state === "suspended") {
    currentCtx.resume();
  }
  window.speechSynthesis?.resume();
}

// ── 停止 ─────────────────────────────────────
export function stop() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) { }
    currentSource = null;
  }
  if (currentCtx) {
    try { currentCtx.close(); } catch (e) { }
    currentCtx = null;
  }
  window.speechSynthesis?.cancel();
}

// ── 查询是否正在播放 ─────────────────────────
export function isPlaying() {
  return !!(currentCtx && currentCtx.state === "running");
}

function _fallback(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  window.speechSynthesis.speak(u);
}