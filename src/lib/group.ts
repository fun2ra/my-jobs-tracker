import {
  asksForAction,
  companyKey,
  detectSource,
  detectTrack,
  extractRefs,
  roleKey,
  rolesMatch,
} from './normalize';
import type { Application, EmailEvent, EmailStatus, Stage } from './types';

export interface GroupResult {
  /** Most recently updated first. */
  applications: Application[];
  /** "Other (check)" emails that don't belong to any known application. */
  unassigned: EmailEvent[];
  /** Login codes, alerts, account emails. */
  noise: EmailEvent[];
}

interface Draft {
  events: EmailEvent[];
  companyKey: string;
  roleKeys: Set<string>;
  refs: Set<string>;
}

interface Features {
  companyKey: string;
  roleKey: string;
  refs: string[];
}

/**
 * Groups emails into applications. Companies send each update as a new conversation,
 * so emails are matched by company + role, or by a shared job reference number.
 */
export function groupApplications(events: EmailEvent[]): GroupResult {
  const sorted = [...events].sort(chronological);
  const drafts: Draft[] = [];

  // Emails with a known status can start an application.
  for (const event of sorted) {
    if (event.status === 'Noise' || event.status === 'Other (check)') continue;
    const f = features(event);
    const draft = findDraft(drafts, f);
    if (draft) addTo(draft, event, f);
    else drafts.push(newDraft(event, f));
  }

  // "Other" emails (e.g. a GDPR consent request) only join an application of the same company.
  const unassigned: EmailEvent[] = [];
  for (const event of sorted) {
    if (event.status !== 'Other (check)') continue;
    const f = features(event);
    const draft = f.companyKey ? findDraft(drafts, f) : undefined;
    if (draft) addTo(draft, event, f);
    else unassigned.push(event);
  }

  const applications = drafts
    .map(toApplication)
    .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime());
  return { applications, unassigned, noise: sorted.filter(e => e.status === 'Noise') };
}

/** By date; emails sent in the same minute by message ID, so the result never depends on input order. */
function chronological(a: EmailEvent, b: EmailEvent): number {
  return a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id);
}

function features(event: EmailEvent): Features {
  return {
    companyKey: companyKey(event.company),
    roleKey: roleKey(event.role),
    refs: extractRefs(`${event.role} ${event.subject} ${event.snippet}`),
  };
}

function findDraft(drafts: Draft[], f: Features): Draft | undefined {
  // A shared reference number is the strongest signal, as long as the companies don't conflict.
  if (f.refs.length) {
    const byRef = drafts.find(
      d =>
        (!d.companyKey || !f.companyKey || d.companyKey === f.companyKey) &&
        f.refs.some(r => d.refs.has(r)),
    );
    if (byRef) return byRef;
  }

  if (f.companyKey) {
    const sameCompany = drafts.filter(d => d.companyKey === f.companyKey);
    if (!sameCompany.length) return undefined;
    if (f.roleKey) {
      return (
        sameCompany.find(d => [...d.roleKeys].some(k => rolesMatch(k, f.roleKey, true))) ??
        // The company's first email didn't name the role (e.g. Amazon's "track your application").
        sameCompany.find(d => d.roleKeys.size === 0)
      );
    }
    // No role in this email: it's about the company's most recent application.
    return sameCompany.reduce((a, b) => (lastDate(a) >= lastDate(b) ? a : b));
  }

  // No company (Indeed, some job boards): only an identical role at an unnamed company matches.
  if (f.roleKey) {
    return drafts.find(d => !d.companyKey && [...d.roleKeys].some(k => rolesMatch(k, f.roleKey, false)));
  }
  return undefined;
}

function newDraft(event: EmailEvent, f: Features): Draft {
  const draft: Draft = { events: [], companyKey: f.companyKey, roleKeys: new Set(), refs: new Set() };
  addTo(draft, event, f);
  return draft;
}

function addTo(draft: Draft, event: EmailEvent, f: Features) {
  draft.events.push(event);
  if (!draft.companyKey) draft.companyKey = f.companyKey;
  if (f.roleKey) draft.roleKeys.add(f.roleKey);
  f.refs.forEach(r => draft.refs.add(r));
}

function lastDate(draft: Draft): number {
  return draft.events[draft.events.length - 1].date.getTime();
}

const STAGE_OF: Partial<Record<EmailStatus, Stage>> = {
  'Applied (in review)': 'applied',
  'Sent by me': 'applied',
  Viewed: 'viewed',
  Assessment: 'assessment',
  'Interview / meeting': 'interview',
  Offer: 'offer',
  Rejected: 'rejected',
};
const PROGRESS: Stage[] = ['applied', 'viewed', 'assessment', 'interview'];

/** An offer or a rejection ends the process; otherwise the furthest step reached. */
export function stageOf(events: EmailEvent[]): Stage {
  const stages = new Set(events.map(e => STAGE_OF[e.status]).filter(Boolean));
  if (stages.has('offer')) return 'offer';
  if (stages.has('rejected')) return 'rejected';
  return [...PROGRESS].reverse().find(s => stages.has(s)) ?? 'applied';
}

function toApplication(draft: Draft): Application {
  const events = [...draft.events].sort(chronological);
  const stage = stageOf(events);
  const role = mostCommon(events.map(e => e.role));
  return {
    id: events[0].id,
    // The latest sender usually names the company best ("Randstad Portugal", not "Randstadservices").
    company: [...events].reverse().find(e => e.company)?.company ?? '',
    role,
    stage,
    source: events.map(detectSource).find(s => s !== 'Company site') ?? 'Company site',
    track: detectTrack(role || events.map(e => e.subject).join(' ')),
    refs: [...draft.refs],
    appliedAt: events[0].date,
    lastUpdate: events[events.length - 1].date,
    needsAction: stage !== 'rejected' && events.some(asksForAction),
    events,
  };
}

/** Most frequent non-empty value; on a tie the shortest (the cleanest spelling). */
function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value.length < best.length)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** Still waiting for a reply after `days` days. */
export function isStale(app: Application, now: Date, days = 21): boolean {
  const waiting = app.stage === 'applied' || app.stage === 'viewed';
  return waiting && now.getTime() - app.lastUpdate.getTime() > days * 86_400_000;
}
