import { bootLanguage } from './i18n/language.boot';
import { Language, LOCALE_BY_LANGUAGE } from './i18n/language.model';

interface Tier {
  readonly exponent: number;
  readonly name: string;
  readonly symbol: string;
  readonly plural?: string;
}

const TIERS_EN: readonly Tier[] = [
  { exponent: 36, name: 'undecillion', symbol: 'Ud' },
  { exponent: 33, name: 'decillion', symbol: 'Dc' },
  { exponent: 30, name: 'nonillion', symbol: 'No' },
  { exponent: 27, name: 'octillion', symbol: 'Oc' },
  { exponent: 24, name: 'septillion', symbol: 'Sp' },
  { exponent: 21, name: 'sextillion', symbol: 'Sx' },
  { exponent: 18, name: 'quintillion', symbol: 'Qi' },
  { exponent: 15, name: 'quadrillion', symbol: 'Qa' },
  { exponent: 12, name: 'trillion', symbol: 'T' },
  { exponent: 9, name: 'billion', symbol: 'B' },
  { exponent: 6, name: 'million', symbol: 'M' },
];

const TIERS_DE: readonly Tier[] = [
  { exponent: 36, name: 'Sextillion', plural: 'Sextillionen', symbol: 'Sxt' },
  {
    exponent: 33,
    name: 'Quintilliarde',
    plural: 'Quintilliarden',
    symbol: 'Qid',
  },
  { exponent: 30, name: 'Quintillion', plural: 'Quintillionen', symbol: 'Qui' },
  {
    exponent: 27,
    name: 'Quadrilliarde',
    plural: 'Quadrilliarden',
    symbol: 'Qad',
  },
  { exponent: 24, name: 'Quadrillion', plural: 'Quadrillionen', symbol: 'Qua' },
  { exponent: 21, name: 'Trilliarde', plural: 'Trilliarden', symbol: 'Trd' },
  { exponent: 18, name: 'Trillion', plural: 'Trillionen', symbol: 'Tri' },
  { exponent: 15, name: 'Billiarde', plural: 'Billiarden', symbol: 'Brd' },
  { exponent: 12, name: 'Billion', plural: 'Billionen', symbol: 'Bio' },
  { exponent: 9, name: 'Milliarde', plural: 'Milliarden', symbol: 'Mrd' },
  { exponent: 6, name: 'Million', plural: 'Millionen', symbol: 'Mio' },
];

const TIERS_BY_LANGUAGE: Readonly<Record<Language, readonly Tier[]>> = {
  en: TIERS_EN,
  de: TIERS_DE,
};

let activeLanguage: Language = bootLanguage();

let compactCache: readonly Tier[] | null = null;
let wholeFormat: Intl.NumberFormat | null = null;
const decimalFormats = new Map<number, Intl.NumberFormat>();

export function setFormatLanguage(language: Language): void {
  activeLanguage = language;
  compactCache = null;
  wholeFormat = null;
  decimalFormats.clear();
}

const tiers = (): readonly Tier[] => TIERS_BY_LANGUAGE[activeLanguage];

const compactTiers = (): readonly Tier[] =>
  (compactCache ??= [
    ...tiers(),
    { exponent: 3, name: 'thousand', symbol: 'k' },
  ]);

const localeTag = (): string => LOCALE_BY_LANGUAGE[activeLanguage];

const whole = (value: number): string =>
  (wholeFormat ??= new Intl.NumberFormat(localeTag())).format(value);

const NAMED_FROM = 1e6;
const BEYOND_NAMES = 1e39;

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 0) return `-${formatQuantity(-value)}`;
  if (value < 1000) return decimal(value, 1);
  if (value < NAMED_FROM) return whole(Math.floor(value));
  if (value >= BEYOND_NAMES) return value.toExponential(2);

  const scaled = scale(value, tiers());
  if (!scaled) return value.toExponential(2);
  const one = Number(scaled.mantissa.replace(',', '.')) === 1;
  return `${scaled.mantissa} ${one ? scaled.tier.name : (scaled.tier.plural ?? scaled.tier.name)}`;
}

export function formatWhole(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < NAMED_FROM) {
    return whole(Math.round(value));
  }
  return formatQuantity(value);
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 0) return `-${formatCompact(-value)}`;
  if (value < 1000) return withThreeSigFigs(value);
  if (value >= BEYOND_NAMES) return value.toExponential(2);

  const scaled = scale(value, compactTiers());
  if (!scaled) return value.toExponential(2);
  const gap = activeLanguage === 'de' ? NBSP : '';
  return `${scaled.mantissa}${gap}${scaled.tier.symbol}`;
}

export function formatCompactWhole(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return formatCompact(value);
}

const NO_POINTS = '0';

export function formatPoints(value: number): string {
  return value === 0 ? NO_POINTS : formatCompactWhole(Math.floor(value));
}

export function formatPointsExact(value: number): string {
  return value === 0 ? NO_POINTS : formatWhole(Math.floor(value));
}

const NBSP = '\u00A0';

function withCurrency(amount: string): string {
  return activeLanguage === 'de' ? `${amount}${NBSP}€` : `€${amount}`;
}

export function formatMoney(value: number): string {
  return withCurrency(formatWhole(value));
}

export function formatCompactMoney(value: number): string {
  return withCurrency(formatCompactWhole(value));
}

export function formatRate(perSecond: number): string {
  if (perSecond > 0 && perSecond < 0.1) return `${decimal(perSecond, 2)}/s`;
  return `${formatQuantity(perSecond)}/s`;
}

export function formatCompactRate(perSecond: number): string {
  if (perSecond > 0 && perSecond < 0.1) return `${decimal(perSecond, 2)}/s`;
  return `${formatCompact(perSecond)}/s`;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return '<1s';

  const wholeSeconds = Math.round(seconds);
  if (wholeSeconds < SECONDS_PER_MINUTE) return `${wholeSeconds}s`;

  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(seconds / SECONDS_PER_HOUR);
  if (hours < 24) return `${hours}h`;

  return `${formatWhole(seconds / SECONDS_PER_DAY)} d`;
}

function scale<T extends { exponent: number }>(
  value: number,
  tiers: readonly T[]
): { mantissa: string; tier: T } | null {
  const index = tiers.findIndex((tier) => value >= 10 ** tier.exponent);
  const tier = tiers[index];
  if (!tier) return null;

  const mantissa = roundToThreeSigFigs(value / 10 ** tier.exponent);
  if (mantissa < 1000) return { mantissa: withThreeSigFigs(mantissa), tier };

  const promoted = tiers[index - 1];
  return promoted
    ? { mantissa: withThreeSigFigs(mantissa / 1000), tier: promoted }
    : null;
}

function decimalsFor(mantissa: number): number {
  if (mantissa < 10) return 2;
  if (mantissa < 100) return 1;
  return 0;
}

function roundToThreeSigFigs(mantissa: number): number {
  const factor = 10 ** decimalsFor(mantissa);
  return Math.round(mantissa * factor) / factor;
}

function decimal(value: number, places: number): string {
  let format = decimalFormats.get(places);
  if (!format) {
    format = new Intl.NumberFormat(localeTag(), {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
    decimalFormats.set(places, format);
  }
  return format.format(value);
}

function withThreeSigFigs(mantissa: number): string {
  return decimal(mantissa, decimalsFor(mantissa));
}

export function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(localeTag(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
