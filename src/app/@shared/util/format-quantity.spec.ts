import { beforeEach, describe, expect, it } from 'vitest';

import {
  formatCompact,
  formatCompactMoney,
  formatCompactRate,
  formatCompactWhole,
  formatDuration,
  formatMoney,
  formatPoints,
  formatPointsExact,
  formatQuantity,
  formatRate,
  formatWhole,
  setFormatLanguage,
} from './format-quantity';

beforeEach(() => setFormatLanguage('en'));

describe('formatQuantity', () => {
  it('renders the named tiers the design asked for', () => {
    expect(formatQuantity(1.5e12)).toBe('1.50 trillion');
    expect(formatQuantity(4.5e15)).toBe('4.50 quadrillion');
  });

  it('uses the SHORT scale', () => {
    expect(formatQuantity(1e9)).toBe('1.00 billion');
    expect(formatQuantity(1e12)).toBe('1.00 trillion');
    expect(formatQuantity(1e15)).toBe('1.00 quadrillion');
  });

  it('keeps three significant figures across the tier', () => {
    expect(formatQuantity(1e12)).toBe('1.00 trillion');
    expect(formatQuantity(15e12)).toBe('15.0 trillion');
    expect(formatQuantity(150e12)).toBe('150 trillion');
  });

  it('promotes the tier when rounding overflows it', () => {
    expect(formatQuantity(999.95e12)).toBe('1.00 quadrillion');
    expect(formatQuantity(999.999e6)).toBe('1.00 billion');
  });

  it('does not promote just below the rounding boundary', () => {
    expect(formatQuantity(999.4e12)).toBe('999 trillion');
  });

  it('switches to names at exactly a million', () => {
    expect(formatQuantity(999_999)).toBe('999,999');
    expect(formatQuantity(1e6)).toBe('1.00 million');
  });

  it('shows one decimal below a thousand and separators above it', () => {
    expect(formatQuantity(0)).toBe('0.0');
    expect(formatQuantity(0.5)).toBe('0.5');
    expect(formatQuantity(999.9)).toBe('999.9');
    expect(formatQuantity(12_345)).toBe('12,345');
  });

  it('reaches the top of the named range', () => {
    expect(formatQuantity(1e36)).toBe('1.00 undecillion');
  });

  it('falls back to exponential past the readable names', () => {
    expect(formatQuantity(1e39)).toBe('1.00e+39');
  });

  it('handles a negative and a non-number without throwing', () => {
    expect(formatQuantity(-1.5e12)).toBe('-1.50 trillion');
    expect(formatQuantity(Number.NaN)).toBe('—');
    expect(formatQuantity(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatRate', () => {
  it('renders a normal rate with the suffix', () => {
    expect(formatRate(0.5)).toBe('0.5/s');
    expect(formatRate(1.5e12)).toBe('1.50 trillion/s');
  });

  it('keeps a sub-0.1 producer visible', () => {
    expect(formatRate(0.05)).toBe('0.05/s');
    expect(formatRate(0.02)).toBe('0.02/s');
  });

  it('shows an idle line as zero rather than as a rounding artefact', () => {
    expect(formatRate(0)).toBe('0.0/s');
  });
});

describe('the compact readout', () => {
  it('abbreviates from a thousand up', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1_000)).toBe('1.00k');
    expect(formatCompact(12_345)).toBe('12.3k');
    expect(formatCompact(1.5e6)).toBe('1.50M');
    expect(formatCompact(1.5e12)).toBe('1.50T');
    expect(formatCompact(1e36)).toBe('1.00Ud');
  });

  it('promotes the tier when rounding overflows it, as the spelled-out one does', () => {
    expect(formatCompact(999.95e3)).toBe('1.00M');
  });

  it('counts whole and measures fractional', () => {
    expect(formatCompactWhole(15)).toBe('15');
    expect(formatCompactWhole(0)).toBe('0');
    expect(formatCompactMoney(47_500)).toBe('€47.5k');
    expect(formatCompactRate(4.2)).toBe('4.20/s');
    expect(formatCompactRate(0.05)).toBe('0.05/s');
  });
});

describe('formatPoints', () => {
  it('shows points whole, rounded down, never as a fraction', () => {
    expect(formatPoints(0.9)).toBe('0');
    expect(formatPoints(21)).toBe('21');
    expect(formatPoints(21.7)).toBe('21');
    expect(formatPoints(1.5e6)).toBe('1.50M');
    expect(formatPointsExact(1.5e6)).toBe('1.50 million');
  });

  it('prints nothing yet as nothing, not as three figures of it', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPointsExact(0)).toBe('0');
  });
});

describe('formatWhole', () => {
  it('renders a price without a decimal', () => {
    expect(formatWhole(15)).toBe('15');
    expect(formatWhole(6_000)).toBe('6,000');
    expect(formatWhole(0)).toBe('0');
  });

  it('hands over to the named tiers where the distinction stops existing', () => {
    expect(formatWhole(1.5e12)).toBe('1.50 trillion');
  });

  it('has the same non-finite fallback as the others', () => {
    expect(formatWhole(Number.NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('renders seconds below a minute', () => {
    expect(formatDuration(0.4)).toBe('<1s');
    expect(formatDuration(1)).toBe('1s');
    expect(formatDuration(45)).toBe('45s');
  });

  it('renders minutes below an hour', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(90)).toBe('2m');
    expect(formatDuration(59 * 60)).toBe('59m');
  });

  it('renders hours below a day', () => {
    expect(formatDuration(60 * 60)).toBe('1h');
    expect(formatDuration(5 * 60 * 60)).toBe('5h');
  });

  it('hands an absurd stall over to formatWhole in days', () => {
    expect(formatDuration(48 * 60 * 60)).toBe('2 d');
    expect(formatDuration(1.5e12 * 60 * 60 * 24)).toBe('1.50 trillion d');
  });

  it('never shows Infinity or NaN — a dash instead', () => {
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
  });
});

describe('the German cut', () => {
  beforeEach(() => setFormatLanguage('de'));

  it('uses the LONG scale, where English used the short one', () => {
    expect(formatQuantity(1e6)).toBe('1,00 Million');
    expect(formatQuantity(1e9)).toBe('1,00 Milliarde');
    expect(formatQuantity(1e12)).toBe('1,00 Billion');
    expect(formatQuantity(1e15)).toBe('1,00 Billiarde');
    expect(formatQuantity(1e18)).toBe('1,00 Trillion');
  });

  it('disagrees with English on the same word', () => {
    setFormatLanguage('en');
    const englishBillion = formatQuantity(1e9);
    setFormatLanguage('de');
    const germanBillion = formatQuantity(1e12);

    expect(englishBillion).toBe('1.00 billion');
    expect(germanBillion).toBe('1,00 Billion');
  });

  it('reaches the same ceiling in the same number of rungs', () => {
    expect(formatQuantity(1e36)).toBe('1,00 Sextillion');
    expect(formatQuantity(1e39)).toBe('1.00e+39');
  });

  it('swaps the decimal mark and the thousands separator', () => {
    expect(formatQuantity(0.5)).toBe('0,5');
    expect(formatQuantity(12_345)).toBe('12.345');
    expect(formatWhole(6_000)).toBe('6.000');
    expect(formatRate(0.05)).toBe('0,05/s');
  });

  it('trails the € after a non-breaking space', () => {
    expect(formatMoney(6_000)).toBe('6.000 €');
    expect(formatCompactMoney(47_500)).toBe('47,5k €');
  });

  it('abbreviates with the German symbols', () => {
    expect(formatCompact(1.5e6)).toBe('1,50Mio');
    expect(formatCompact(1.5e9)).toBe('1,50Mrd');
    expect(formatCompact(1.5e12)).toBe('1,50Bio');
    expect(formatCompact(1_000)).toBe('1,00k');
  });

  it('promotes a rounding overflow onto the German rung above', () => {
    expect(formatQuantity(999.95e9)).toBe('1,00 Billion');
  });
});

describe('the two ladders', () => {
  it('name every rung uniquely within a language', () => {
    for (const language of ['en', 'de'] as const) {
      setFormatLanguage(language);
      const rendered = Array.from({ length: 11 }, (_, step) =>
        formatQuantity(10 ** (6 + step * 3))
      );
      const compact = Array.from({ length: 11 }, (_, step) =>
        formatCompact(10 ** (6 + step * 3))
      );

      expect(new Set(rendered).size).toBe(11);
      expect(new Set(compact).size).toBe(11);
    }
  });
});
