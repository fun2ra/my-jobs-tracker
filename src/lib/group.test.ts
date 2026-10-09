import { describe, expect, it } from 'vitest';
import { fixtureCsv } from './__fixtures__/emails';
import { groupApplications, isStale, stageOf } from './group';
import { parseExport } from './parse';
import type { Application, EmailEvent } from './types';

const { events } = parseExport(fixtureCsv());
const result = groupApplications(events);

function app(eventId: string): Application {
  const found = result.applications.find(a => a.events.some(e => e.id === eventId));
  if (!found) throw new Error(`No application contains ${eventId}`);
  return found;
}
const ids = (a: Application) => a.events.map(e => e.id);

describe('groupApplications', () => {
  it('finds every application in the fixture', () => {
    expect(result.applications).toHaveLength(15);
    expect(result.noise.map(e => e.id)).toEqual(['m10', 'm16']);
    expect(result.unassigned.map(e => e.id)).toEqual(['m02']); // GetYourGuide booking
  });

  it('puts every non-noise email in exactly one place', () => {
    const placed = [...result.applications.flatMap(ids), ...result.unassigned.map(e => e.id)];
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed).toHaveLength(events.length - result.noise.length);
  });

  it('keeps two roles at the same company apart, and matches updates by reference number', () => {
    expect(ids(app('m08'))).toEqual(['m08', 'm29']); // Siemens Digitalization Specialist
    expect(ids(app('m09'))).toEqual(['m09', 'm27']); // Siemens I&C Commissioning Engineer
    expect(app('m08').stage).toBe('applied');
    expect(app('m09').stage).toBe('rejected');
    expect(app('m09').refs).toEqual(['295002']);
  });

  it('matches a rejection whose role ran on into the next sentence', () => {
    expect(ids(app('m14'))).toEqual(['m14', 'm28']); // Capgemini SCADA
    expect(app('m14').stage).toBe('rejected');
    expect(app('m14').role).toBe('SCADA Systems Engineer');
    expect(ids(app('m01'))).toEqual(['m01']); // Capgemini React, an earlier application
  });

  it('merges the spellings of one company and fills in the role from a later email', () => {
    const randstad = app('m11');
    expect(ids(randstad)).toEqual(['m11', 'm18']);
    expect(randstad.company).toBe('Randstad Portugal');
    expect(randstad.role).toBe('Engenheiro de Sistemas de Controlo (M/F/X)');
    expect(randstad.stage).toBe('rejected');
    expect(randstad.source).toBe('Randstad');

    expect(ids(app('m23'))).toEqual(['m23', 'm24']); // Amazon: role only in the second email
    expect(app('m23').role).toBe('Automation Engineer');
  });

  it('treats repeated confirmations without a role as one application', () => {
    expect(ids(app('m04'))).toEqual(['m04', 'm05', 'm06']); // Arcesium
  });

  it('groups emails with no company only by an identical role', () => {
    const saoJoao = app('m20');
    expect(ids(saoJoao)).toEqual(['m20', 'm21', 'm22']); // Indeed + the employer's own form
    expect(saoJoao.source).toBe('Indeed');
    expect(saoJoao.needsAction).toBe(true); // "complete a sua candidatura"
    expect(ids(app('m19'))).toEqual(['m19']); // plain "Automation Engineer" is a different job
    expect(app('m19')).not.toBe(app('m17')); // and not ECCO's "Automation Engineer" either
  });

  it('attaches an "Other" email to its company and flags requests', () => {
    const vw = app('m26');
    expect(ids(vw)).toEqual(['m25', 'm26']);
    expect(vw.needsAction).toBe(true); // GDPR consent
    expect(vw.track).toBe('software');
  });

  it('reports the furthest stage, source and field', () => {
    expect(app('m07').stage).toBe('interview'); // Devoteam
    expect(app('m03').stage).toBe('interview'); // Lithosquare
    expect(app('m03').company).toBe('Lithosquare');
    expect(app('m12').source).toBe('Direct email'); // Aubay, sent by me
    expect(app('m12').track).toBe('automation');
    expect(app('m13').source).toBe('InfoJobs');
  });

  it('dates applications by their first and last email and sorts newest first', () => {
    const siemens = app('m08');
    expect(siemens.appliedAt).toEqual(new Date(2026, 9, 2, 15, 6));
    expect(siemens.lastUpdate).toEqual(new Date(2026, 9, 9, 15, 8));
    expect(siemens.id).toBe('m08');
    const updates = result.applications.map(a => a.lastUpdate.getTime());
    expect(updates).toEqual([...updates].sort((a, b) => b - a));
  });
});

describe('stageOf', () => {
  const event = (status: EmailEvent['status']) => ({ status }) as EmailEvent;

  it('ends at a rejection even after an interview', () => {
    expect(stageOf([event('Interview / meeting'), event('Rejected')])).toBe('rejected');
  });

  it('prefers an offer over everything', () => {
    expect(stageOf([event('Rejected'), event('Offer')])).toBe('offer');
  });

  it('treats an email I sent as applied', () => {
    expect(stageOf([event('Sent by me')])).toBe('applied');
  });
});

describe('isStale', () => {
  it('flags applications waiting longer than the limit', () => {
    const arcesium = app('m04'); // last email 2 October
    expect(isStale(arcesium, new Date(2026, 9, 20))).toBe(false);
    expect(isStale(arcesium, new Date(2026, 9, 30))).toBe(true);
    expect(isStale(app('m09'), new Date(2026, 11, 1))).toBe(false); // rejected: not waiting
  });
});
