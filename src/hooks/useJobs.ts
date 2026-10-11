import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runExport, type Session } from '../lib/google';
import { groupApplications } from '../lib/group';
import { mergeEvents, parseExport, parseTable } from '../lib/parse';
import { limitWarnings } from '../lib/scriptRun';
import { clearData, loadData, saveData, type SyncInfo } from '../lib/storage';
import type { EmailEvent } from '../lib/types';

/**
 * The job emails kept in this browser, grouped into applications, and the actions that change them.
 *
 *   const jobs = useJobs();
 *   jobs.applications            // Application[], newest activity first
 *   jobs.updateFromGmail(session, config.scriptId)
 *   jobs.updating, jobs.elapsed  // a run takes up to a couple of minutes
 */
export function useJobs() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [sync, setSync] = useState<SyncInfo>();
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { applications, unassigned, noise } = useMemo(() => groupApplications(events), [events]);

  // Latest events for async actions, which would otherwise merge into a stale copy.
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let active = true;
    loadData().then(saved => {
      if (!active) return;
      setEvents(saved.events);
      setSync(saved.sync);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Seconds since the run started, so a long run doesn't look stuck.
  useEffect(() => {
    if (!updating) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [updating]);

  const store = useCallback(async (next: EmailEvent[], nextSync: SyncInfo | undefined, done: string) => {
    setEvents(next);
    setSync(nextSync);
    const saved = await saveData(next, nextSync);
    setMessage(saved ? done : `${done} This browser blocks storage, so the data will be gone after a reload.`);
  }, []);

  const updateFromGmail = useCallback(
    async (session: Session, scriptId: string) => {
      setError('');
      setMessage('');
      setUpdating(true);
      try {
        const result = await runExport(session, scriptId);
        const { events: incoming } = parseTable(result.headers, result.rows);
        await store(
          mergeEvents(eventsRef.current, incoming),
          { at: new Date().toISOString(), emails: incoming.length, spreadsheetUrl: result.spreadsheetUrl, warnings: limitWarnings(result) },
          `Updated: ${incoming.length} emails from Gmail.`,
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUpdating(false);
      }
    },
    [store],
  );

  /** Fallback: CSV downloads of the spreadsheet's Emails tab, merged by message ID. */
  const importCsv = useCallback(
    async (files: Iterable<File> | ArrayLike<File>) => {
      const list = Array.from(files);
      if (!list.length) return;
      setError('');
      let merged = eventsRef.current;
      for (const file of list) {
        try {
          merged = mergeEvents(merged, parseExport(await file.text()).events);
        } catch (e) {
          setError(`${file.name}: ${(e as Error).message}`);
        }
      }
      await store(merged, sync, `Imported ${list.length} file(s).`);
    },
    [store, sync],
  );

  /** Deletes the emails stored in this browser. Gmail and the spreadsheet are not touched. */
  const clear = useCallback(async () => {
    await clearData();
    setEvents([]);
    setSync(undefined);
    setMessage('Data removed from this browser.');
  }, []);

  return {
    events,
    applications,
    unassigned,
    noise,
    sync,
    loaded,
    updating,
    elapsed,
    message,
    error,
    updateFromGmail,
    importCsv,
    clear,
  };
}
