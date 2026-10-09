import Papa from 'papaparse';
import { EMAIL_STATUSES, type EmailEvent, type EmailStatus } from './types';

/** Accepted header names per field: current export first, then older ones. */
const COLUMNS = {
  date: ['Date', 'Last update'],
  status: ['Status', 'Latest status'],
  company: ['Company (guess)', 'Company'],
  role: ['Role (guess)', 'Role'],
  from: ['From'],
  subject: ['Subject'],
  snippet: ['Snippet'],
  link: ['Link'],
  messageId: ['Message ID'],
  threadId: ['Thread ID'],
  matchedBy: ['Matched by'],
} as const;

type Field = keyof typeof COLUMNS;
const REQUIRED: Field[] = ['date', 'from', 'subject'];

/** Status names used by older versions of the script. */
const LEGACY_STATUS: Record<string, EmailStatus> = {
  Applied: 'Applied (in review)',
  Interview: 'Interview / meeting',
};

export interface ParseResult {
  events: EmailEvent[];
  /** Blank rows and rows without a readable date. */
  skippedRows: number;
}

/** Parses a CSV download of the script's Emails (or Summary) tab. */
export function parseExport(csv: string): ParseResult {
  const { data } = Papa.parse<string[]>(csv.replace(/^\ufeff/, ''), { skipEmptyLines: 'greedy' });
  const [headers = [], ...rows] = data;
  return parseTable(headers, rows);
}

/** Parses the Emails tab as header names plus rows of cells (a CSV, or rows returned by the script). */
export function parseTable(headers: string[], rows: string[][]): ParseResult {
  const column = {} as Record<Field, number>;
  for (const field of Object.keys(COLUMNS) as Field[]) {
    column[field] = headers.findIndex(h => (COLUMNS[field] as readonly string[]).includes(h.trim()));
  }
  const missing = REQUIRED.filter(field => column[field] < 0);
  if (missing.length) {
    throw new Error(
      `This doesn't look like a job emails export: missing ${missing.map(f => COLUMNS[f][0]).join(', ')} column.`,
    );
  }

  const events: EmailEvent[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const get = (field: Field) => clean(column[field] >= 0 ? String(row[column[field]] ?? '') : '');
    const date = parseDate(get('date'));
    if (!date) {
      skippedRows++;
      continue;
    }
    const { name, email } = parseFrom(get('from'));
    const subject = get('subject');
    const link = get('link');
    events.push({
      id: get('messageId') || fallbackId(link, date, subject),
      threadId: get('threadId') || link.split('/').pop() || '',
      date,
      status: parseStatus(get('status')),
      company: get('company'),
      role: get('role'),
      fromName: name,
      fromEmail: email,
      subject,
      snippet: get('snippet'),
      link,
      matchedBy: get('matchedBy'),
    });
  }
  return { events, skippedRows };
}

/** Combines imports; a later import replaces an email with the same ID. */
export function mergeEvents(existing: EmailEvent[], incoming: EmailEvent[]): EmailEvent[] {
  const byId = new Map(existing.map(e => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()];
}

/**
 * "2026-10-09 15:08" (current export) or "10/9/2026" (older exports, US month/day order,
 * as Google Sheets writes it for a US-locale sheet).
 */
export function parseDate(value: string): Date | null {
  let m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2], +(m[4] ?? 0), +(m[5] ?? 0));
  return null;
}

/** `"Name" <a@b.com>` or `a@b.com`. */
export function parseFrom(value: string): { name: string; email: string } {
  const m = value.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (!m) return { name: '', email: value.trim().toLowerCase() };
  return { name: m[1].replace(/^"|"$/g, '').trim(), email: m[2].trim().toLowerCase() };
}

function parseStatus(value: string): EmailStatus {
  if ((EMAIL_STATUSES as readonly string[]).includes(value)) return value as EmailStatus;
  return LEGACY_STATUS[value] ?? 'Other (check)';
}

function clean(value: string): string {
  return value.replace(/&nbsp;/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '').trim();
}

/** Older exports have no message ID and their link is per conversation, so add date and subject. */
function fallbackId(link: string, date: Date, subject: string): string {
  const text = `${link}|${date.toISOString()}|${subject}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return 'x' + (hash >>> 0).toString(16).padStart(8, '0');
}
