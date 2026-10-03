import {
  AWARD_DURATION_S,
  AWARD_GAIN,
  CLICK_BASE_HZ,
  CLICK_DURATION_S,
  CLICK_GAIN,
  CLICK_JITTER_HZ,
  PAYOUT_BASE_HZ,
  PAYOUT_DURATION_S,
  PAYOUT_GAIN,
  PAYOUT_LIFT_HZ,
  PURCHASE_DURATION_S,
  PURCHASE_GAIN,
  RARE_DURATION_S,
  RARE_GAIN,
  SCHEDULE_LEAD_S,
} from '../model/audio.consts';

interface ToneSpec {
  readonly freq: number;
  readonly type?: OscillatorType;
  readonly duration: number;
  readonly gain: number;
  readonly attack?: number;
  readonly start?: number;
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  spec: ToneSpec
): void {
  const {
    freq,
    type = 'sine',
    duration,
    gain,
    attack = 0.005,
    start = 0,
  } = spec;
  const lead = Math.max(SCHEDULE_LEAD_S, ctx.baseLatency || 0);
  const t0 = ctx.currentTime + lead + start;
  const t1 = t0 + duration;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t1);

  osc.connect(env);
  env.connect(destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
  osc.addEventListener('ended', () => {
    osc.disconnect();
    env.disconnect();
  });
}

export function triageClick(
  ctx: AudioContext,
  destination: AudioNode,
  rand: () => number = Math.random
): void {
  const jitter = (rand() - 0.5) * 2 * CLICK_JITTER_HZ;
  playTone(ctx, destination, {
    freq: CLICK_BASE_HZ + jitter,
    type: 'square',
    duration: CLICK_DURATION_S,
    gain: CLICK_GAIN,
    attack: 0.002,
  });
}

export function sprintPayout(
  ctx: AudioContext,
  destination: AudioNode,
  scale: number
): void {
  const lift = Math.min(1, Math.max(0, scale));
  playTone(ctx, destination, {
    freq: PAYOUT_BASE_HZ,
    type: 'triangle',
    duration: PAYOUT_DURATION_S,
    gain: PAYOUT_GAIN,
  });
  playTone(ctx, destination, {
    freq: PAYOUT_BASE_HZ + 90 + lift * PAYOUT_LIFT_HZ,
    type: 'triangle',
    duration: PAYOUT_DURATION_S,
    gain: PAYOUT_GAIN,
    start: PAYOUT_DURATION_S * 0.55,
  });
}

export function rareChime(ctx: AudioContext, destination: AudioNode): void {
  playTone(ctx, destination, {
    freq: 880,
    duration: RARE_DURATION_S,
    gain: RARE_GAIN,
    attack: 0.01,
  });
  playTone(ctx, destination, {
    freq: 1318.5,
    duration: RARE_DURATION_S * 0.8,
    gain: RARE_GAIN * 0.7,
    attack: 0.01,
    start: 0.04,
  });
}

export function awardArpeggio(ctx: AudioContext, destination: AudioNode): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(ctx, destination, {
      freq,
      type: 'triangle',
      duration: AWARD_DURATION_S,
      gain: AWARD_GAIN,
      start: i * 0.07,
    });
  });
}

export function purchaseConfirm(
  ctx: AudioContext,
  destination: AudioNode
): void {
  playTone(ctx, destination, {
    freq: 660,
    duration: PURCHASE_DURATION_S,
    gain: PURCHASE_GAIN,
  });
  playTone(ctx, destination, {
    freq: 880,
    duration: PURCHASE_DURATION_S,
    gain: PURCHASE_GAIN * 0.8,
    start: 0.05,
  });
}
