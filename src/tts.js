// tts.js - 整体解码播放（无电流声）+ 世代计数器 + 正确的暂停支持
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource = null;
let currentCtx = null;
let currentAnalyser = null;

let _speakGen = 0;
let _speakActive = false;
let _pauseIntent = false;

// ── onStart 回调：第一个音频块真正 start() 后触发 ──
let _onStartCb = null;
let _onStartFired = false;

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
  if (currentSource) { try { currentSource.stop(); } catch (e) { } currentSource = null; }
  if (currentCtx) { try { currentCtx.close(); } catch (e) { } currentCtx = null; }
}

// ── speak(text, onDuration, onStart, onEnd) ──────────
// onStart：第一帧音频真正开始播放时回调（可用于切换按钮状态）
// onEnd：  播放全部结束时回调
export function speak(text, onDuration, onStart, onEnd) {
  if (!text?.trim()) return;

  _speakActive = true;
  _pauseIntent = false;
  _onStartCb = onStart || null;
  _onStartFired = false;

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
          rate: settings.rate ?? 1.2
        })
      });

      if (_speakGen !== myGen) return;
      if (!res.ok || !res.body) { _speakActive = false; _fallback(text, onEnd); return; }

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

      const FIRST_CHUNK_SIZE = 6144;
      const NEXT_CHUNK_SIZE = 4096;
      let isFirst = true;

      const reader = res.body.getReader();
      let buffer = new Uint8Array(0);
      let nextPlayTime = audioCtx.currentTime;
      let totalDuration = 0;
      let lastSource = null;

      const flush = async (force = false) => {
        const minSize = isFirst ? FIRST_CHUNK_SIZE : NEXT_CHUNK_SIZE;
        if (!force && buffer.length < minSize) return;
        if (buffer.length === 0) return;

        const chunk = buffer.slice();
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
          nextPlayTime = startAt + decoded.duration;
          totalDuration += decoded.duration;
          currentSource = source;
          lastSource = source;

          // 第一帧真正 start 后触发 onStart
          if (!_onStartFired && _onStartCb) {
            _onStartFired = true;
            _onStartCb();
          }

          source.onended = () => {
            if (_speakGen === myGen && source === lastSource) {
              _speakActive = false;
              _pauseIntent = false;
              _onStartCb = null;
              _stopAmpLoop();
              if (typeof onEnd === 'function') onEnd();
            }
          };

          if (_pauseIntent && audioCtx.state === "running") {
            audioCtx.suspend();
          }
        } catch (e) {
          console.warn("[TTS] decode 失败，跳过此段:", e.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (_speakGen !== myGen) break;
        if (done) { await flush(true); break; }

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
      if (_speakGen === myGen) _fallback(text, onEnd);
    }
  })();
}

export function pause() {
  if (currentCtx?.state === "running") {
    currentCtx.suspend();
  } else if (_speakActive) {
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
  _onStartCb = null;
  _onStartFired = false;
  _stopPrevious();
  window.speechSynthesis?.cancel();
}

export function isPlaying() {
  if (!_speakActive) return false;
  if (currentCtx) return currentCtx.state === "running";
  return true;
}

export function isPaused() {
  return !!(currentCtx && currentCtx.state === "suspended");
}

function _fallback(text, onEnd) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.onend = onEnd || null;
  window.speechSynthesis?.speak(u);
}
