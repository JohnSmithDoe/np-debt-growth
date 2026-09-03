import { effect, inject, Injectable, signal } from '@angular/core';

import { GameStore } from '../../game/data/game.store';
import {
  AUDIO_MUTE_KEY,
  MASTER_GAIN,
  MAX_CLICKS_PER_TICK,
  MAX_VOICES_PER_WINDOW,
  VOICE_WINDOW_MS,
} from '../model/audio.consts';
import {
  awardArpeggio,
  purchaseConfirm,
  rareChime,
  sprintPayout,
  triageClick,
} from '../util/synth';

type Voice = (ctx: AudioContext, destination: AudioNode) => void;

@Injectable({ providedIn: 'root' })
export class AudioService {
  #store = inject(GameStore);

  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #unlock = (): void => this.#tryUnlock();

  #voiceCount = 0;
  #voiceWindowStart = 0;

  #prevClosed = 0;
  #prevSprints = 0;
  #prevBudget = 0;
  #prevAwarded = 0;
  #prevEscalated = false;
  #prevHotfixUntil = 0;

  readonly muted = signal(this.#loadMuted());

  constructor() {
    window.addEventListener('pointerdown', this.#unlock);
    window.addEventListener('keydown', this.#unlock);

    effect(() => {
      const closed = this.#store.lifetimeClosed();
      const sprints = this.#store.lifetimeRounds();
      const budget = this.#store.budget();
      const awarded = this.#store.awardCount();
      const escalated = this.#store.escalated();
      const hotfixUntil = this.#store.hotfixUntil();

      const closedDelta = closed - this.#prevClosed;
      const sprintDelta = sprints - this.#prevSprints;
      const budgetDelta = budget - this.#prevBudget;
      const rareTaken =
        (escalated && !this.#prevEscalated) ||
        hotfixUntil > this.#prevHotfixUntil;
      const awardedGrew = awarded > this.#prevAwarded;

      this.#prevClosed = closed;
      this.#prevSprints = sprints;
      this.#prevBudget = budget;
      this.#prevEscalated = escalated;
      this.#prevHotfixUntil = hotfixUntil;
      this.#prevAwarded = awarded;

      if (awardedGrew) this.#play(awardArpeggio);
      if (rareTaken) this.#play(rareChime);

      if (sprintDelta > 0) {
        const lift = Math.max(0, budgetDelta) / 500;
        this.#play((ctx, dest) => sprintPayout(ctx, dest, lift));
      } else if (budgetDelta < 0) {
        this.#play(purchaseConfirm);
      }

      if (closedDelta > 0) {
        const voices = Math.min(closedDelta, MAX_CLICKS_PER_TICK);
        for (let i = 0; i < voices; i++) this.#play(triageClick);
      }
    });
  }

  setMuted(value: boolean): void {
    this.muted.set(value);
    try {
      localStorage.setItem(AUDIO_MUTE_KEY, value ? '1' : '0');
    } catch {}
  }

  #loadMuted(): boolean {
    try {
      return localStorage.getItem(AUDIO_MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  #tryUnlock(): void {
    window.removeEventListener('pointerdown', this.#unlock);
    window.removeEventListener('keydown', this.#unlock);

    if (this.#ctx) {
      if (this.#ctx.state === 'suspended') void this.#ctx.resume();
      return;
    }
    const Ctor = window.AudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      this.#ctx = ctx;
      this.#master = master;
    } catch {
      this.#ctx = null;
      this.#master = null;
    }
  }

  #play(voice: Voice): void {
    if (this.muted() || !this.#ctx || !this.#master) return;
    if (this.#ctx.state === 'suspended') {
      void this.#ctx.resume();
      return;
    }

    const nowMs = this.#ctx.currentTime * 1000;
    if (nowMs - this.#voiceWindowStart > VOICE_WINDOW_MS) {
      this.#voiceWindowStart = nowMs;
      this.#voiceCount = 0;
    }
    if (this.#voiceCount >= MAX_VOICES_PER_WINDOW) return;
    this.#voiceCount++;

    try {
      voice(this.#ctx, this.#master);
    } catch {}
  }
}
