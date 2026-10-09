import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupApplications } from './group';
import { parseExport } from './parse';

// The real export is git-ignored (personal data), so this only runs on my machine.
const EXPORT = resolve(__dirname, '../../Job application emails - Emails.csv');

describe.skipIf(!existsSync(EXPORT))('real Gmail export', () => {
  const { events } = parseExport(readFileSync(EXPORT, 'utf8'));
  const { applications, unassigned, noise } = groupApplications(events);

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
