/**
 * Fixture data for output generation tests.
 */

import type { OutputData, ClientRow, MatchedPart, MatchedJob } from '@/lib/output/types';

/**
 * Create a sample OutputData fixture from the mock data.
 */
export function createOutputDataFixture(): OutputData {
  return {
    generationDate: '2026-05-15T10:30:00.000Z',
    matchedJobs: [
      {
        jobNumber: 'З-2026-0147',
        jobDate: '2026-05-10',
        clientName: 'Коваленко О.В.',
        deviceType: 'Ноутбук',
        deviceModel: 'ASUS VivoBook 15 X515',
        faultDescription: 'Не вмикається, підозра на блок живлення',
        jobStatus: 'Виконано',
        originalCost: 1200,
        matchedParts: [
          {
            partId: 'ЗЧ-БЖ-001',
            partName: 'Блок живлення ASUS 19V 3.42A (120W)',
            category: 'Блоки живлення',
            price: 650,
            quantity: 1,
            isUncertain: false,
            isWarning: false,
          },
        ],
        flags: [],
        warnings: [],
        matchedTotal: 650,
      },
      {
        jobNumber: 'З-2026-0148',
        jobDate: '2026-05-11',
        clientName: 'Шевченко І.М.',
        deviceType: 'Принтер',
        deviceModel: 'HP LaserJet Pro M404dn',
        faultDescription: 'Друкує з смугами, потрібна заміна тонера',
        jobStatus: 'В процесі',
        originalCost: 850,
        matchedParts: [
          {
            partId: 'ЗЧ-ТН-021',
            partName: 'Тонер-картридж HP CF258A (58A) ~1000 ст.',
            category: 'Ткери та картриджі',
            price: 380,
            quantity: 1,
            isUncertain: true,
            isWarning: false,
            comment: 'Підозріла наявність — потрібно перевірити',
          },
        ],
        flags: ['невпевнено'],
        warnings: [],
        matchedTotal: 380,
      },
      {
        jobNumber: 'З-2026-0149',
        jobDate: '2026-05-11',
        clientName: 'Бондар Т.О.',
        deviceType: 'Монітор',
        deviceModel: 'Samsung Odyssey G5 S27BG55',
        faultDescription: 'Мерехтить екран, можлива проблема з матрицею',
        jobStatus: 'Діагностика',
        originalCost: 450,
        matchedParts: [
          {
            partId: 'ЗЧ-LED-018',
            partName: 'LED-стрічка Samsung 27" G5 (60cm)',
            category: 'Світлодіоди',
            price: 580,
            quantity: 1,
            isUncertain: false,
            isWarning: false,
          },
        ],
        flags: [],
        warnings: [],
        matchedTotal: 580,
      },
      {
        jobNumber: 'З-2026-0135',
        jobDate: '2026-05-06',
        clientName: 'Коваленко О.В.',
        deviceType: 'Монітор',
        deviceModel: 'LG 24MN450',
        faultDescription: 'Не вмикається, підозра на блок живлення монітора',
        jobStatus: 'Виконано',
        originalCost: 800,
        matchedParts: [
          {
            partId: 'ЗЧ-LED-019',
            partName: 'LED-стрічка LG 24" (45cm)',
            category: 'Світлодіоди',
            price: 460,
            quantity: 1,
            isUncertain: false,
            isWarning: false,
          },
          {
            partId: 'ЗЧ-БЖ-001',
            partName: 'Блок живлення ASUS 19V 3.42A (120W)',
            category: 'Блоки живлення',
            price: 650,
            quantity: 1,
            isUncertain: true,
            isWarning: true,
            comment: 'Не сумісний з монітором LG 24MN450',
          },
        ],
        flags: ['невпевнено'],
        warnings: ['несумісність'],
        matchedTotal: 1110,
      },
    ],
    instructions: 'Перевірити наявність запчастин перед замовленням.',
  };
}

/**
 * Create a sample clients CSV content for testing.
 */
export function createClientsCsvContent(): string {
  return [
    'ID клієнта,Прізвище та ініціали,Телефон,Email,Адреса,Тип',
    'КЛ-001,Коваленко Олександр Вячеславович,+380631234567,kovalenko@email.ua,"м. Київ, вул. Хрещатик, 22, кв. 15",Фізична особа',
    'КЛ-002,Шевченко Ірина Миколаївна,+380998765432,shevchenko.i@gmail.com,"м. Київ, пр. Перемоги, 45, кв. 8",Фізична особа',
    'КЛ-003,Бондар Тарас Олегович,+380501112233,bondar.t@ukr.net,"м. Київ, вул. Лєскова, 10",Фізична особа',
    'КЛ-004,"ТОВ ""ТехноСтарт""",+380442223344,info@techstart.ua,"м. Київ, бул. Лесі Українки, 12, офіс 301",Юридична особа',
    'КЛ-005,Мельник Дмитро Костянтинович,+380674445566,melnyk.d@outlook.com,"м. Київ, вул. Січових Стрільців, 33, кв. 7",Фізична особа',
  ].join('\n') + '\n';
}

/**
 * Create a sample clients CSV content with short names for testing name resolution.
 */
export function createClientsShortNamesFixture(): Record<string, string> {
  return {
    'Коваленко О.В.': 'Коваленко Олександр Вячеславович',
    'Шевченко І.М.': 'Шевченко Ірина Миколаївна',
    'Бондар Т.О.': 'Бондар Тарас Олегович',
    'Мельник Д.К.': 'Мельник Дмитро Костянтинович',
    'Петренко Л.С.': 'Петренко Людмила Сергіївна',
    'Ткаченко А.М.': 'Ткаченко Андрій Михайлович',
  };
}

/**
 * Create an empty OutputData fixture.
 */
export function createEmptyOutputData(): OutputData {
  return {
    generationDate: '2026-05-15T10:30:00.000Z',
    matchedJobs: [],
  };
}
