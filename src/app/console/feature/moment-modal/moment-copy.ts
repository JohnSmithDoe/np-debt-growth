export interface MomentSection {
  readonly title: string;
  readonly body: string;
}

export interface MomentCopy {
  readonly heading: string;
  readonly subheading: string;
  readonly chip: string;
  readonly art: string;
  readonly action: string;
  readonly sections: readonly MomentSection[];
}

export type MomentId = 'promotion' | 'secret';

export const MOMENT_COPY: Readonly<Record<MomentId, MomentCopy>> = {
  promotion: {
    heading: 'Promotion Round',
    subheading: 'Compensation Review — Confidential',
    chip: 'Irreversible',
    art: 'assets/art/screen/promotion.png',
    action: 'Acknowledge',
    sections: [
      {
        title: 'Context',
        body: 'The junior bench has grown to a size where the org chart is flat and no one on it is accountable for the others. Retention was raised at the last three leadership meetings and minuted each time. A salary review was scoped and rejected on cost.',
      },
      {
        title: 'Decision',
        body: 'Every Junior Developer is retitled Senior Developer, effective immediately. No training was commissioned and none is planned. The Junior Dev requisition line is closed for the remainder of the engagement.',
      },
      {
        title: 'Consequences',
        body: 'The bench now clears a whole patch at a time and will take a P0. Nobody’s day changed. The word "senior" means one thing less than it did this morning, and the client is billed at the new rate from Monday.',
      },
    ],
  },
  secret: {
    heading: 'You read the code',
    subheading: 'Undocumented',
    chip: 'Found',
    art: 'assets/art/screen/easter-egg.png',
    action: 'Close the file',
    sections: [
      {
        title: 'Finding',
        body: 'Nobody has opened that file since 2011. The TODO is older than the framework it was written against and older than three of the people who have since owned this repository. It was not removed before launch. It will not be removed before the next one. Everything bills slightly better now.',
      },
    ],
  },
};
