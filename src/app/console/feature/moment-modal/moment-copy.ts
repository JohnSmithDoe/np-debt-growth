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

export type MomentId = 'secret' | 'closeout';

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
  closeout: {
    heading: 'moment.closeout.heading',
    subheading: 'moment.closeout.subheading',
    chip: 'moment.closeout.chip',
    art: 'assets/board/backdrop/8-office.webp',
    action: 'moment.closeout.action',
    sections: [
      { title: 'adr.context', body: 'moment.closeout.context' },
      { title: 'adr.decision', body: 'moment.closeout.decision' },
      { title: 'adr.consequences', body: 'moment.closeout.consequences' },
      { title: 'adr.approved', body: 'moment.closeout.approved' },
      { title: 'adr.comments', body: 'moment.closeout.comments' },
    ],
  },
};
