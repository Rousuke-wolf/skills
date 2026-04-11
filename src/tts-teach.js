// tts-teach.js — 教学页专用 TTS，流式解码（低延迟 + 无电流声）

const TTS_TEACH_PROXY = "http://localhost:3001/tts";
const TEACH_VOICE     = "longxiaoxia_v2";   // 教学页音色，改这里切换

let _teachCtx      = null;
let _teachSource   = null;
let _teachAnalyser = null;
let _teachGen      = 0;

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
}

export function teachStop() {
  _teachGen++;
  _stopTeachPrevious();
  window.speechSynthesis?.cancel();
}

export function teachSpeak(text, onEnd) {
  if (!text?.trim()) return;

  const myGen = ++_teachGen;
  _stopTeachPrevious();

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
        })
      });

      if (_teachGen !== myGen) return;
      if (!res.ok || !res.body) { _teachFallback(text, onEnd); return; }

      // ── AudioContext ──────────────────────────────────
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (_teachGen !== myGen) { audioCtx.close(); return; }

      _teachCtx = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(audioCtx.destination);
      _teachAnalyser = analyser;
      _startTeachAmpLoop(analyser);

      // ── 流式解码，与 tts.js 完全相同的策略 ──────────
      const FIRST_CHUNK_SIZE = 6144;   // 6KB 首块，快速起播
      const NEXT_CHUNK_SIZE  = 4096;   // 4KB 后续块
      let isFirst = true;

      const reader = res.body.getReader();
      let buffer = new Uint8Array(0);
      let nextPlayTime = audioCtx.currentTime;
      let isLastSource = false;

      const flush = async (force = false) => {
        const minSize = isFirst ? FIRST_CHUNK_SIZE : NEXT_CHUNK_SIZE;
        if (!force && buffer.length < minSize) return;
        if (buffer.length === 0) return;

        const chunk = buffer.slice();
        buffer = new Uint8Array(0);
        isFirst = false;

        if (_teachGen !== myGen) return;

        try {
          const decoded = await audioCtx.decodeAudioData(chunk.buffer);
          if (_teachGen !== myGen) return;

          const source = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(analyser);

          const startAt = Math.max(nextPlayTime, audioCtx.currentTime);
          source.start(startAt);
          nextPlayTime = startAt + decoded.duration;
          _teachSource = source;

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
      console.error("[TTS-Teach] 异常:", e);
      _stopTeachAmpLoop();
      if (_teachGen === myGen) _teachFallback(text, onEnd);
    }
  })();
}

function _teachFallback(text, onEnd) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.onend = onEnd;
  window.speechSynthesis?.speak(u);
}