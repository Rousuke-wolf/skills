// tts.js - 流式播放 + 音频分析（供口型驱动使用）
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource   = null;
let currentCtx      = null;
let currentAnalyser = null;   // ← 新增：AnalyserNode

// ── 暴露实时音量（0~1），供 script.js 口型驱动读取 ──
window._ttsAmplitude = 0;
let _ampRaf = null;

function _startAmpLoop(analyser) {
  const buf = new Uint8Array(analyser.fftSize);
  function loop() {
    if (!currentAnalyser) { window._ttsAmplitude = 0; _ampRaf = null; return; }
    analyser.getByteTimeDomainData(buf);
    // 计算均方根振幅，放大后映射到 0~1
    // 语音信号 RMS 通常在 0.02~0.15，乘以 8 后得到有效范围
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    window._ttsAmplitude = Math.min(1, Math.sqrt(sum / buf.length) * 8);
    _ampRaf = requestAnimationFrame(loop);
  }
  loop();
}

function _stopAmpLoop() {
  if (_ampRaf) { cancelAnimationFrame(_ampRaf); _ampRaf = null; }
  window._ttsAmplitude = 0;
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

      // ── 创建 AnalyserNode，插入音频图 ──
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize         = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(audioCtx.destination);
      currentAnalyser = analyser;
      _startAmpLoop(analyser);

      const reader = res.body.getReader();
      let startTime    = audioCtx.currentTime;
      let buffer       = new Uint8Array(0);
      let totalDuration = 0;
      const MIN_CHUNK  = 8192;

      const append = (data) => {
        const merged = new Uint8Array(buffer.length + data.length);
        merged.set(buffer); merged.set(data, buffer.length);
        buffer = merged;
      };

      const flush = async (force = false) => {
        if (buffer.length === 0) return;
        if (!force && buffer.length < MIN_CHUNK) return;
        const chunk = buffer.buffer.slice(0, buffer.byteLength);
        buffer = new Uint8Array(0);
        try {
          const decoded = await audioCtx.decodeAudioData(chunk);
          const source  = audioCtx.createBufferSource();
          source.buffer = decoded;
          // source → analyser → destination（不再直连 destination）
          source.connect(analyser);
          source.start(Math.max(startTime, audioCtx.currentTime));
          startTime     = Math.max(startTime, audioCtx.currentTime) + decoded.duration;
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
      _stopAmpLoop();
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
  _stopAmpLoop();
  currentAnalyser = null;
  if (currentSource) { try { currentSource.stop(); } catch (e) {} currentSource = null; }
  if (currentCtx)    { try { currentCtx.close();  } catch (e) {} currentCtx    = null; }
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
