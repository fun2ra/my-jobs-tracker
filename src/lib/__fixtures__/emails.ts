import Papa from 'papaparse';

/**
 * Made-up export rows shaped like real ones (same senders, subjects and quirks),
 * without personal data. Columns match the Emails tab of apps-script/exportJobEmails.gs.
 */
const ROWS: [string, string, string, string, string, string, string, string][] = [
  // [Date, Status, Company (guess), Role (guess), From, Subject, Snippet, Message ID]
  ['2026-08-14 13:01', 'Rejected', 'Capgemini Group', 'React Senior Developer', 'HR System <HRsystem@capgemini.com>', 'Capgemini Group - Application Status Update', 'Thank you for your application for the position of React Senior Developer. We regret to inform you, that we will not be pursuing your application.', 'm01'],
  ['2026-09-14 14:22', 'Other (check)', 'GetYourGuide', '', 'GetYourGuide <do-not-reply@notification.getyourguide.com>', 'Reserva confirmada | Instrucciones para los tickets', 'Muchas gracias por tu pedido', 'm02'],
  ['2026-09-17 10:32', 'Interview / meeting', 'Lithosquare', '', 'A Friend <friend@example.com>', 'Fwd: Invitation: Interview with Lithosquare @ Thu Sep 17, 2026 2pm - 3pm (CEST)', '---------- Forwarded message ---------', 'm03'],
  ['2026-10-01 13:10', 'Applied (in review)', 'Arcesium LLC', '', 'no-reply@us.greenhouse-mail.io', 'Thank you for applying to Arcesium LLC', 'Thanks for applying to Arcesium LLC. Your application has been received.', 'm04'],
  ['2026-10-01 13:15', 'Applied (in review)', 'Arcesium LLC', '', 'no-reply@us.greenhouse-mail.io', 'Thank you for applying to Arcesium LLC', 'Thanks for applying to Arcesium LLC. Your application has been received.', 'm05'],
  ['2026-10-02 10:56', 'Applied (in review)', 'Arcesium LLC', '', 'no-reply@us.greenhouse-mail.io', 'Thank you for applying to Arcesium LLC', 'Thanks for applying to Arcesium LLC. Your application has been received.', 'm06'],
  ['2026-10-02 14:40', 'Applied (in review)', 'Devoteam Portugal', '\u200bSoftware Development | React Developer', 'Devoteam Portugal <notification@recruitment.devoteam.com>', 'Devoteam Portugal - Thank you for applying for the position Software Development | React Developer', 'Thank you for submitting your application.', 'm07'],
  ['2026-10-02 15:06', 'Applied (in review)', 'Siemens Energy', 'Digitalization Specialist (296459)', 'Siemens Energy Talent Acquisition <talent-acquisition.hr@siemens-energy.com>', 'Thank you for applying to Siemens Energy', "We've received your application for our Digitalization Specialist (296459) position.", 'm08'],
  ['2026-10-05 15:43', 'Applied (in review)', 'Siemens Energy', 'I&C Commissioning Engineer(f/m/d) (295002)', 'Siemens Energy Talent Acquisition <talent-acquisition.hr@siemens-energy.com>', 'Thank you for applying to Siemens Energy', "We've received your application for our I&C Commissioning Engineer(f/m/d) (295002) position.", 'm09'],
  ['2026-10-05 18:06', 'Noise', 'Randstad', '', 'Randstad <no-reply@randstadservices.com>', 'O seu link de verificação', 'Clique aqui para verificar seu email.', 'm10'],
  ['2026-10-05 18:07', 'Applied (in review)', 'Randstadservices', '', 'no-reply@randstadservices.com', 'confirmação de candidatura, Engenheiro de Sistemas de Controlo (M/F/X)', 'confirmação de candidatura', 'm11'],
  ['2026-10-06 13:17', 'Sent by me', 'Aubay', 'Systems Engineer (SCADA)', 'Me <me@example.com>', 'Application – Systems Engineer (SCADA), Lisbon', 'Dear Hiring Team, please find my CV attached.', 'm12'],
  ['2026-10-06 14:44', 'Applied (in review)', '', '', 'Mensajes InfoJobs.net <pushinfojobs@comms.infojobs.net>', 'Te has inscrito a una oferta', '', 'm13'],
  ['2026-10-06 14:50', 'Applied (in review)', 'Capgemini Group', 'SCADA Systems Engineer', 'HR System <HRsystem@capgemini.com>', 'Capgemini Group – New Job Application Received', 'Thank you for your interest in the position of SCADA Systems Engineer.', 'm14'],
  ['2026-10-06 16:42', 'Interview / meeting', 'Devoteam Portugal', 'Software Development | React Developer', 'Recruiter from Devoteam Portugal <notification@smartrecruiters.com>', 'Devoteam PT Invitation to Job Interview', 'Great news, your application for the position of Software Development | React Developer has been successful.', 'm15'],
  ['2026-10-06 17:25', 'Noise', '', '', 'notifications@smartrecruiters.com', 'Your one-time-passcode', 'Your one-time-passcode 000000', 'm16'],
  ['2026-10-07 09:50', 'Applied (in review)', 'ECCO', 'Automation Engineer', 'ECCO - Job application <no-reply@ecco.com>', 'Your job application for Automation Engineer at ECCO has been received', 'Your job application has been submitted on ecco.com', 'm17'],
  ['2026-10-07 09:57', 'Rejected', 'Randstad Portugal', 'Engenheiro de Sistemas de Controlo (M/F/X)', 'Randstad <no-reply@randstad.pt>', 'Randstad Portugal | estado da candidatura', 'Agradecemos o teu interesse na vaga para a função Engenheiro de Sistemas de Controlo (M/F/X) (referência: 178646). Lamentamos informar que não irás avançar.', 'm18'],
  ['2026-10-08 10:14', 'Applied (in review)', '', 'Automation Engineer', 'Candidate-se via Indeed <indeedapply@indeed.com>', 'Candidatura via Indeed: Automation Engineer', 'A sua candidatura foi enviada. Boa sorte!', 'm19'],
  ['2026-10-08 10:23', 'Applied (in review)', '', 'Automation Engineer - São João de Ver', 'Candidate-se via Indeed <indeedapply@indeed.com>', 'Candidatura via Indeed: Automation Engineer - São João de Ver', 'A sua candidatura foi enviada. Boa sorte!', 'm20'],
  ['2026-10-08 10:29', 'Applied (in review)', '', 'Automation Engineer - São João de Ver', 'notifications@ats.bizneo.com', 'A sua candidatura a Automation Engineer - São João de Ver', 'Obrigado pelo seu interesse na nossa oferta de emprego.', 'm21'],
  ['2026-10-08 10:37', 'Applied (in review)', '', 'Automation Engineer - São João de Ver', 'notifications@ats.bizneo.com', 'Complete a sua candidatura a Automation Engineer - São João de Ver', 'Obrigado por se candidatar. Para que possamos analisar, complete a sua candidatura.', 'm22'],
  ['2026-10-09 10:48', 'Applied (in review)', 'Amazon', '', 'noreply@mail.amazon.jobs', 'Siga el estado de su solicitud', 'Gracias por tu interés en Automation Engineer (ID: 10531563).', 'm23'],
  ['2026-10-09 10:56', 'Applied (in review)', 'Amazon', 'Automation Engineer', 'noreply@mail.amazon.jobs', 'Gracias por sus interés en Amazon!', 'Gracias por tu interés en Automation Engineer (ID: 10531563).', 'm24'],
  ['2026-10-09 11:39', 'Other (check)', 'Volkswagen Group Digital Solutions', '', '"Volkswagen Group Digital Solutions [Portugal]" <mail@hire.eu.lever.co>', 'GDPR VWDS', 'As part of our recruitment process, we would like to ask for your consent.', 'm25'],
  ['2026-10-09 11:39', 'Applied (in review)', 'Volkswagen Group Digital Solutions', 'Junior Fullstack Developer', '"Volkswagen Group Digital Solutions [Portugal]" <no-reply@hire.eu.lever.co>', 'Explore new roads with VWGDS!', "We've received your application for our Junior Fullstack Developer opening.", 'm26'],
  ['2026-10-09 13:08', 'Rejected', 'Siemens Energy', 'I&C Commissioning Engineer(f/m/d) (295002)', 'Siemens Energy Talent Acquisition <talent-acquisition.hr@siemens-energy.com>', 'An update on your Siemens Energy application', 'Thank you for applying for the role of I&C Commissioning Engineer(f/m/d) (295002). We decided to move forward with other candidates.', 'm27'],
  ['2026-10-09 14:31', 'Rejected', 'Capgemini Group', 'SCADA Systems Engineer After caref', 'HR System <HRsystem@capgemini.com>', 'Capgemini Group - Application Status Update', 'Thank you for your application for the position of SCADA Systems Engineer After careful consideration, we regret to inform you.', 'm28'],
  ['2026-10-09 15:08', 'Applied (in review)', 'Siemens Energy', 'Digitalization Specialist (296459)', 'Siemens Energy Talent Acquisition <talent-acquisition.hr@siemens-energy.com>', 'Your application is under review', "Thank you for your interest in our Digitalization Specialist (296459) position. We're currently reviewing resumes.", 'm29'],
];

export const HEADER = [
  'Date', 'Status', 'Company (guess)', 'Role (guess)', 'From', 'Subject', 'Snippet', 'Link', 'Message ID', 'Thread ID', 'Matched by',
];

/** The fixture as a CSV download of the Emails tab, with a blank row like Sheets sometimes leaves. */
export function fixtureCsv(): string {
  const rows = ROWS.map(([date, status, company, role, from, subject, snippet, id]) => [
    date, status, company, role, from, subject, snippet,
    `https://mail.google.com/mail/u/0/#all/${id}`, id, `t-${id}`, 'Job websites',
  ]);
  rows.splice(10, 0, HEADER.map(() => ''));
  return Papa.unparse({ fields: HEADER, data: rows });
}

export const FIXTURE_ROW_COUNT = ROWS.length;
