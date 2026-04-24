// tts-teach.js — 教学页专用 TTS，流式解码（低延迟 + 无电流声）

const TTS_TEACH_PROXY = "http://localhost:3001/tts";
const TEACH_VOICE     = "longling_v2";   // 教学页音色，改这里切换

let _teachCtx      = null;
let _teachSource   = null;
let _teachAnalyser = null;
let _teachGen      = 0;
let _teachFallbackActive = false;   // 标记是否在走 fallback 路径

window._teachAmplitude = 0;
let _teachRaf = null;

function _startTeachAmpLoop(analyser) {
  const buf = new Uint8Array(analyser.fftSize);
  function loop() {
    if (!_teachAnalyser) { window._teachAmplitude = 0; _teachRaf = null; return; }
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    window._teachAmplitude = Math.min(1, Math.sqrt(sum / buf.length) * 8);
    _teachRaf = requestAnimationFrame(loop);
  }
  loop();
}

function _stopTeachAmpLoop() {
  if (_teachRaf) { cancelAnimationFrame(_teachRaf); _teachRaf = null; }
  window._teachAmplitude = 0;
}

function _stopTeachPrevious() {
  _stopTeachAmpLoop();
  _teachAnalyser = null;
  if (_teachSource) { try { _teachSource.stop(); } catch (e) {} _teachSource = null; }
  if (_teachCtx)    { try { _teachCtx.close();   } catch (e) {} _teachCtx    = null; }
  // Fix: 同步清掉 speechSynthesis 队列，防止 fallback utterance 残留
  window.speechSynthesis?.cancel();
  _teachFallbackActive = false;
}

export function teachStop() {
  _teachGen++;
  _stopTeachPrevious();   // 已包含 speechSynthesis.cancel()
}

export function teachSpeak(text, onEnd) {
  if (!text?.trim()) return;

  const myGen = ++_teachGen;
  _teachFallbackActive = false;
  _stopTeachPrevious();

  // Fix: 带 30 秒超时的 AbortController，防止 fetch 挂起后触发幽灵 fallback
  const abortCtrl  = new AbortController();
  const abortTimer = setTimeout(() => abortCtrl.abort(), 30000);

  (async () => {
    try {
      const settings = window._ttsSettings || {};
      const res = await fetch(TTS_TEACH_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          volume: settings.volume ?? 50,
          rate:   settings.rate   ?? 1.0,
          voice:  TEACH_VOICE,
        }),
        signal: abortCtrl.signal
      });

      clearTimeout(abortTimer);

      if (_teachGen !== myGen) return;
      if (!res.ok || !res.body) { _teachFallback(text, onEnd); return; }

      // ── AudioContext ──────────────────────────────────
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (_teachGen !== myGen) { audioCtx.close(); return; }

      _teachCtx = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize               = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(audioCtx.destination);
      _teachAnalyser = analyser;
      _startTeachAmpLoop(analyser);

      // ── 流式解码 ──────────────────────────────────────
      const FIRST_CHUNK_SIZE = 6144;
      const NEXT_CHUNK_SIZE  = 4096;
      let isFirst = true;

      const reader     = res.body.getReader();
      let buffer       = new Uint8Array(0);
      let nextPlayTime = audioCtx.currentTime;

      const flush = async (force = false) => {
        const minSize = isFirst ? FIRST_CHUNK_SIZE : NEXT_CHUNK_SIZE;
        if (!force && buffer.length < minSize) return;
        if (buffer.length === 0) return;

        const chunk = buffer.slice();
        buffer  = new Uint8Array(0);
        isFirst = false;

        if (_teachGen !== myGen) return;

        try {
          const decoded = await audioCtx.decodeAudioData(chunk.buffer);
          if (_teachGen !== myGen) return;

          const source  = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(analyser);

          const startAt = Math.max(nextPlayTime, audioCtx.currentTime);
          source.start(startAt);
          nextPlayTime  = startAt + decoded.duration;
          _teachSource  = source;

          if (force) {
            // 最后一块：播完后触发 onEnd 回调
            source.onended = () => {
              _stopTeachAmpLoop();
              if (typeof onEnd === "function") onEnd();
            };
          }
        } catch (e) {
          console.warn("[TTS-Teach] decode 失败，跳过:", e.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (_teachGen !== myGen) break;
        if (done) { await flush(true); break; }

        const merged = new Uint8Array(buffer.length + value.length);
        merged.set(buffer);
        merged.set(value, buffer.length);
        buffer = merged;

        await flush();
      }

    } catch (e) {
      clearTimeout(abortTimer);
      // 只在主音频未成功起播时才降级
      if (_teachGen === myGen && !_teachCtx) {
        console.warn("[TTS-Teach] 降级到浏览器 TTS:", e.message);
        _stopTeachAmpLoop();
        _teachFallback(text, onEnd);
      } else {
        console.warn("[TTS-Teach] 异常已忽略（音频已在播放或被中断）:", e.message);
        _stopTeachAmpLoop();
      }
    }
  })();
}

function _teachFallback(text, onEnd) {
  _teachFallbackActive = true;
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = "zh-CN";
  u.onend  = () => {
    _teachFallbackActive = false;
    if (typeof onEnd === "function") onEnd();
  };
  window.speechSynthesis?.speak(u);
}