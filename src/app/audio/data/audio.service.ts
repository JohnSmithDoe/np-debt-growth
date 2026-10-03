import { effect, inject, Injectable, signal } from '@angular/core';

import { FinaleService } from '../../@shared/data/finale.service';
import { GameStore } from '../../game/data/game.store';
import {
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_VOLUME,
  FINALE_TRACK,
  MASTER_GAIN,
  MAX_CLICKS_PER_TICK,
  MAX_VOICES_PER_WINDOW,
  MUSIC_MUTE_KEY,
  MUSIC_TRACKS,
  MUSIC_VOLUME_KEY,
  SFX_MUTE_KEY,
  SFX_VOLUME_KEY,
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

const clampVolume = (value: number, fallback = DEFAULT_VOLUME): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

@Injectable({ providedIn: 'root' })
export class AudioService {
  #store = inject(GameStore);
  #finale = inject(FinaleService);

  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #unlock = (): void => this.#tryUnlock();

  #voiceCount = 0;
  #voiceWindowStart = 0;

  #prevClosed = 0;
  #prevSprints = 0;
  #prevBudget = 0;
  #prevAwarded = 0;
  #prevRares = 0;

  #music: HTMLAudioElement | null = null;
  #track = 0;
  #musicOn = signal(false);
  #finaleOn = false;

  readonly sfxMuted = signal(this.#loadFlag(SFX_MUTE_KEY));
  readonly musicMuted = signal(this.#loadFlag(MUSIC_MUTE_KEY));
  readonly sfxVolume = signal(this.#loadVolume(SFX_VOLUME_KEY));
  readonly musicVolume = signal(
    this.#loadVolume(MUSIC_VOLUME_KEY, DEFAULT_MUSIC_VOLUME)
  );

  constructor() {
    window.addEventListener('pointerdown', this.#unlock);
    window.addEventListener('keydown', this.#unlock);

    effect(() => {
      const finale = this.#finale.act() !== 'closed';
      if (finale !== this.#finaleOn) {
        this.#finaleOn = finale;
        if (this.#music) this.#load(this.#music);
      }
      if (this.#musicAudible()) this.#playMusic();
      else this.#music?.pause();
    });

    effect(() => {
      const volume = this.musicVolume();
      if (this.#music) this.#music.volume = this.#trackVolume(volume);
    });

    effect(() => {
      const volume = this.sfxVolume();
      if (this.#master) this.#master.gain.value = MASTER_GAIN * volume;
    });

    effect(() => {
      const closed = this.#store.lifetimeClosed();
      const sprints = this.#store.lifetimeRounds();
      const budget = this.#store.budget();
      const awarded = this.#store.awardCount();
      const rares = this.#store.raresTaken();

      const closedDelta = closed - this.#prevClosed;
      const sprintDelta = sprints - this.#prevSprints;
      const budgetDelta = budget - this.#prevBudget;
      const rareTaken = rares > this.#prevRares;
      const awardedGrew = awarded > this.#prevAwarded;

      this.#prevClosed = closed;
      this.#prevSprints = sprints;
      this.#prevBudget = budget;
      this.#prevRares = rares;
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

  startMusic(): void {
    this.#musicOn.set(true);
  }

  setSfxMuted(value: boolean): void {
    this.sfxMuted.set(value);
    this.#saveFlag(SFX_MUTE_KEY, value);
  }

  setMusicMuted(value: boolean): void {
    this.musicMuted.set(value);
    this.#saveFlag(MUSIC_MUTE_KEY, value);
  }

  setSfxVolume(value: number): void {
    const volume = clampVolume(value);
    this.sfxVolume.set(volume);
    this.#save(SFX_VOLUME_KEY, String(volume));
  }

  setMusicVolume(value: number): void {
    const volume = clampVolume(value, DEFAULT_MUSIC_VOLUME);
    this.musicVolume.set(volume);
    this.#save(MUSIC_VOLUME_KEY, String(volume));
  }

  #musicAudible(): boolean {
    return this.#musicOn() && !this.musicMuted();
  }

  #trackVolume(volume: number): number {
    const track = this.#finaleOn ? FINALE_TRACK : MUSIC_TRACKS[this.#track];
    return (track?.volume ?? 0) * volume;
  }

  #loadFlag(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  #loadVolume(key: string, fallback = DEFAULT_VOLUME): number {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : clampVolume(Number(raw), fallback);
    } catch {
      return fallback;
    }
  }

  #saveFlag(key: string, value: boolean): void {
    this.#save(key, value ? '1' : '0');
  }

  #save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
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
      master.gain.value = MASTER_GAIN * this.sfxVolume();
      master.connect(ctx.destination);
      this.#ctx = ctx;
      this.#master = master;
    } catch {
      this.#ctx = null;
      this.#master = null;
    }
  }

  #playMusic(): void {
    const music = this.#music ?? this.#createMusic();
    if (!music) return;
    Promise.resolve()
      .then(() => music.play())
      .catch(() => this.#retryMusicOnGesture());
  }

  #createMusic(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    const music = new Audio();
    music.preload = 'auto';
    music.addEventListener('ended', () => {
      if (!this.#finaleOn) {
        this.#track = (this.#track + 1) % MUSIC_TRACKS.length;
      }
      this.#load(music);
      if (this.#musicAudible()) this.#playMusic();
    });
    this.#load(music);
    this.#music = music;
    return music;
  }

  #load(music: HTMLAudioElement): void {
    const track = this.#finaleOn ? FINALE_TRACK : MUSIC_TRACKS[this.#track];
    if (!track) return;
    music.src = track.src;
    music.volume = this.#trackVolume(this.musicVolume());
  }

  #retryMusicOnGesture(): void {
    const retry = (): void => {
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      if (this.#musicAudible()) this.#playMusic();
    };
    window.addEventListener('pointerdown', retry);
    window.addEventListener('keydown', retry);
  }

  #play(voice: Voice): void {
    if (this.sfxMuted() || !this.#ctx || !this.#master) return;
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
