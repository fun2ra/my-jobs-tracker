import { describe, expect, it } from 'vitest';
import { FIXTURE_ROW_COUNT, fixtureCsv } from './__fixtures__/emails';
import { mergeEvents, parseDate, parseExport, parseFrom } from './parse';

describe('parseExport', () => {
  it('reads every email of an Emails tab export and skips blank rows', () => {
    const { events, skippedRows } = parseExport(fixtureCsv());
    expect(events).toHaveLength(FIXTURE_ROW_COUNT);
    expect(skippedRows).toBe(0); // the blank row is dropped by the CSV reader itself

    const siemens = events.find(e => e.id === 'm08')!;
    expect(siemens.date).toEqual(new Date(2026, 9, 2, 15, 6));
    expect(siemens.status).toBe('Applied (in review)');
    expect(siemens.fromName).toBe('Siemens Energy Talent Acquisition');
    expect(siemens.fromEmail).toBe('talent-acquisition.hr@siemens-energy.com');
    expect(siemens.threadId).toBe('t-m08');
  });

  it('removes invisible characters', () => {
    const devoteam = parseExport(fixtureCsv()).events.find(e => e.id === 'm07')!;
    expect(devoteam.role).toBe('Software Development | React Developer');
  });

  it('reads older exports: Summary tab headers, US dates, old status names, no message ID', () => {
    const csv = [
      'Last update,Latest status,Company (guess),From,Subject,Snippet,Link',
      '10/9/2026,Interview,Devoteam,x@devoteam.com,Invitation,Hello,https://mail.google.com/mail/u/0/#all/abc',
      ',,,,,,',
      '9/30/2026,Applied,Arcesium,y@greenhouse.io,Thanks,Hi,https://mail.google.com/mail/u/0/#all/abc',
      'not a date,Applied,Arcesium,y@greenhouse.io,Thanks,Hi,https://mail.google.com/mail/u/0/#all/def',
    ].join('\n');
    const { events, skippedRows } = parseExport(csv);

    expect(events).toHaveLength(2);
    expect(skippedRows).toBe(1);
    expect(events[0].date).toEqual(new Date(2026, 9, 9));
    expect(events[0].status).toBe('Interview / meeting');
    expect(events[1].status).toBe('Applied (in review)');
    expect(events[0].role).toBe('');
    // Same conversation link, different emails: IDs must still differ.
    expect(events[0].threadId).toBe('abc');
    expect(events[0].id).not.toBe(events[1].id);
  });

  it('gives an unknown status "Other (check)"', () => {
    const csv = 'Date,Status,From,Subject\n2026-10-01 10:00,Something new,a@b.com,Hi';
    expect(parseExport(csv).events[0].status).toBe('Other (check)');
  });

  it('rejects a CSV that is not an export', () => {
    expect(() => parseExport('Name,Amount\nBob,3')).toThrow(/missing Date, From, Subject/);
  });
});

describe('mergeEvents', () => {
  it('keeps one copy of each email, preferring the newer import', () => {
    const { events } = parseExport(fixtureCsv());
    const updated = { ...events[0], status: 'Rejected' as const };
    const merged = mergeEvents(events, [updated]);
    expect(merged).toHaveLength(events.length);
    expect(merged.find(e => e.id === events[0].id)!.status).toBe('Rejected');
  });
});

describe('parseDate', () => {
  it.each([
    ['2026-10-09 15:08', new Date(2026, 9, 9, 15, 8)],
    ['2026-10-09', new Date(2026, 9, 9)],
    ['10/9/2026', new Date(2026, 9, 9)],
    ['9/30/2026', new Date(2026, 8, 30)],
  ])('%s', (input, expected) => {
    expect(parseDate(input)).toEqual(expected);
  });

  it('returns null for anything else', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('yesterday')).toBeNull();
  });
});

describe('parseFrom', () => {
  it.each([
    ['"Volkswagen Group Digital Solutions [Portugal]" <no-reply@hire.eu.lever.co>', 'Volkswagen Group Digital Solutions [Portugal]', 'no-reply@hire.eu.lever.co'],
    ['HR System <HRsystem@capgemini.com>', 'HR System', 'hrsystem@capgemini.com'],
    ['noreply@mail.amazon.jobs', '', 'noreply@mail.amazon.jobs'],
  ])('%s', (input, name, email) => {
    expect(parseFrom(input)).toEqual({ name, email });
  });
});
