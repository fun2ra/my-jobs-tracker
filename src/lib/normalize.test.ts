import { describe, expect, it } from 'vitest';
import { companyKey, detectTrack, extractRefs, roleKey, rolesMatch } from './normalize';

describe('companyKey', () => {
  it.each([
    ['Capgemini Group', 'capgemini'],
    ['Randstad Portugal', 'randstad'],
    ['Randstadservices', 'randstad'],
    ['Devoteam Portugal', 'devoteam'],
    ['Volkswagen Group Digital Solutions [Portugal]', 'volkswagen digital solutions'],
    ['Arcesium LLC', 'arcesium'],
    ['Körber', 'korber'],
    ['', ''],
  ])('%s → %s', (name, key) => {
    expect(companyKey(name)).toBe(key);
  });
});

describe('roleKey', () => {
  it.each([
    ['I&C Commissioning Engineer(f/m/d) (295002)', 'i c commissioning engineer'],
    ['Digitalization Specialist (296459)', 'digitalization specialist'],
    ['Engenheiro de Sistemas de Controlo (M/F/X)', 'engenheiro de sistemas de controlo'],
    ['Automation Engineer (ID: 10531563)', 'automation engineer'],
    ['Técnico de Automação e Robótica m/f', 'tecnico de automacao e robotica'],
    ['Software Development | React Developer', 'software development react developer'],
    ['Systems Engineer (SCADA)', 'systems engineer scada'],
    ['Senior Software Engineer (TypeScript / React)', 'senior software engineer typescript react'],
  ])('%s → %s', (role, key) => {
    expect(roleKey(role)).toBe(key);
  });
});

describe('rolesMatch', () => {
  it('matches equal roles', () => {
    expect(rolesMatch('automation engineer', 'automation engineer', false)).toBe(true);
  });

  it('matches a role that ran on into the next sentence, only when allowed', () => {
    expect(rolesMatch('scada systems engineer after caref', 'scada systems engineer', true)).toBe(true);
    expect(rolesMatch('scada systems engineer after caref', 'scada systems engineer', false)).toBe(false);
  });

  it('does not match on a partial word or an empty role', () => {
    expect(rolesMatch('engineering manager', 'engineer', true)).toBe(false);
    expect(rolesMatch('', 'engineer', true)).toBe(false);
  });
});

describe('extractRefs', () => {
  it.each([
    ['Application received: Controls Project Engineer at Vanderlande | JR38080', ['JR38080']],
    ['Digitalization Specialist (296459) position', ['296459']],
    ['Automation Engineer (ID: 10531563)', ['10531563']],
    ['Engenheiro de Sistemas de Controlo (M/F/X) (referência: 178646)', ['178646']],
    ['Thank you for applying', []],
  ])('%s', (text, refs) => {
    expect(extractRefs(text)).toEqual(refs);
  });
});

describe('detectTrack', () => {
  it.each([
    ['Programador de PLC', 'automation'],
    ['SCADA Systems Engineer', 'automation'],
    ['Controls Project Engineer', 'automation'],
    ['I&C Commissioning Engineer(f/m/d) (295002)', 'automation'],
    ['Técnico de Automação e Robótica', 'automation'],
    ['Junior Software Engineer - Full Stack', 'software'],
    ['Frontend Software Engineer - React (m/f/d)', 'software'],
    ['Procura-se um Webdesign experiente', 'software'],
    ['Digitalization Specialist (296459)', 'other'],
  ])('%s → %s', (role, track) => {
    expect(detectTrack(role)).toBe(track);
  });
});
