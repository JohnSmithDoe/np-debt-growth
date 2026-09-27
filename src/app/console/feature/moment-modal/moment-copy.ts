export interface MomentSection {
  readonly title: string;
  readonly body: string;
}

/** Every string is a catalogue key. */
export interface MomentCopy {
  readonly heading: string;
  readonly subheading: string;
  readonly chip: string;
  readonly art: string;
  readonly action: string;
  readonly sections: readonly MomentSection[];
}

export type MomentId = 'secret';

export const MOMENT_COPY: Readonly<Record<MomentId, MomentCopy>> = {
  secret: {
    heading: 'award.a-secret.label',
    subheading: 'moment.secret.subheading',
    chip: 'moment.secret.chip',
    art: 'assets/art/screen/easter-egg.png',
    action: 'moment.secret.action',
    sections: [
      { title: 'moment.secret.finding', body: 'moment.secret.finding.body' },
    ],
  },
};
