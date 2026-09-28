export const CLIENT_NAME = 'Meridian Financial Group';
export const ENGAGEMENT_KEY = 'client.engagement';

export type SignatoryId = 'halloran' | 'achterberg' | 'board' | 'agent';
export type RoleId =
  | 'head'
  | 'director'
  | 'interim'
  | 'quorum-two'
  | 'quorum-none'
  | 'procurement';

export interface Approval {
  readonly by: SignatoryId;
  readonly role: RoleId;
  readonly date: string;
}

export const signatoryKey = (id: SignatoryId): string => `approval.by.${id}`;
export const roleKey = (id: RoleId): string => `approval.role.${id}`;

export const APPROVALS: Readonly<Record<number, Approval>> = {
  1: { by: 'halloran', role: 'head', date: '2024-01-12' },
  2: { by: 'halloran', role: 'head', date: '2024-02-27' },
  3: { by: 'halloran', role: 'director', date: '2024-05-14' },
  4: { by: 'halloran', role: 'director', date: '2024-08-02' },
  5: { by: 'achterberg', role: 'interim', date: '2024-09-19' },
  6: { by: 'achterberg', role: 'interim', date: '2024-11-30' },
  7: { by: 'board', role: 'quorum-two', date: '2025-02-16' },
  8: { by: 'board', role: 'quorum-none', date: '2025-04-03' },
};

export const CLOSEOUT_APPROVAL: Approval = {
  by: 'agent',
  role: 'procurement',
  date: '2025-06-30',
};

export function approvalAt(tier: number): Approval | undefined {
  return APPROVALS[tier];
}
