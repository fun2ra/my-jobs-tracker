import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { groupApplications } from './group';
import { parseExport } from './parse';
import type { EmailEvent } from './types';

// The real export is git-ignored (personal data), so this only runs on my machine.
const EXPORT = resolve(__dirname, '../../Job application emails - Emails.csv');

describe.skipIf(!existsSync(EXPORT))('real Gmail export', () => {
  // Read in beforeAll: the describe body runs even when skipped, and the file is missing in CI.
  let events: EmailEvent[] = [];
  let applications: ReturnType<typeof groupApplications>['applications'] = [];
  let unassigned: EmailEvent[] = [];
  let noise: EmailEvent[] = [];
  beforeAll(() => {
    events = parseExport(readFileSync(EXPORT, 'utf8')).events;
    ({ applications, unassigned, noise } = groupApplications(events));
  });

  it('places every email once', () => {
    const placed = applications.flatMap(a => a.events).length + unassigned.length + noise.length;
    expect(placed).toBe(events.length);
    expect(new Set(events.map(e => e.id)).size).toBe(events.length);
  });

  it('never puts noise in an application', () => {
    expect(applications.flatMap(a => a.events).some(e => e.status === 'Noise')).toBe(false);
  });

  it('gives every application a stable ID from its first email', () => {
    expect(new Set(applications.map(a => a.id)).size).toBe(applications.length);
    applications.forEach(a => expect(a.id).toBe(a.events[0].id));
  });
});
