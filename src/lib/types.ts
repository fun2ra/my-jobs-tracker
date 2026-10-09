/** Statuses written by apps-script/exportJobEmails.gs. */
export const EMAIL_STATUSES = [
  'Applied (in review)',
  'Viewed',
  'Assessment',
  'Interview / meeting',
  'Offer',
  'Rejected',
  'Sent by me',
  'Noise',
  'Other (check)',
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** One email from the export. */
export interface EmailEvent {
  /** Gmail message ID, or a stable fallback for older exports without one. */
  id: string;
  threadId: string;
  date: Date;
  status: EmailStatus;
  company: string;
  role: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  link: string;
  matchedBy: string;
}

/** Furthest point an application reached. */
export type Stage = 'applied' | 'viewed' | 'assessment' | 'interview' | 'offer' | 'rejected';

export type Source =
  | 'LinkedIn'
  | 'Indeed'
  | 'InfoJobs'
  | 'Net-Empregos'
  | 'Randstad'
  | 'Landing.Jobs'
  | 'Direct email'
  | 'Company site';

export type Track = 'automation' | 'software' | 'other';

/** Emails grouped into one job application. */
export interface Application {
  /** Message ID of the earliest email: stable across re-imports. */
  id: string;
  company: string;
  role: string;
  stage: Stage;
  source: Source;
  track: Track;
  /** Job reference numbers seen in the emails (e.g. JR38080, 296459). */
  refs: string[];
  appliedAt: Date;
  lastUpdate: Date;
  /** The company asked for something (GDPR consent, complete the application...). */
  needsAction: boolean;
  /** Chronological. */
  events: EmailEvent[];
}
