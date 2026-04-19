// tts.js - 整体解码播放（无电流声）+ 世代计数器 + 正确的暂停支持
const TTS_PROXY = "http://localhost:3001/tts";

let currentSource   = null;
let currentCtx      = null;
let currentAnalyser = null;

let _speakGen    = 0;
let _speakActive = false;
let _pauseIntent = false;
let _isFallback  = false;   // 标记当前是否走的是 speechSynthesis fallback 路径

// ── onStart 回调 ──────────────────────────────────
let _onStartCb    = null;
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
  if (currentSource) { try { currentSource.stop(); } catch (e) {} currentSource = null; }
  if (currentCtx)    { try { currentCtx.close();   } catch (e) {} currentCtx    = null; }
  // ── Fix 1: 同步清掉 speechSynthesis 队列 ─────────────────────────────────
  // 原来只停 Web Audio，不清 speechSynthesis 队列，导致 _fallback 放入的
  // utterance 一直残留，等 resume() 被调用时就触发幽灵播报
  window.speechSynthesis?.cancel();
  _isFallback = false;
}

// ── speak(text, onDuration, onStart, onEnd) ──────────
export function speak(text, onDuration, onStart, onEnd) {
  if (!text?.trim()) return;

  _speakActive  = true;
  _pauseIntent  = false;
  _isFallback   = false;
  _onStartCb    = onStart || null;
  _onStartFired = false;

  const myGen = ++_speakGen;
  _stopPrevious();   // 已包含 speechSynthesis.cancel()

  // ── Fix 3: 带 30 秒超时的 AbortController ────────────────────────────────
  // 原来 fetch 无超时，OS TCP keepalive 在 ~2 分钟后断开连接时
  // catch 块误判 _speakGen===myGen 成立，触发 _fallback 播出幽灵机器人声
  const abortCtrl  = new AbortController();
  const abortTimer = setTimeout(() => abortCtrl.abort(), 30000);

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
        }),
        signal: abortCtrl.signal
      });

      clearTimeout(abortTimer);

      if (_speakGen !== myGen) return;
      if (!res.ok || !res.body) {
        _speakActive = false;
        _fallback(text, onEnd);
        return;
      }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (_speakGen !== myGen) { audioCtx.close(); return; }

      currentCtx = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize               = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(audioCtx.destination);
      currentAnalyser = analyser;
      _startAmpLoop(analyser);

      const FIRST_CHUNK_SIZE = 6144;
      const NEXT_CHUNK_SIZE  = 4096;
      let isFirst = true;

      const reader      = res.body.getReader();
      let buffer        = new Uint8Array(0);
      let nextPlayTime  = audioCtx.currentTime;
      let totalDuration = 0;
      let lastSource    = null;

      const flush = async (force = false) => {
        const minSize = isFirst ? FIRST_CHUNK_SIZE : NEXT_CHUNK_SIZE;
        if (!force && buffer.length < minSize) return;
        if (buffer.length === 0) return;

        const chunk = buffer.slice();
        buffer  = new Uint8Array(0);
        isFirst = false;

        if (_speakGen !== myGen) return;

        try {
          const decoded = await audioCtx.decodeAudioData(chunk.buffer);
          if (_speakGen !== myGen) return;

          const source  = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(analyser);

          const startAt  = Math.max(nextPlayTime, audioCtx.currentTime);
          source.start(startAt);
          nextPlayTime   = startAt + decoded.duration;
          totalDuration += decoded.duration;
          currentSource  = source;
          lastSource     = source;

          if (!_onStartFired && _onStartCb) {
            _onStartFired = true;
            _onStartCb();
          }

          source.onended = () => {
            if (_speakGen === myGen && source === lastSource) {
              _speakActive = false;
              _pauseIntent = false;
              _onStartCb   = null;
              _stopAmpLoop();
              if (typeof onEnd === "function") onEnd();
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
      clearTimeout(abortTimer);
      // ── 只在主音频未成功起播时才降级 fallback ────────────────────────────
      // 加上 !currentCtx 确保：音频已在播放时若连接异常，不会额外触发 fallback
      if (_speakGen === myGen && !currentCtx) {
        console.warn("[TTS] 降级到浏览器 TTS:", e.message);
        _speakActive = false;
        _stopAmpLoop();
        _fallback(text, onEnd);
      } else {
        console.warn("[TTS] 异常已忽略（音频已在播放或被中断）:", e.message);
        _speakActive = false;
        _stopAmpLoop();
      }
    }
  })();
}

export function pause() {
  if (currentCtx?.state === "running") {
    currentCtx.suspend();
  } else if (_speakActive) {
    _pauseIntent = true;
  }
  // ── Fix 2: 只在真正走 fallback 路径时才操作 speechSynthesis ──────────────
  // 原来无条件调 speechSynthesis.pause()，导致残留 utterance 暂停后
  // 等 resume() 被调（如用户按恢复键）时把幽灵 utterance 唤醒播放
  if (_isFallback) window.speechSynthesis?.pause();
}

export function resume() {
  _pauseIntent = false;
  if (currentCtx?.state === "suspended") {
    currentCtx.resume();
  }
  // 同上：只在 fallback 路径才 resume speechSynthesis，避免唤醒残留 utterance
  if (_isFallback) window.speechSynthesis?.resume();
}

export function stop() {
  _speakGen++;
  _speakActive  = false;
  _pauseIntent  = false;
  _isFallback   = false;
  _onStartCb    = null;
  _onStartFired = false;
  _stopPrevious();   // 已包含 speechSynthesis.cancel()
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
  _isFallback = true;
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = "zh-CN";
  u.onend  = () => {
    _isFallback  = false;
    _speakActive = false;
    if (typeof onEnd === "function") onEnd();
  };
  window.speechSynthesis?.speak(u);
}