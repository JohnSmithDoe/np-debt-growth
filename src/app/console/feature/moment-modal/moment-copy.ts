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

export type MomentId = 'secret';

export const MOMENT_COPY: Readonly<Record<MomentId, MomentCopy>> = {
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
