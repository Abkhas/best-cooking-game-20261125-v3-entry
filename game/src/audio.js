// Sizzle & Serve 3D — tiny WebAudio sound effects, all synthesized, no
// audio files. A sizzle loop while a wok cooks, a chop thock, a pickup
// blip, a serve ding, and a low deny buzz. Silent until the first user
// gesture creates the AudioContext.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sizzleNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* headless or no audio: stay silent */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  pickup() { this.tone(660, 0.09, 'triangle', 0.1); this.tone(880, 0.1, 'triangle', 0.08, 0.06); }
  chop() { this.tone(180, 0.07, 'square', 0.12); this.tone(120, 0.08, 'square', 0.1, 0.12); }
  done() { this.tone(523, 0.1, 'triangle', 0.1); this.tone(784, 0.14, 'triangle', 0.1, 0.09); }
  serve() { this.tone(1046, 0.12, 'sine', 0.12); this.tone(1318, 0.2, 'sine', 0.1, 0.1); }
  deny() { this.tone(140, 0.18, 'sawtooth', 0.09); }
  trash() { this.tone(300, 0.12, 'square', 0.07); this.tone(180, 0.16, 'square', 0.07, 0.08); }

  sizzle() {
    if (!this.ctx || this.muted || this.sizzleNodes) return;
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 3000;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filt).connect(g).connect(this.ctx.destination);
    src.start();
    this.sizzleNodes = { src, g };
    setTimeout(() => this.stopSizzle(), 2500);
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.src.stop(); } catch (e) { /* already stopped */ }
    this.sizzleNodes = null;
  }
}
