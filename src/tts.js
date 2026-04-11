// tts.js - 整体解码播放（无电流声）+ 世代计数器 + 正确的暂停支持
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource   = null;
let currentCtx      = null;
let currentAnalyser = null;

// ── 世代计数器：防止多个 speak 并发 ──
let _speakGen = 0;

// ── 意图标志：speak() 被调用后立即为 true，stop() 后立即为 false ──
// 用于解决整体解码期间（currentCtx 还是 null）pause/isPlaying 判断不准的问题
let _speakActive  = false;
let _pauseIntent  = false;   // 用户在音频就绪前就点了暂停，就绪后自动暂停

// ── 实时音量，供口型驱动读取 ──
window._ttsAmplitude = 0;
let _ampRaf = null;

function _startAmpLoop(analyser) {
  const buf = new Uint8Array(analyser.fftSize);
  function loop() {
    if (!currentAnalyser) { window._ttsAmplitude = 0; _ampRaf = null; return; }
    analyser.getByteTimeDomainData(buf);
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

function _stopPrevious() {
  _stopAmpLoop();
  currentAnalyser = null;
  if (currentSource) { try { currentSource.stop(); } catch (e) {} currentSource = null; }
  if (currentCtx)    { try { currentCtx.close();   } catch (e) {} currentCtx    = null; }
}

export function speak(text, onDuration) {
  if (!text?.trim()) return;

  _speakActive = true;
  _pauseIntent = false;

  const myGen = ++_speakGen;
  _stopPrevious();

  (async () => {
    try {
      const settings = window._ttsSettings || {};
      const res = await fetch(TTS_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          volume: settings.volume ?? 50,
          rate:   settings.rate   ?? 1.2
        })
      });

      if (_speakGen !== myGen) return;
      if (!res.ok || !res.body) { _speakActive = false; _fallback(text); return; }

      // ── AudioContext ──────────────────────────────
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (_speakGen !== myGen) { audioCtx.close(); return; }

      currentCtx = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(audioCtx.destination);
      currentAnalyser = analyser;
      _startAmpLoop(analyser);

      // ── 流式解码：攒够足够字节再解码，帧边界对齐无电流声 ──
      // CosyVoice 每个 WebSocket 消息约 3-6KB（完整 MP3 帧）
      // 攒 6KB（约 14 帧）就能干净解码，无需等全部收完
      const FIRST_CHUNK_SIZE = 6144;    // 6KB：首块，尽快起播
      const NEXT_CHUNK_SIZE  = 4096;    // 4KB：后续块
      let isFirst = true;

      const reader = res.body.getReader();
      let buffer = new Uint8Array(0);
      let nextPlayTime = audioCtx.currentTime;
      let totalDuration = 0;

      const flush = async (force = false) => {
        const minSize = isFirst ? FIRST_CHUNK_SIZE : NEXT_CHUNK_SIZE;
        if (!force && buffer.length < minSize) return;
        if (buffer.length === 0) return;

        const chunk = buffer.slice();   // 复制当前缓冲
        buffer = new Uint8Array(0);
        isFirst = false;

        if (_speakGen !== myGen) return;

        try {
          const decoded = await audioCtx.decodeAudioData(chunk.buffer);
          if (_speakGen !== myGen) return;

          const source = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(analyser);

          const startAt = Math.max(nextPlayTime, audioCtx.currentTime);
          source.start(startAt);
          nextPlayTime  = startAt + decoded.duration;
          totalDuration += decoded.duration;
          currentSource = source;

          // 最后一个 source 播完时清理
          source.onended = () => {
            if (_speakGen === myGen) {
              _speakActive = false;
              _pauseIntent = false;
              _stopAmpLoop();
            }
          };

          // 应用暂停意图
          if (_pauseIntent && audioCtx.state === "running") {
            audioCtx.suspend();
          }
        } catch (e) {
          // 帧不完整（极少发生）：丢弃这段，继续
          console.warn("[TTS] decode 失败，跳过此段:", e.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (_speakGen !== myGen) break;
        if (done) { await flush(true); break; }

        // 合并到 buffer
        const merged = new Uint8Array(buffer.length + value.length);
        merged.set(buffer);
        merged.set(value, buffer.length);
        buffer = merged;

        await flush();
      }

      if (typeof onDuration === "function" && totalDuration > 0) {
        onDuration(totalDuration);
      }

    } catch (e) {
      console.error("[TTS] 异常:", e);
      _speakActive = false;
      _stopAmpLoop();
      if (_speakGen === myGen) _fallback(text);
    }
  })();
}

export function pause() {
  if (currentCtx?.state === "running") {
    // 音频已就绪，直接暂停
    currentCtx.suspend();
  } else if (_speakActive) {
    // 音频还在加载中，记录意图，就绪后自动暂停
    _pauseIntent = true;
  }
  window.speechSynthesis?.pause();
}

export function resume() {
  _pauseIntent = false;
  if (currentCtx?.state === "suspended") {
    currentCtx.resume();
  }
  window.speechSynthesis?.resume();
}

export function stop() {
  _speakGen++;
  _speakActive = false;
  _pauseIntent = false;
  _stopPrevious();
  window.speechSynthesis?.cancel();
}

export function isPlaying() {
  // _speakActive 在等待期间为 true，音频播放完后为 false
  // currentCtx 就绪后补充判断暂停状态
  if (!_speakActive) return false;
  // 如果已有 context，以 context 状态为准
  if (currentCtx) return currentCtx.state === "running";
  // context 还没创建（还在收集字节），但 speak 已被调用
  return true;
}
export function isPaused() {
  return !!(currentCtx && currentCtx.state === "suspended");
}

function _fallback(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  window.speechSynthesis?.speak(u);
}