import type { EmailEvent, Source, Track } from './types';

export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Same name spelled differently by different senders. */
const COMPANY_ALIASES: Record<string, string> = {
  randstadservices: 'randstad',
};
/** Words that don't distinguish companies: legal forms, countries, HR department names. */
const COMPANY_FILLER =
  /\b(llc|inc|ltd|lda|limited|sa|gmbh|group|grupo|portugal|pt|spain|espana|iberia|recruitment|recruiting|talent acquisition|careers|hr)\b/g;

/** Comparison key: "Capgemini Group" and "Randstad Portugal" / "Randstadservices" match their short names. */
export function companyKey(name: string): string {
  const key = stripAccents(name.toLowerCase())
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9&]+/g, ' ')
    .replace(COMPANY_FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return COMPANY_ALIASES[key] ?? key;
}

/**
 * Comparison key without reference numbers and gender tags: "I&C Engineer(f/m/d) (295002)" → "i c engineer".
 * Other brackets stay: "Systems Engineer (SCADA)" → "systems engineer scada".
 */
export function roleKey(role: string): string {
  return stripAccents(role.toLowerCase())
    .replace(/\([^)]*\d[^)]*\)/g, ' ')
    .replace(/\b[mfwdx](\/[mfwdx])+\b/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Two role keys name the same job. A prefix also counts ("scada systems engineer after caref"
 * vs "scada systems engineer": the script sometimes runs on into the next sentence), but only
 * when the caller already knows the company is the same.
 */
export function rolesMatch(a: string, b: string, allowPrefix: boolean): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (!allowPrefix || Math.min(a.length, b.length) < 6) return false;
  return a.startsWith(b + ' ') || b.startsWith(a + ' ');
}

const REF_PATTERNS = [
  /\b(JR\d{4,})\b/gi,
  /\((\d{5,})\)/g,
  /\bID:?\s*(\d{5,})/gi,
  /refer[eê]ncia:?\s*(\d{4,})/gi,
  /\breq(?:uisition)?\s*#?:?\s*(\d{4,})/gi,
];

/** Job reference numbers, e.g. "JR38080", "(296459)", "ID: 10531563", "referência: 178646". */
export function extractRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const pattern of REF_PATTERNS) {
    for (const m of text.matchAll(pattern)) refs.add(m[1].toUpperCase());
  }
  return [...refs];
}

/** Where the application was made. */
export function detectSource(event: EmailEvent): Source {
  const text = `${event.fromEmail} ${event.subject}`.toLowerCase();
  if (text.includes('linkedin')) return 'LinkedIn';
  if (text.includes('indeed')) return 'Indeed';
  if (text.includes('infojobs')) return 'InfoJobs';
  if (text.includes('net-empregos')) return 'Net-Empregos';
  if (text.includes('randstad')) return 'Randstad';
  if (text.includes('landing.jobs')) return 'Landing.Jobs';
  if (event.status === 'Sent by me') return 'Direct email';
  return 'Company site';
}

const AUTOMATION =
  /automa|\bplc\b|scada|\bcontrols?\b|controlo|\bi c\b|commissioning|eletric|electric|instrument|robot|tecnico/;
const SOFTWARE =
  /software|front ?end|full ?stack|back ?end|react|developer|desenvolvedor|web ?design|typescript|javascript/;

/** Which of the two job searches a role belongs to. Automation wins: "Programador de PLC". */
export function detectTrack(role: string): Track {
  const key = roleKey(role);
  if (AUTOMATION.test(key)) return 'automation';
  if (SOFTWARE.test(key)) return 'software';
  return 'other';
}

const ACTION_NEEDED =
  /\bgdpr\b|\brgpd\b|consent|consentimento|consentimiento|complete (a sua|a tua|your|tu) (candidatura|application|solicitud)|completa tu (candidatura|solicitud)/i;

/** The company asks for something: data-protection consent, finishing the application form... */
export function asksForAction(event: EmailEvent): boolean {
  return ACTION_NEEDED.test(`${event.subject} ${event.snippet}`);
}
