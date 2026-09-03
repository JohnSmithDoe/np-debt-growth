export const CLIENT_NAME = 'Meridian Financial Group';
export const ENGAGEMENT_NAME = 'Platform Modernisation Programme';

export interface Approval {
  readonly name: string;
  readonly role: string;
  readonly date: string;
}

export const APPROVALS: Readonly<Record<number, Approval>> = {
  1: { name: 'D. Halloran', role: 'Head of Delivery', date: '12 January 2024' },
  2: {
    name: 'D. Halloran',
    role: 'Head of Delivery',
    date: '27 February 2024',
  },
  3: { name: 'D. Halloran', role: 'Director of Delivery', date: '14 May 2024' },
  4: {
    name: 'D. Halloran',
    role: 'Director of Delivery',
    date: '2 August 2024',
  },
  5: {
    name: 'R. Achterberg',
    role: 'Interim Head of Delivery',
    date: '19 September 2024',
  },
  6: {
    name: 'R. Achterberg',
    role: 'Interim Head of Delivery',
    date: '30 November 2024',
  },
  7: {
    name: 'Programme Board',
    role: 'quorum of two',
    date: '16 February 2025',
  },
  8: {
    name: 'Programme Board',
    role: 'quorum not recorded',
    date: '3 April 2025',
  },
};

export function approvalAt(tier: number): Approval | undefined {
  return APPROVALS[tier];
}
