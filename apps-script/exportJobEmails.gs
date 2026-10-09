/**
 * Job application email export for Gmail (English / Portuguese / Spanish).
 *
 * Two ways to run it:
 *   - From the editor: pick exportJobEmails in the dropdown, then click Run.
 *   - From the tracker app's "Update from Gmail" button, which calls runExport through the
 *     Apps Script API. Setup steps: SETUP.md in the tracker repository.
 *
 * Needs the Gmail advanced service (Services > Gmail API) and the scopes in appsscript.json:
 * read-only Gmail access plus this spreadsheet.
 *
 * Tabs created:
 *   Emails   - one row per email (what the tracker app reads)
 *   Summary  - one row per conversation, with its most meaningful status
 *   Run info - what each search found, and warnings when a search hit its limit
 *
 * Statuses: Applied (in review), Viewed, Assessment, Interview / meeting, Offer,
 *           Rejected, Sent by me, Noise (codes, alerts, newsletters), Other (check).
 */

const START_DATE = '2026-09-29'; // only emails from this day on (yyyy-MM-dd, in the script's time zone)
const MAX_THREADS_PER_GROUP = 500; // Run info warns when a search group reaches this
const PAGE_SIZE = 100;             // Gmail returns at most 100 threads per call
const GMAIL_UNITS_PER_MINUTE = 12000; // Google's limit is 15,000; the margin covers other Gmail use
const RETRY_WAITS_MS = [5000, 15000, 30000, 30000];
const TIME_BUDGET_MS = 4.5 * 60 * 1000; // Apps Script stops runs at 6 minutes; leave time to write the sheets
const CLASSIFY_CHARS = 2500;       // only the top of the email is classified, not footers
const NOISE_CHARS = 400;
const SNIPPET_CHARS = 300;
const LINK = 'https://mail.google.com/mail/u/0/#all/';

// Generic words (interview, unfortunately, invitation...) only count in job-related mail.
// Avoid words like candidate / position / hiring: news and "we're hiring" footers use them.
const JOB_CONTEXT = '(application OR applying OR applied OR candidatura OR solicitud OR postulación OR vaga OR vacancy OR vacante OR recruitment OR recrutamento OR reclutamiento OR recruiter OR "talent acquisition" OR "processo de seleção" OR "proceso de selección")';

// Gmail searches, one group at a time (EN / PT / ES).
const SEARCH_GROUPS = {
  'LinkedIn': 'from:linkedin.com ("your application" OR "application was sent" OR "application was viewed" OR "tu solicitud" OR "su solicitud" OR "sua candidatura" OR "tua candidatura")',

  'Job websites': 'from:(greenhouse.io OR greenhouse-mail.io OR lever.co OR myworkday.com OR smartrecruiters.com OR teamtailor.com OR teamtailor-mail.com OR personio.de OR personio.com OR workable.com OR workablemail.com OR recruitee.com OR bamboohr.com OR ashbyhq.com OR jobvite.com OR icims.com OR successfactors.com OR successfactors.eu OR taleo.net OR breezy.hr OR join.com OR cvwarehouse.com OR bizneo.com OR occupop-mail.com OR indeedapply@indeed.com OR amazon.jobs OR infojobs.net OR net-empregos.com OR itjobs.pt OR landing.jobs OR randstad.pt OR randstadservices.com)',

  // "interview" in the subject is a strong signal even without other job words (e.g. forwarded invites).
  'Application subjects': 'subject:(application OR applying OR candidatura OR solicitud OR postulación OR vaga OR vacancy OR interview OR entrevista)',

  'Confirmations': '"thank you for applying" OR "thanks for applying" OR "application received" OR "received your application" OR "thank you for your application" OR "your recent application" OR "thank you for submitting your application" OR "currently reviewing" OR "under review" OR "candidatura recebida" OR "recebemos a sua candidatura" OR "recebemos a tua candidatura" OR "obrigado pela sua candidatura" OR "obrigado pela tua candidatura" OR "por se candidatar" OR "confirmação de candidatura" OR "hemos recibido tu candidatura" OR "hemos recibido tu solicitud" OR "gracias por tu candidatura" OR "gracias por tu solicitud" OR "gracias por postularte" OR "gracias por aplicar" OR "gracias por tu interés"',

  'Rejections': `(unfortunately OR regret OR "not moving forward" OR "other candidates" OR "decided not to" OR "not be pursuing" OR infelizmente OR "lamentamos informar" OR "outros candidatos" OR lamentablemente OR "lamentamos informarte" OR "otros candidatos" OR "en esta ocasión") ${JOB_CONTEXT}`,

  'Interviews & meetings': `(interview OR entrevista OR "next steps" OR "próximos passos" OR "próximos pasos" OR disponibilidade OR disponibilidad OR "your availability" OR filename:ics OR "meet.google.com" OR "teams.microsoft.com" OR "zoom.us/j" OR calendly) ${JOB_CONTEXT}`,

  'Assessments': `(assessment OR "technical test" OR "coding challenge" OR "take-home" OR codility OR hackerrank OR testgorilla OR "teste técnico" OR "desafio técnico" OR "avaliação técnica" OR "prueba técnica" OR "reto técnico" OR "ejercicio técnico" OR "evaluación técnica") ${JOB_CONTEXT}`,

  'Offers': `("job offer" OR "offer letter" OR "pleased to offer" OR "proposta de trabalho" OR "carta de oferta" OR "proposta salarial" OR "oferta de empleo" OR "oferta de trabajo" OR "carta oferta" OR "propuesta económica") ${JOB_CONTEXT}`,

  // Applications you emailed yourself (CV sent directly to a company).
  // Searches the body too: subjects like "Programador de PLC" name only the role.
  'Sent by me': 'in:sent (subject:(CV OR currículo OR curriculum OR currículum) OR candidatura OR currículo OR curriculum OR currículum OR "job application" OR vaga OR vacancy OR solicitud OR "envio o meu CV" OR "envío mi CV" OR "my CV" OR "my resume")',
};

// Job alerts, newsletters and promotions are not applications.
const EXCLUDE = '-category:promotions -from:jobalerts-noreply@linkedin.com -from:jobs-listings@linkedin.com -from:messages-noreply@linkedin.com -subject:"job alert" -subject:"alerta de empleo" -subject:"alerta de emprego" -subject:"novas ofertas de emprego"';

// Text is lower-cased and accents are removed before matching,
// so write these patterns WITHOUT accents (reunion, not reunión).

// Login codes, alerts, account emails. Checked against the SUBJECT, because real
// application emails often mention "job alert" or "create an account" in their footer.
const NOISE = new RegExp([
  'one-time-?passcode', 'one time passcode', 'solo uso', 'verification code', 'security code', 'login code',
  'codigo de (acesso|acceso|verificacao|verificacion|seguranca|seguridad|inicio de sesion|inicio de sessao|infojobs)',
  'verifique a sua identidade', 'verificar tu identidad', 'verify your (email|identity|account)',
  'reset your password', 'recupera tu contrasena', '(redefinir|recuperar) (a )?(sua |tua )?(palavra-passe|senha|password)',
  'daily digest', 'job alert', 'alerta de (empleo|emprego)', 'novas ofertas de emprego', 'new jobs for you',
  'jobs you may be interested', 'recommended jobs', 'empleos recomendados', 'vagas recomendadas',
  'profile is asleep', 'profile needs a new cv', 'perfil .{0,40}criado com sucesso', 'confirmacao de registo',
  'account (has been )?created', 'early bird', 'webinar', 'link de verificacao', 'verification link',
  'oauth', 'third-party application', 'personal access token',
  // bookings, purchases and partner promotions sent through job sites
  'reserva', 'booking confirm', 'your booking', 'tu actividad', 'confirmacao de compra', 'order confirm', 'tu pedido',
  'ipromocoes',
  '^\\W*(welcome to|bem-vind[oa]|bienvenid[oa]|damos-te as boas vindas|damos as boas vindas)',
].join('|'));

// Checked in order: the first match wins.
const STATUS_RULES = [
  ['Rejected', new RegExp([
    // EN
    'unfortunately', 'regret to inform', 'we regret', 'not moving forward', 'not to move forward',
    'move forward with (other|candidates|another)', 'proceed with other', 'pursue other candidates',
    'other candidates', 'decided not to', 'not be pursuing', 'not to pursue', 'will not be progressing',
    'not be proceeding', 'position has been filled', 'no longer considering', 'not been selected', 'not selected',
    'unsuccessful', 'not been successful',
    // PT
    'infelizmente', 'lamentamos informar', 'nao (iras |ira |vais |vai |iremos )?avancar',
    'decidimos avancar com outr', 'outros candidatos', 'nao fo(i|ste) selecionad',
    // ES
    'lamentablemente', 'lamentamos informarte', 'lamentamos comunicarte', 'no continuar', 'no avanzar',
    'no seguiremos', 'seguir adelante con otr', 'otros candidatos', 'otras candidaturas',
    'no ha(s)? sido seleccionad', 'en esta ocasion no',
  ].join('|'))],

  ['Offer', new RegExp([
    'offer letter', 'pleased to offer', 'happy to offer', 'job offer',
    'proposta de trabalho', 'carta de oferta', 'proposta salarial',
    'oferta de empleo', 'oferta de trabajo', 'carta oferta', 'propuesta economica',
  ].join('|'))],

  ['Interview / meeting', new RegExp([
    // meeting links and calendar invites ("Invitation: ...", "Convite: ...")
    'meet\\.google\\.com', 'teams\\.microsoft\\.com', 'zoom\\.us\\/j', 'calendly\\.com', 'invite\\.ics',
    'invitation:', 'invitacion:', 'convite:', 'invitacion de un remitente', 'videollamada', 'videochamada',
    // EN
    'invite you (to|for) (an |a )?(interview|call|chat|conversation|meeting)',
    'invitation to (a |an )?(job )?interview', 'interview with',
    'would like to (invite|schedule|set up|arrange|meet)',
    'like to (have a|set up a|schedule a) (call|chat|conversation|interview)',
    'schedule (an|a|your) (interview|call)', 'book (a|your) (time|slot|interview)',
    'your availability', 'available for (a|an) (call|interview|chat)',
    'interview (invitation|invite)', 'screening call', 'first interview', 'technical interview',
    // PT
    'gostariamos de (agendar|marcar|convidar|te convidar)', 'convidar-te', 'convida-lo',
    '(agendar|marcar) uma (entrevista|chamada|conversa|reuniao)',
    '(a tua|a sua|sua) disponibilidade', 'entrevista (tecnica|inicial)', 'primeira entrevista',
    // ES
    'nos gustaria (agendar|invitarte|programar|conocerte|tener)', 'invitarte a',
    '(agendar|programar|coordinar) una (entrevista|llamada|reunion|videollamada)',
    'tu disponibilidad', 'su disponibilidad', 'entrevista tecnica', 'primera entrevista',
  ].join('|'))],

  ['Assessment', new RegExp([
    'coding challenge', 'technical test', 'technical assessment', 'online assessment', 'take-home',
    'home assignment', 'codility', 'hackerrank', 'testgorilla', 'coderbyte',
    'desafio tecnico', 'teste tecnico', 'exercicio tecnico', 'avaliacao tecnica',
    'prueba tecnica', 'reto tecnico', 'ejercicio tecnico', 'evaluacion tecnica',
  ].join('|'))],

  // Confirmations / under review. Checked AFTER interview, so
  // "you'll receive the next steps" stays here and is not tagged as an interview.
  ['Applied (in review)', new RegExp([
    // EN
    'received your application', 'application has been received', 'application received',
    'application .{0,120}has been (received|submitted)',
    'thank you for applying', 'thanks for applying', 'thank you for (your|submitting your) (recent )?application',
    'thanks for your interest', 'thank you for your interest', 'application was sent',
    'confirm (the )?receipt of your application', 'confirm that we have received', 'we have received your','will (begin|start) (carefully )?review',
    'we (carefully )?review every application', 'currently reviewing', 'under review',
    'if your (experience|profile|background|skills) (is a good match|matches|match)',
    // PT
    'candidatura recebida', 'recebemos a (sua|tua) candidatura', 'obrigad[oa] pel[ao] (sua|tua) candidatura',
    'obrigad[oa] pelo (seu|teu) interesse', 'por se candidatar', 'por te candidatares',
    'confirmacao de candidatura', 'candidatura foi enviada', 'estamos a analisar', 'iremos analisar',
    'se o (seu|teu) perfil',
    // ES
    'hemos recibido tu (candidatura|solicitud)', 'gracias por tu (candidatura|solicitud|interes)',
    'gracias por sus? interes', 'gracias por postularte', 'gracias por aplicar', 'solicitud se ha enviado',
    'solicitud se envio', 'se ha enviado tu solicitud', 'estamos revisando', 'revisaremos tu',
    'si tu perfil (encaja|se ajusta)', 'estado de su solicitud', 'te has inscrito',
  ].join('|'))],

  ['Viewed', new RegExp([
    'viewed your application', 'application was viewed',
    'candidatura foi vista', 'visualizou a (sua|tua) candidatura',
    'solicitud fue vista', 'ha visto tu solicitud', 'vio tu solicitud', 'visualizo tu solicitud',
  ].join('|'))],
];

// Senders that send for many companies: the company is never their own domain.
const ATS_DOMAINS = /(greenhouse|lever\.co|myworkday|smartrecruiters|workable|ashbyhq|icims|successfactors|taleo|teamtailor|personio|recruitee|bamboohr|jobvite|breezy|join\.com|cvwarehouse|bizneo|occupop|indeed|infojobs|net-empregos|linkedin|landing\.jobs)/;
const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|proton|protonmail|sapo)\./;
const GENERIC_SUBDOMAIN = /^(ats|hire|jobs|mail|email|em|candidates|notifications?|recruiting|recruitment|eu|us|no-?reply|careers|talent|comms|accounts|push|link|info|mailing|news)$/;
const GENERIC_SENDER = /^(no-?reply|do-?not-?reply|notifications?|hr system|myhr|mail ?system|hr|recruiting|recruitment|careers?|jobs?|talent|hiring|candidate-se via indeed|workable|mensajes .*|workday.*)$/i;

// Company name: up to 5 capitalised words ("Volkswagen Group Digital Solutions").
// A "." only continues a name when no space follows ("Landing.Jobs", not "Engineering. Ficamos").
const NAME_CHAR = "(?:[\\p{L}\\d&'-]|\\.(?=\\S))";
const NAME = `(\\p{Lu}${NAME_CHAR}*(?: (?:\\p{Lu}|&|de |of )${NAME_CHAR}*){0,4})`;
// Keywords match in any case ("Interview with X"); the name itself must be capitalised,
// so these can't use the i flag.
const COMPANY_PATTERNS = [
  `(?:[Aa]pplying|[Aa]pplied|[Aa]pplication|[Aa]pply) (?:to|at|with) ${NAME}`,
  `(?:[Ii]nterest|[Ii]nteresse|[Ii]nterés|[Ii]nteres) (?:in|em|en|na|no) (?:joining |working (?:at|with) )?${NAME}`,
  `(?:[Ii]nterview|[Ee]ntrevista) (?:with|com|con) ${NAME}`,
  `(?:emprego|empleo|trabalho|trabajo) (?:na|no|da|do|en) ${NAME}`,
  `\\b[Jj]oin(?:ing)? ${NAME}`,
].map(p => new RegExp(p, 'u'));
const COMPANY_SUBJECT_PATTERNS = [`\\bat ${NAME}`, `^${NAME} [-–|]`].map(p => new RegExp(p, 'u'));
// "interest in Automation Engineer (ID: ...)" names a role, not a company.
const NOT_A_COMPANY = /^(our|the|this|your|a|an|us|you|we)$|\b(engineer|developer|engenheiro|ingeniero|tecnico|técnico|programador|manager|specialist|analyst|designer|architect)\b/i;
const COMPANY_SUFFIX = /\s+(recruitment|recruiting|talent acquisition|talent team|careers|hr)$/i;

const ROLE_PATTERNS = [
  /via Indeed: (.+)$/i,
  /(?:received|recebida|recibida): (.+?) at /i,
  /(?:role|position|vacancy) (?:of|for|as) ([^.,!\n]{3,80})/i,
  /(?:for|to|in) (?:the|our) (?!interest)([^.,!\n]{3,80}?) (?:position|role|opening|vacancy)/i,
  /(?:interest in|interés en|interes en|interesse em|interesse na|interesse no) ([^.,!\n(]{3,80}?) \((?:ID|Req|Ref)/i,
  /application (?:for|as) (?:the |our )?(?:vacancy |position |role )?([^.,!\n]{3,80}?)(?: at | position| role| opening|[.,!\n]|$)/i,
  /(?:applying|applied) for (?:the )?(?:position |role |vacancy )?(?:of )?([^.,!\n]{3,80}?)(?: role| position| at |[.,!\n]|$)/i,
  /candidatura (?:para a vaga de |a vaga de |para |a |à |ao )([^.,!\n]{3,80})/i,
  /(?:vaga|função|funcao) (?:para a função |para a funcao |de |para )?([^.,!\n]{3,80})/i,
  /(?:vacante|posición|oferta|puesto) de (?!emprego|empleo|trabajo|trabalho)([^.,!\n]{3,80})/i,
  /as our ([^.,!\n]{3,60}?)(?: - |[.,!\n]|$)/i,
];

const EMAIL_COLUMNS = [
  ['Date', 'date'], ['Status', 'status'], ['Company (guess)', 'company'], ['Role (guess)', 'role'],
  ['From', 'from'], ['Subject', 'subject'], ['Snippet', 'snippet'], ['Link', 'link'],
  ['Message ID', 'messageId'], ['Thread ID', 'threadId'], ['Matched by', 'group'],
];

// Run from the editor: searches Gmail and writes the Emails, Summary and Run info tabs.
function exportJobEmails() {
  const result = collectJobEmails();
  const ss = getSpreadsheet();
  writeResults(ss, result);
  Logger.log(`Done: ${result.emailRows.length} emails in ${result.threads} conversations. ${ss.getUrl()}`);
  return result;
}

// Entry point for the tracker app's "Update from Gmail" button (Apps Script API).
// Same as exportJobEmails, and also returns the Emails tab so the app needs no CSV.
function runExport() {
  const result = exportJobEmails();
  const tz = Session.getScriptTimeZone();
  return {
    headers: EMAIL_COLUMNS.map(([header]) => header),
    rows: result.emailRows.map(row => EMAIL_COLUMNS.map(([, key]) =>
      key === 'date' ? Utilities.formatDate(row.date, tz, 'yyyy-MM-dd HH:mm') : String(row[key] === undefined ? '' : row[key]))),
    runInfo: result.runInfo,
    spreadsheetUrl: getSpreadsheet().getUrl(),
  };
}

function collectJobEmails() {
  const started = Date.now();
  const me = myAddresses();
  const since = Utilities.parseDate(START_DATE, Session.getScriptTimeZone(), 'yyyy-MM-dd').getTime();
  const found = {}; // thread id -> search group that found it
  const runInfo = [];

  for (const [group, terms] of Object.entries(SEARCH_GROUPS)) {
    const query = `after:${Math.floor(since / 1000)} (${terms}) ${EXCLUDE}`;
    try {
      const ids = searchAll(query);
      let added = 0;
      ids.forEach(id => {
        if (found[id]) return;
        found[id] = group;
        added++;
      });
      const warning = ids.length >= MAX_THREADS_PER_GROUP
        ? 'HIT LIMIT: older emails were skipped. Raise MAX_THREADS_PER_GROUP or narrow this search.' : '';
      runInfo.push([group, ids.length, added, warning, query]);
      Logger.log(`${group}: ${ids.length} threads (${added} new)`);
    } catch (e) {
      runInfo.push([group, 'ERROR', '', e.message, query]);
    }
  }

  const emailRows = [];
  const summaryRows = [];
  const threadIds = Object.keys(found);
  let read = 0;
  for (const threadId of threadIds) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      runInfo.push(['Time limit', read, '', `HIT LIMIT: time ran out, ${threadIds.length - read} conversations were skipped. Use a later START_DATE or narrow the searches.`, '']);
      break;
    }
    const group = found[threadId];
    const thread = gmail(10, () => Gmail.Users.Threads.get('me', threadId, { format: 'full' }));
    read++;
    const rows = (thread.messages || [])
      // A conversation that started earlier keeps only its emails from START_DATE on.
      .filter(msg => !(msg.labelIds || []).includes('DRAFT') && Number(msg.internalDate) >= since)
      .map(msg => emailRow(msg, threadId, group, me));
    if (!rows.length) continue;
    emailRows.push(...rows);
    summaryRows.push(summaryRow(rows, threadId));
  }
  runInfo.push(['TOTAL', Object.keys(found).length, '', `${emailRows.length} emails`, '']);
  return { emailRows, summaryRows, runInfo, threads: Object.keys(found).length };
}

function writeResults(ss, { emailRows, summaryRows, runInfo }) {
  writeSheet(ss, 'Run info', [
    ['Search group', 'group'], ['Threads found', 'found'], ['New threads', 'added'],
    ['Warning', 'warning'], ['Query used', 'query'],
  ], runInfo.map(([group, found, added, warning, query]) => ({ group, found, added, warning, query })));

  writeSheet(ss, 'Emails', EMAIL_COLUMNS, emailRows);

  writeSheet(ss, 'Summary', [
    ['Last update', 'date'], ['Latest status', 'status'], ['Company (guess)', 'company'], ['Role (guess)', 'role'],
    ['From', 'from'], ['Subject', 'subject'], ['Snippet', 'snippet'], ['Link', 'link'],
    ['Thread ID', 'threadId'], ['Messages', 'messages'], ['Matched by', 'group'],
  ], summaryRows);
}

// Runs started from the tracker app have no "active" spreadsheet, so the sheet's ID is
// remembered (in this script's private properties) the first time you run it from the sheet.
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('Job application emails');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

// Gmail allows each user 15,000 quota units per minute (threads.list and threads.get cost 10 each).
// Calls are spaced to stay under that, and retried after a pause if Google still says "quota".
const gmailUsage = []; // [time, units] of calls in the last minute

function gmail(units, call) {
  paceGmail(units);
  for (let attempt = 0; ; attempt++) {
    try {
      return call();
    } catch (e) {
      if (attempt >= RETRY_WAITS_MS.length || !/quota|rate ?limit|too many/i.test(e.message)) throw e;
      Logger.log(`Gmail limit reached, waiting ${RETRY_WAITS_MS[attempt] / 1000}s`);
      Utilities.sleep(RETRY_WAITS_MS[attempt]);
    }
  }
}

function paceGmail(units) {
  for (;;) {
    const now = Date.now();
    while (gmailUsage.length && now - gmailUsage[0][0] >= 60000) gmailUsage.shift();
    const used = gmailUsage.reduce((sum, [, u]) => sum + u, 0);
    if (used + units <= GMAIL_UNITS_PER_MINUTE) break;
    Utilities.sleep(60000 - (now - gmailUsage[0][0]) + 200);
  }
  gmailUsage.push([Date.now(), units]);
}

// Thread IDs matching a Gmail search, page by page.
function searchAll(query) {
  const ids = [];
  let pageToken;
  do {
    const page = gmail(10, () => Gmail.Users.Threads.list('me', {
      q: query,
      maxResults: Math.min(PAGE_SIZE, MAX_THREADS_PER_GROUP - ids.length),
      pageToken,
    }));
    (page.threads || []).forEach(t => ids.push(t.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < MAX_THREADS_PER_GROUP);
  return ids;
}

// msg is a Gmail API message resource (format: full).
function emailRow(msg, threadId, group, me) {
  const from = header(msg, 'From');
  const subject = header(msg, 'Subject');
  const body = cleanBody(bodyOf(msg.payload));
  const fromMe = (msg.labelIds || []).includes('SENT') || me.includes(emailOf(from));

  let status;
  if (fromMe) status = sentOnlyToMe(msg, me) ? 'Noise' : 'Sent by me';
  else status = classify(subject, body);

  // For emails you sent, the company is the recipient, not you.
  const party = fromMe ? header(msg, 'To').split(',')[0] : from;

  return {
    date: new Date(Number(msg.internalDate)),
    status,
    company: companyFrom(party, subject, body, fromMe),
    role: roleFrom(subject, body),
    from,
    subject,
    snippet: snippetOf(body),
    link: LINK + msg.id,
    messageId: msg.id,
    threadId,
    group,
  };
}

function header(msg, name) {
  const found = (msg.payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : '';
}

// The text/plain part, or the text/html part without tags (like GmailApp's getPlainBody).
function bodyOf(payload) {
  const plain = findPart(payload, 'text/plain');
  if (plain) return decodePart(plain);
  const html = findPart(payload, 'text/html');
  return html ? htmlToText(decodePart(html)) : '';
}

// One unreadable body must not stop the whole export: it becomes an empty body instead.
function decodePart(part) {
  const charset = (/charset="?([\w-]+)/i.exec(header({ payload: part }, 'Content-Type')) || [])[1] || 'UTF-8';
  try {
    return decodeBodyData(part.body.data, charset);
  } catch (e) {
    try {
      return decodeBodyData(part.body.data, 'UTF-8');
    } catch (e2) {
      console.warn('Could not decode an email body: ' + e2);
      return '';
    }
  }
}

function findPart(part, mimeType) {
  if (part.mimeType === mimeType && part.body && part.body.data) return part;
  for (const child of part.parts || []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

// The Gmail advanced service returns body data either as bytes or as base64 text
// (web-safe or standard, with or without padding).
function decodeBodyData(data, charset) {
  if (Array.isArray(data)) return Utilities.newBlob(data).getDataAsString(charset);
  const text = String(data).replace(/\s+/g, '').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString(charset);
}

function htmlToText(html) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// The conversation's status is its most recent meaningful email:
// a reply from the company beats your own emails, which beat noise / unknown.
function summaryRow(rows, threadId) {
  const newest = rows.slice().sort((a, b) => b.date - a.date);
  const fromCompany = newest.find(r => !['Other (check)', 'Noise', 'Sent by me'].includes(r.status));
  const pick = fromCompany || newest.find(r => r.status === 'Sent by me') || newest[0];
  return {
    ...pick,
    date: newest[0].date,
    company: pick.company || (newest.find(r => r.company) || {}).company || '',
    role: pick.role || (newest.find(r => r.role) || {}).role || '',
    link: LINK + threadId,
    messages: rows.length,
  };
}

// Lower-case and strip accents and invisible characters: "Reunião" -> "reuniao".
function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/g, '');
}

function classify(subject, body) {
  if (NOISE.test(normalize(subject).trim())) return 'Noise';
  const text = normalize(subject + ' ' + body.slice(0, CLASSIFY_CHARS));
  for (const [status, regex] of STATUS_RULES) {
    if (regex.test(text)) return status;
  }
  // Nothing job-like matched: the first lines may still show it's a code or alert.
  if (NOISE.test(normalize(body.slice(0, NOISE_CHARS)))) return 'Noise';
  return 'Other (check)';
}

// Drop quoted replies ("> ..." lines, "On ... wrote:"), Outlook history and HTML leftovers.
function cleanBody(body) {
  let text = body.replace(/\r/g, '');
  const outlook = text.search(/\n-{3,} ?Original Message ?-{3,}|\n_{10,}\s*\n(From|De):/i);
  if (outlook > 0) text = text.slice(0, outlook);
  const lines = text
    .split('\n')
    .filter(line => !/^\s*>/.test(line) && !/(wrote|escribió|escreveu|a écrit|schrieb):\s*$/.test(line));
  return unwrap(lines)
    .join('\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

// Plain-text emails are hard-wrapped at ~70-80 characters, which splits names
// ("Bee\nEngineering"). Rejoin a long line that doesn't end a sentence with the next one.
function unwrap(lines) {
  const out = [];
  lines.forEach(line => {
    const prev = out[out.length - 1];
    if (prev !== undefined && prev.length >= 60 && !/[.!?:;]\s*$/.test(prev) && line.trim()) {
      out[out.length - 1] = prev.trimEnd() + ' ' + line.trim();
    } else {
      out.push(line);
    }
  });
  return out;
}

// Readable preview: no image tags, tracking URLs or CSS.
function snippetOf(body) {
  return body
    .replace(/\[image:[^\]]*\]/g, ' ')
    .replace(/<https?:\/\/[^>\s]*>/g, ' ')
    .replace(/\(\s*https?:\/\/[^)\s]*\s*\)/g, ' ')
    .replace(/https?:\/\/\S{40,}/g, ' ')
    .replace(/[\w.#:\s,>-]*\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SNIPPET_CHARS);
}

// Company: from the subject/body wording first, then the sender, then the sender's domain.
function companyFrom(party, subject, body, fromMe) {
  subject = subject.replace(/[\u200b-\u200d\ufeff]/g, '');
  const head = body.slice(0, 600);
  for (const re of COMPANY_PATTERNS) {
    const m = subject.match(re) || head.match(re);
    if (m && !NOT_A_COMPANY.test(m[1])) return tidy(m[1]);
  }
  if (!fromMe) {
    for (const re of COMPANY_SUBJECT_PATTERNS) {
      const m = subject.match(re);
      if (m && !NOT_A_COMPANY.test(m[1])) return tidy(m[1]);
    }
  }

  const email = emailOf(party);
  const domain = email.split('@')[1] || '';
  if (ATS_DOMAINS.test(domain)) {
    // e.g. glanua.occupop-mail.com -> Glanua
    const sub = domain.split('.')[0];
    if (domain.split('.').length > 2 && !GENERIC_SUBDOMAIN.test(sub) && !ATS_DOMAINS.test(sub + '.')) return tidy(sub);
  }

  if (!fromMe) {
    const name = party.replace(/<[^>]*>/, '').replace(/"/g, '').trim()
      .replace(/^.* from /i, '')    // "Daniela Rumor from Devoteam Portugal"
      .replace(/^.* - /, '')        // "Tomer Vodovosoff - Finsolutia"
      .replace(/^(no-?reply|noreply)\s+/i, '')
      .replace(/\b(talent acquisition|talent team|recruitment|recruiting|careers|hr team|hiring team)\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (name && !name.includes('@') && !GENERIC_SENDER.test(name)) return tidy(name);
  }

  if (!domain || ATS_DOMAINS.test(domain) || FREE_MAIL.test(domain)) return '';
  const parts = domain.split('.');
  return tidy(parts[parts.length - 2].replace(/-/g, ' '));
}

function roleFrom(subject, body) {
  subject = subject.replace(/[\u200b-\u200d\ufeff]/g, '');
  const head = body.slice(0, 800);
  for (const re of ROLE_PATTERNS) {
    const m = subject.match(re) || head.match(re);
    if (m) return m[1].replace(/ at .*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  return '';
}

function tidy(name) {
  const clean = name.replace(/[\s.,|–-]+$/, '').replace(COMPANY_SUFFIX, '').trim();
  return clean === clean.toLowerCase() ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function emailOf(address) {
  const m = (address || '').match(/<([^>]+)>/);
  return (m ? m[1] : address || '').trim().toLowerCase();
}

// Your Gmail address plus any "send mail as" aliases.
function myAddresses() {
  const addresses = [Gmail.Users.getProfile('me').emailAddress];
  try {
    (Gmail.Users.Settings.SendAs.list('me').sendAs || []).forEach(s => addresses.push(s.sendAsEmail));
  } catch (e) {
    Logger.log('Could not read aliases: ' + e.message);
  }
  return addresses.filter(Boolean).map(a => a.toLowerCase());
}

// Notes you email to yourself are not applications.
function sentOnlyToMe(msg, me) {
  const recipients = ['To', 'Cc', 'Bcc'].map(name => header(msg, name)).join(',')
    .split(',').map(emailOf).filter(Boolean);
  return recipients.length > 0 && recipients.every(r => me.includes(r));
}

// columns: [[header, key], ...]; rows: objects.
function writeSheet(ss, name, columns, rows) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.clear();
  sheet.appendRow(columns.map(c => c[0]));
  sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
  if (rows.length) {
    const values = rows.map(r => columns.map(([, key]) => r[key] === undefined ? '' : r[key]));
    sheet.getRange(2, 1, values.length, columns.length).setValues(values);
    if (name !== 'Run info') {
      // ISO-like dates with time, so the CSV export is unambiguous.
      sheet.getRange(2, 1, values.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
      sheet.getRange(2, 1, values.length, columns.length).sort({ column: 1, ascending: false });
      sheet.getRange(1, 1, values.length + 1, columns.length).createFilter();
    }
  } else {
    sheet.getRange(2, 1).setValue('No emails matched. Check the Run info tab.');
  }
  sheet.setFrozenRows(1);
}

// Quick test: checks that the script can read your Gmail and find its spreadsheet.
function testGmailAccess() {
  const ids = searchAll('newer_than:30d subject:(application OR candidatura)').slice(0, 5);
  Logger.log('Application conversations in the last 30 days (first 5): ' + ids.length);
  ids.forEach(id => {
    const msg = Gmail.Users.Threads.get('me', id, { format: 'metadata', metadataHeaders: ['Subject'] }).messages[0];
    Logger.log(' - ' + header(msg, 'Subject'));
  });
  Logger.log('My addresses: ' + myAddresses().join(', '));
  Logger.log('Spreadsheet: ' + getSpreadsheet().getUrl());
}

// Test the rules on real emails that were misclassified before, without touching Gmail.
function testClassify() {
  const cases = [
    ['Rejected', 'Capgemini Group - Application Status Update', 'Dear Alex, Thank you for your application for the position of SCADA Systems Engineer After careful consideration, we regret to inform you that we will not be pursuing your application. However, we do invite you to register to our email job alert service'],
    ['Applied (in review)', 'Datahouse & Alex - Your application as Senior Software Engineer', 'We would like to thank you for the time and effort you invested in your application and confirm that we have received it.'],
    ['Rejected', 'Update on Your Application with Reachdesk', 'Thank you for applying for the Software Engineer role at Reachdesk. We received strong interest in this position and have decided to move forward with candidates whose experience more closely aligns'],
    ['Rejected', 'Randstad Portugal | estado da candidatura', 'Após análise das candidaturas recebidas, lamentamos informar que não irás avançar para a próxima fase'],
    ['Applied (in review)', 'Application received: Controls Project Engineer at Vanderlande | JR38080', 'Thank you for applying for the Controls Project Engineer role in Barcelona, Spain.'],
    ['Applied (in review)', 'Confirmação de Candidatura', 'Caro Sr. Silva, Muito obrigada(o) por se candidatar'],
    ['Applied (in review)', 'Your application is under review, Alex', "We're currently reviewing resumes and will notify you once we have an update."],
    ['Applied (in review)', 'Thank You for Applying to Reachdesk!', "We've received your application. If your experience is a good match for the role, you'll receive an email with the next steps."],
    ['Interview / meeting', 'Devoteam PT Invitation to Job Interview', 'Great news, your application for the position of React Developer has been successful'],
    ['Interview / meeting', 'Invitación de un remitente desconocido: Growin | Alex', 'Este evento aún no está en tu calendario. meet.google.com/abc-defg-hij'],
    ['Noise', 'Your one-time-passcode', 'Your one-time-passcode 567656 Best regards, Hiring Team at Devoteam'],
    ['Noise', 'Workday Inbox - Your Daily Digest', 'Daily Digest for Alex Silva Thursday, 8 October 2026 1 Notification(s)'],
    ['Noise', 'Verifique a sua identidade', 'Código de início de sessão único de ICIMS'],
    ['Noise', 'Alex, your profile is asleep 💤', 'Hey Alex'],
    ['Noise', 'O seu link de verificação', 'Recebemos a sua inscrição, falta apenas o último passo. Clique aqui para verificar seu email.'],
    ['Noise', '[GitHub] A third-party OAuth application has been added to your account', ''],
    ['Applied (in review)', 'Your job application for Automation Engineer at ECCO has been received', 'Your job application has been submitted on ecco.com with the following details'],
    ['Noise', 'Reserva GYGFWVZ3WBBF confirmada | Instrucciones para los tickets', 'Muchas gracias por tu pedido'],
    ['Noise', 'Queres aprender inglês? Aproveita já 15 dias grátis', '<https://campanhas.ipromocoes.com/partner/campaign/b26fcdb3>'],
    ['Interview / meeting', 'Fwd: Invitation: Interview with Lithosquare @ Thu Sep 17, 2026 2pm - 3pm (CEST)', '---------- Forwarded message ---------'],
  ];
  let failed = 0;
  cases.forEach(([expected, subject, body]) => {
    const got = classify(subject, body);
    if (got !== expected) failed++;
    Logger.log(`${got === expected ? 'PASS' : 'FAIL'}  ${got}${got === expected ? '' : ' (expected ' + expected + ')'}  <=  ${subject}`);
  });

  const companies = [
    ['Arcesium LLC', 'no-reply@us.greenhouse-mail.io', 'Thank you for applying to Arcesium LLC', ''],
    ['Vanderlande', 'noreply vanderlande <vanderlande@myworkday.com>', 'Application received: Controls Project Engineer at Vanderlande | JR38080', ''],
    ['Hovione', '"Ofelia Babos (Korn Ferry)" <OBABOS@hovione.com>', 'Thank You for your application at Hovione', ''],
    ['Devoteam Portugal', 'Daniela Rumor from Devoteam Portugal <notification@smartrecruiters.com>', 'Devoteam PT Invitation to Job Interview', ''],
    ['Glanua', '"Stephen O\'Brien" <stephen.obrien@glanua.occupop-mail.com>', 'Thank you for your recent application', ''],
    ['Mindera', 'Workable <noreply@candidates.workablemail.com>', 'Thanks for applying to Mindera', ''],
    ['Amazon', 'noreply@mail.amazon.jobs', 'Siga el estado de su solicitud', 'Hola, Alex, Gracias por tu interés en Automation Engineer (ID: 10531563).'],
    ['Bee Engineering', 'mailsystem@cvwarehouse.com', 'Confirmação de Candidatura', 'Muito obrigada(o) por se candidatar a esta oferta de emprego na Bee Engineering. Ficamos muito felizes'],
    ['Bee Engineering', 'mailsystem@cvwarehouse.com', 'Confirmação de Candidatura', cleanBody('Caro Sr. Silva, Muito obrigada(o) por se candidatar a esta oferta de emprego na Bee\nEngineering. Ficamos muito felizes')],
    ['Lithosquare', 'A Friend <friend@example.com>', 'Fwd: Invitation: Interview with Lithosquare @ Thu Sep 17, 2026 2pm - 3pm (CEST)', ''],
    ['Hovione', 'Hovione Talent Acquisition <hovione+autoreply@talent.hovione.com>', 'Hovione Recruitment - Thank you for your job application', ''],
    ['', 'notifications@ats.bizneo.com', 'A sua candidatura a Automation Engineer - São João de Ver', ''],
  ];
  const roles = [
    ['Junior Fullstack Developer', 'Explore new roads with VWGDS!', "We've received your application for our Junior Fullstack Developer opening and we're delighted"],
    ['Junior Fullstack Developer', 'Explore new roads with VWGDS!', cleanBody("Hi Alex! We've received your application for our Junior Fullstack\nDeveloper opening and we're delighted")],
    ['SCADA Systems Engineer', 'Capgemini Group - Application Status Update', cleanBody('Dear Alex,\n\nThank you for your application for the position of SCADA Systems Engineer\n\nAfter careful consideration')],
    ['Software Development | React Developer', 'Devoteam Portugal - Thank you for applying for the position \u200bSoftware Development | React Developer', ''],
    ['Automation Engineer', 'Siga el estado de su solicitud', 'Gracias por tu interés en Automation Engineer (ID: 10531563).'],
    ['Controls Project Engineer', 'Application received: Controls Project Engineer at Vanderlande | JR38080', ''],
    ['Digitalization Specialist (296459)', 'x', 'Thank you for your interest in our Digitalization Specialist (296459) position.'],
  ];
  roles.forEach(([expected, subject, body]) => {
    const got = roleFrom(subject, body);
    if (got !== expected) failed++;
    Logger.log(`${got === expected ? 'PASS' : 'FAIL'}  role "${got}"${got === expected ? '' : ' (expected "' + expected + '")'}  <=  ${subject}`);
  });
  companies.forEach(([expected, from, subject, body]) => {
    const got = companyFrom(from, subject, body, false);
    if (got !== expected) failed++;
    Logger.log(`${got === expected ? 'PASS' : 'FAIL'}  company "${got}"${got === expected ? '' : ' (expected "' + expected + '")'}  <=  ${subject}`);
  });
  Logger.log(failed ? `${failed} FAILED` : 'All passed');
}
