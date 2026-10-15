/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * High-fidelity Web Audio percussion synthesis and sample engine.
 * Generates acoustic, Latin, Brazilian, and modern percussion with zero latency.
 */

export function createNoiseBuffer(ctx: AudioContext, duration: number = 1.0): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export interface SoundParams {
  velocity: number; // 1-127
  tune: number; // -12 to 12 semitones
  decay: number; // 0.1 to 3.0 multiplier
  tone: number; // 0.0 to 1.0 (filter/brightness)
  pan: number; // -1.0 to 1.0
  volume: number; // 0.0 to 1.0
  reverse?: boolean;
}

export class PercussionSynthesizer {
  private ctx: AudioContext;
  private noiseBuffer: AudioBuffer;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.noiseBuffer = createNoiseBuffer(ctx, 2.0);
  }

  private  applyPannerAndGain(
    destination: AudioNode,
    time: number,
    params: SoundParams
  ): { input: AudioNode; outputGain: GainNode } {
    const gain = this.ctx.createGain();
    const velFactor = Math.max(0.15, params.velocity / 127);
    const finalVolume = params.volume * velFactor;
    gain.gain.setValueAtTime(finalVolume, time);

    let panner: AudioNode = gain;
    if (this.ctx.createStereoPanner) {
      try {
        const sp = this.ctx.createStereoPanner();
        sp.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), time);
        gain.connect(sp);
        panner = sp;
      } catch {
        panner = gain;
      }
    }
    panner.connect(destination);
    return { input: gain, outputGain: gain };
  }

  // Play custom uploaded or recorded sample with pure acoustic fidelity
  playCustomSample(
    buffer: AudioBuffer,
    destination: AudioNode,
    time: number,
    params: SoundParams
  ) {
    const { input } = this.applyPannerAndGain(destination, time, params);

    let finalBuffer = buffer;
    if (params.reverse) {
      finalBuffer = this.ctx.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const srcData = buffer.getChannelData(ch);
        const destData = finalBuffer.getChannelData(ch);
        for (let i = 0; i < buffer.length; i++) {
          destData[i] = srcData[buffer.length - 1 - i];
        }
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = finalBuffer;

    // Pitch tune (1.0 if tune == 0)
    const rate = Math.pow(2, params.tune / 12);
    source.playbackRate.setValueAtTime(Math.max(0.1, rate), time);

    let lastNode: AudioNode = source;

    // Tone filter: ONLY apply lowpass if tone is noticeably decreased (< 0.9)
    // If tone >= 0.9, keep 100% transparent audio without any filtering
    if (params.tone < 0.9) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const cutoff = 400 + params.tone * 18000;
      filter.frequency.setValueAtTime(cutoff, time);
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Envelope / Decay:
    // If decay >= 0.95, let the full natural sample ring out faithfully
    // Only ramp down if the user deliberately shortened decay (< 0.95)
    const naturalDur = buffer.duration / rate;
    let playDuration = naturalDur;

    if (params.decay < 0.95) {
      const env = this.ctx.createGain();
      playDuration = naturalDur * Math.max(0.1, params.decay);
      env.gain.setValueAtTime(1, time);
      env.gain.setValueAtTime(1, time + playDuration * 0.7);
      env.gain.exponentialRampToValueAtTime(0.001, time + playDuration);
      lastNode.connect(env);
      lastNode = env;
    }

    lastNode.connect(input);

    source.start(time);
    source.stop(time + playDuration + 0.1);
  }

  // Kick / Bass Drum
  playKick(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const baseFreq = 54 * pitchRatio;
    const dur = 0.35 * Math.max(0.2, p.decay);

    // Body Oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';

    // Pitch drop
    osc.frequency.setValueAtTime(baseFreq * 3.5, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.04);
    osc.frequency.exponentialRampToValueAtTime(28 * pitchRatio, time + dur);

    oscGain.gain.setValueAtTime(1, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(oscGain);
    oscGain.connect(input);

    // Click transient
    const click = this.ctx.createBufferSource();
    click.buffer = this.noiseBuffer;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(1200 + p.tone * 3000, time);
    clickFilter.Q.setValueAtTime(2.0, time);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.4 * (p.velocity / 127), time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.05);
    click.start(time);
    click.stop(time + 0.03);
  }

  // Snare Drum
  playSnare(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.22 * Math.max(0.2, p.decay);

    // Body tone (dual sine)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(185 * pitchRatio, time);
    osc1.frequency.exponentialRampToValueAtTime(120 * pitchRatio, time + 0.06);

    osc2.frequency.setValueAtTime(330 * pitchRatio, time);
    osc2.frequency.exponentialRampToValueAtTime(200 * pitchRatio, time + 0.05);

    toneGain.gain.setValueAtTime(0.5, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc1.connect(toneGain);
    osc2.connect(toneGain);
    toneGain.connect(input);

    // Snare wires noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800 + p.tone * 2000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(input);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.15);
    osc2.stop(time + 0.15);
    noise.start(time);
    noise.stop(time + dur + 0.05);
  }

  // Rimshot / Cross-stick
  playRimshot(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.08 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(420 * pitchRatio, time + 0.02);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 * pitchRatio, time);
    filter.Q.setValueAtTime(6.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Closed Hi-Hat
  playHiHatClosed(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 0.06 * Math.max(0.2, p.decay);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6500 + p.tone * 2000, time);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(9000 + p.tune * 200, time);
    bp.Q.setValueAtTime(3.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(input);

    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  // Open Hi-Hat
  playHiHatOpen(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 0.45 * Math.max(0.2, p.decay);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5500 + p.tone * 2000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(input);

    noise.start(time);
    noise.stop(time + dur + 0.05);
  }

  // Claves
  playClave(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.06 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600 * pitchRatio, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600 * pitchRatio, time);
    filter.Q.setValueAtTime(18.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Shaker / Cabasa
  playShaker(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 0.07 * Math.max(0.2, p.decay);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5000 + p.tune * 150 + p.tone * 2000, time);
    bp.Q.setValueAtTime(4.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.7, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(input);

    noise.start(time);
    noise.stop(time + dur + 0.03);
  }

  // Conga High
  playCongaHigh(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.22 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(320 * pitchRatio, time + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    // slap click
    const slap = this.ctx.createBufferSource();
    slap.buffer = this.noiseBuffer;
    const slapFilter = this.ctx.createBiquadFilter();
    slapFilter.type = 'bandpass';
    slapFilter.frequency.setValueAtTime(1200 * pitchRatio, time);
    slapFilter.Q.setValueAtTime(4.0, time);

    const slapGain = this.ctx.createGain();
    slapGain.gain.setValueAtTime(0.4, time);
    slapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

    slap.connect(slapFilter);
    slapFilter.connect(slapGain);
    slapGain.connect(input);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
    slap.start(time);
    slap.stop(time + 0.03);
  }

  // Conga Low (Tumbadora)
  playCongaLow(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.32 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(140 * pitchRatio, time + 0.09);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Bongo High (Macho)
  playBongoHigh(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.14 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(460 * pitchRatio, time + 0.05);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Bongo Low (Hembra)
  playBongoLow(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.22 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(260 * pitchRatio, time + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Timbale (Metal shell rim)
  playTimbale(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.28 * Math.max(0.2, p.decay);

    // Fundamental ring
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(360 * pitchRatio, time);
    osc1.frequency.exponentialRampToValueAtTime(280 * pitchRatio, time + 0.05);

    // Metallic overtone
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(740 * pitchRatio, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(680 * pitchRatio, time);
    filter.Q.setValueAtTime(5.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(gain);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(input);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  // Surdo (Deep Brazilian Samba Bass)
  playSurdo(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.45 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(62 * pitchRatio, time + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    // Mallet thud
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(input);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.03);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  // Pandeiro (Brazilian frame drum with jingles)
  playPandeiro(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.18 * Math.max(0.2, p.decay);

    // Thumb skin slap
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(130 * pitchRatio, time + 0.04);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.9, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(input);

    // Platinelas (jingles)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(6200 * pitchRatio, time);
    hp.Q.setValueAtTime(6.0, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(input);

    osc.start(time);
    osc.stop(time + 0.15);
    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  // Agogô Bell High
  playAgogoHigh(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.25 * Math.max(0.2, p.decay);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(1180 * pitchRatio, time);
    osc2.frequency.setValueAtTime(1820 * pitchRatio, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(input);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  // Agogô Bell Low
  playAgogoLow(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.28 * Math.max(0.2, p.decay);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(860 * pitchRatio, time);
    osc2.frequency.setValueAtTime(1340 * pitchRatio, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(input);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  // Cowbell (Cha-Cha / 808 Style)
  playCowbell(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.24 * Math.max(0.2, p.decay);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(540 * pitchRatio, time);
    osc2.frequency.setValueAtTime(800 * pitchRatio, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(740 * pitchRatio, time);
    filter.Q.setValueAtTime(6.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(input);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  // Tambourine
  playTambourine(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 0.18 * Math.max(0.2, p.decay);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(input);

    noise.start(time);
    noise.stop(time + dur + 0.03);
  }

  // Triangle
  playTriangle(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.7 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200 * pitchRatio, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  // Woodblock
  playWoodblock(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const pitchRatio = Math.pow(2, p.tune / 12);
    const dur = 0.07 * Math.max(0.2, p.decay);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(940 * pitchRatio, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 * pitchRatio, time);
    filter.Q.setValueAtTime(10.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(input);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Hand Clap
  playClap(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 0.22 * Math.max(0.2, p.decay);

    // Multi-burst click
    const bursts = [0, 0.012, 0.024];
    bursts.forEach((offset) => {
      const click = this.ctx.createBufferSource();
      click.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1100 + p.tone * 1000, time + offset);
      bp.Q.setValueAtTime(3.0, time + offset);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, time + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.015);

      click.connect(bp);
      bp.connect(gain);
      gain.connect(input);

      click.start(time + offset);
      click.stop(time + offset + 0.02);
    });

    // Body tail
    const tail = this.ctx.createBufferSource();
    tail.buffer = this.noiseBuffer;
    const tailBp = this.ctx.createBiquadFilter();
    tailBp.type = 'bandpass';
    tailBp.frequency.setValueAtTime(1200 + p.tone * 1000, time + 0.03);
    tailBp.Q.setValueAtTime(2.0, time + 0.03);

    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(0.8, time + 0.03);
    tailGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    tail.connect(tailBp);
    tailBp.connect(tailGain);
    tailGain.connect(input);

    tail.start(time + 0.03);
    tail.stop(time + dur + 0.03);
  }

  // Crash / Accent Cymbal
  playCrash(dest: AudioNode, time: number, p: SoundParams) {
    const { input } = this.applyPannerAndGain(dest, time, p);
    const dur = 1.2 * Math.max(0.3, p.decay);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(3500 + p.tone * 1500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(input);

    noise.start(time);
    noise.stop(time + dur + 0.05);
  }

  // Master Sound Dispatcher
  playSound(
    soundType: string,
    dest: AudioNode,
    time: number,
    params: SoundParams,
    customBuffer?: AudioBuffer,
    trackName?: string,
    trackCategory?: string
  ) {
    if (customBuffer) {
      this.playCustomSample(customBuffer, dest, time, params);
      return;
    }

    // Determine best fallback sound if soundType is custom or unknown
    let effectiveType = soundType;
    if (soundType === 'custom' || !soundType) {
      const name = (trackName || '').toLowerCase();
      const cat = (trackCategory || '').toLowerCase();
      if (name.includes('surdo') || name.includes('grave') || name.includes('abafado') || cat === 'brazilian') {
        effectiveType = 'surdo';
      } else if (name.includes('pandeiro')) {
        effectiveType = 'pandeiro';
      } else if (name.includes('tamborim') || name.includes('carreto')) {
        effectiveType = 'rimshot';
      } else if (name.includes('ganza') || name.includes('shaker') || name.includes('chocalho') || name.includes('ovinho')) {
        effectiveType = 'shaker';
      } else if (name.includes('bumbo') || name.includes('kick') || name.includes('bass')) {
        effectiveType = 'kick';
      } else if (name.includes('caixa') || name.includes('snare') || name.includes('guerra')) {
        effectiveType = 'snare';
      } else if (name.includes('agogo') || name.includes('sino')) {
        effectiveType = 'agogo_hi';
      } else if (name.includes('conga')) {
        effectiveType = 'conga_hi';
      } else if (name.includes('prato') || name.includes('crash')) {
        effectiveType = 'crash';
      } else {
        effectiveType = 'pandeiro';
      }
    }

    switch (effectiveType) {
      case 'kick':
        this.playKick(dest, time, params);
        break;
      case 'snare':
        this.playSnare(dest, time, params);
        break;
      case 'rimshot':
        this.playRimshot(dest, time, params);
        break;
      case 'hihat_closed':
        this.playHiHatClosed(dest, time, params);
        break;
      case 'hihat_open':
        this.playHiHatOpen(dest, time, params);
        break;
      case 'clave':
        this.playClave(dest, time, params);
        break;
      case 'shaker':
        this.playShaker(dest, time, params);
        break;
      case 'conga_hi':
        this.playCongaHigh(dest, time, params);
        break;
      case 'conga_lo':
        this.playCongaLow(dest, time, params);
        break;
      case 'bongo_hi':
        this.playBongoHigh(dest, time, params);
        break;
      case 'bongo_lo':
        this.playBongoLow(dest, time, params);
        break;
      case 'timbale':
        this.playTimbale(dest, time, params);
        break;
      case 'surdo':
        this.playSurdo(dest, time, params);
        break;
      case 'pandeiro':
        this.playPandeiro(dest, time, params);
        break;
      case 'agogo_hi':
        this.playAgogoHigh(dest, time, params);
        break;
      case 'agogo_lo':
        this.playAgogoLow(dest, time, params);
        break;
      case 'cowbell':
        this.playCowbell(dest, time, params);
        break;
      case 'tambourine':
        this.playTambourine(dest, time, params);
        break;
      case 'triangle':
        this.playTriangle(dest, time, params);
        break;
      case 'woodblock':
        this.playWoodblock(dest, time, params);
        break;
      case 'clap':
        this.playClap(dest, time, params);
        break;
      case 'crash':
      case 'accent':
        this.playCrash(dest, time, params);
        break;
      default:
        this.playPandeiro(dest, time, params);
        break;
    }
  }
}
