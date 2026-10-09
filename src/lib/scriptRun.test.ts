import { describe, expect, it } from 'vitest';
import { parseTable } from './parse';
import { limitWarnings, readScriptResponse, type ExportResult } from './scriptRun';

const RESULT: ExportResult = {
  headers: ['Date', 'Status', 'Company (guess)', 'Role (guess)', 'From', 'Subject', 'Snippet', 'Link', 'Message ID', 'Thread ID', 'Matched by'],
  rows: [
    ['2026-10-09 14:31', 'Rejected', 'Capgemini Group', 'SCADA Systems Engineer', 'HR System <HRsystem@capgemini.com>', 'Capgemini Group - Application Status Update', 'We regret to inform you.', 'https://mail.google.com/mail/u/0/#all/m1', 'm1', 't1', 'Application subjects'],
  ],
  runInfo: [
    ['Job websites', 120, 120, '', 'q1'],
    ['Interviews & meetings', 500, 3, 'HIT LIMIT: older emails were skipped.', 'q2'],
    ['TOTAL', 123, '', '123 emails', ''],
  ],
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/x',
};

describe('readScriptResponse', () => {
  it('returns the export on success', () => {
    const result = readScriptResponse(200, { done: true, response: { result: RESULT } });
    const { events } = parseTable(result.headers, result.rows);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'm1', status: 'Rejected', company: 'Capgemini Group' });
  });

  it("reports the script's own error message", () => {
    const body = { done: true, error: { code: 3, details: [{ errorMessage: 'Exception: Service invoked too many times' }] } };
    expect(() => readScriptResponse(200, body)).toThrow('Exception: Service invoked too many times');
  });

  it('adds a setup hint to API errors', () => {
    const body = { error: { code: 404, message: 'Requested entity was not found.', status: 'NOT_FOUND' } };
    expect(() => readScriptResponse(404, body)).toThrow(/Check the Script ID/);
    const disabled = { error: { code: 403, message: 'Apps Script API has not been used in project 123 before or it is disabled.' } };
    expect(() => readScriptResponse(403, disabled)).toThrow(/Enable the Apps Script API/);
    const missing = { done: true, error: { code: 3, details: [{ errorMessage: 'Script function not found: runExport' }] } };
    expect(() => readScriptResponse(200, missing)).toThrow(/Script ID in Settings must be/);
  });

  it('fails clearly when an old script version returns nothing', () => {
    expect(() => readScriptResponse(200, { done: true, response: {} })).toThrow(/returned no data/);
  });
});

describe('limitWarnings', () => {
  it('names the searches that hit their limit', () => {
    expect(limitWarnings(RESULT)).toEqual(['Interviews & meetings']);
  });
});
