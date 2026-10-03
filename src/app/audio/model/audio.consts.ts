export const SFX_MUTE_KEY = 'np-debt-growth/sfx-muted';
export const MUSIC_MUTE_KEY = 'np-debt-growth/music-muted';
export const SFX_VOLUME_KEY = 'np-debt-growth/sfx-volume';
export const MUSIC_VOLUME_KEY = 'np-debt-growth/music-volume';

export const MASTER_GAIN = 1;
export const DEFAULT_VOLUME = 0.5;

// main-thread currentTime trails the render thread; voices scheduled at it start in the past
export const SCHEDULE_LEAD_S = 0.03;

export const MAX_VOICES_PER_WINDOW = 6;
export const VOICE_WINDOW_MS = 16;

export const CLICK_GAIN = 0.05;
export const CLICK_DURATION_S = 0.045;
export const CLICK_BASE_HZ = 720;
export const CLICK_JITTER_HZ = 160;
export const MAX_CLICKS_PER_TICK = 3;

export const PAYOUT_GAIN = 0.09;
export const PAYOUT_DURATION_S = 0.16;
export const PAYOUT_BASE_HZ = 440;
export const PAYOUT_LIFT_HZ = 220;

export const RARE_GAIN = 0.12;
export const RARE_DURATION_S = 0.35;

export const AWARD_GAIN = 0.1;
export const AWARD_DURATION_S = 0.16;

export const PURCHASE_GAIN = 0.06;
export const PURCHASE_DURATION_S = 0.09;

export interface MusicTrack {
  readonly src: string;
  readonly volume: number;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { src: 'assets/audio/uptempo-chiptune.ogg', volume: 0.12 },
  { src: 'assets/audio/boss-battle-2.ogg', volume: 0.12 },
];

export const FINALE_TRACK: MusicTrack = {
  src: 'assets/audio/shanty.ogg',
  volume: 0.14,
};
