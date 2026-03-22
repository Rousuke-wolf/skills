// tts.js - 流式播放，收到第一块音频立刻开始播
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource = null;
let currentCtx = null;

export async function speak(text) {
  if (!text?.trim()) return;
  stop();

  try {
    const res = await fetch(TTS_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok || !res.body) { _fallback(text); return; }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    currentCtx = audioCtx;

    const reader = res.body.getReader();
    let startTime = audioCtx.currentTime;
    let buffer = new Uint8Array(0);
    const MIN_CHUNK = 8192; // 积累够 8KB 再解码，避免 mp3 帧不完整

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

        // 把每段排队在上一段结束后播放
        source.start(Math.max(startTime, audioCtx.currentTime));
        startTime = Math.max(startTime, audioCtx.currentTime) + decoded.duration;
        currentSource = source;
      } catch (e) {
        // mp3 帧不完整解码失败时忽略，等下次积累更多再试
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) { await flush(true); break; }
      append(value);
      await flush();
    }

  } catch (e) {
    console.error("[TTS] 异常:", e);
    _fallback(text);
  }
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
  window.speechSynthesis?.cancel();
}

function _fallback(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  window.speechSynthesis.speak(u);
}