/**
 * Generate mock Excel files for a Ukrainian tech repair workshop.
 *
 * File types (matching TaskFileRole enum):
 *   - jobs.xlsx      — Repair job tickets
 *   - clients.xlsx   — Customer directory
 *   - parts.xlsx     — Spare parts catalog
 *   - devices.xlsx   — Device catalog
 *
 * Usage: npx tsx tests/fixtures/generate-mock-data.ts
 */

import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = join(__dirname, 'mock-data');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function addHeaderRow(worksheet: ExcelJS.Worksheet, headers: string[]) {
  const row = worksheet.addRow(headers);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

function autoFit(worksheet: ExcelJS.Worksheet, padding = 2) {
  worksheet.columns.forEach((col) => {
    col.width = Math.max(
      ...worksheet.getRows().map((row) => {
        const cell = row.getCell(col.number);
        const val = cell.value == null ? '' : String(cell.value);
        return val.length + padding;
      }),
      10,
    );
  });
}

function formatUA(value: string | number): string {
  return String(value);
}

// ──────────────────────────────────────────────
// 1. JOBS — Repair job tickets
// ──────────────────────────────────────────────

async function createJobsXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Заявки на ремонт');

  const headers = [
    '№ заявки',
    'Дата прийому',
    'Прізвище клієнта',
    'Пристрій',
    'Модель',
    'Опис несправності',
    'Статус',
    'Вартість ремонт.',
    'Примітки',
  ];

  addHeaderRow(worksheet, headers);

  const rows = [
    [
      'З-2026-0147',
      '2026-05-10',
      'Коваленко О.В.',
      'Ноутбук',
      'ASUS VivoBook 15 X515',
      'Не вмикається, підозра на блок живлення',
      'Виконано',
      1200,
      'Замінено блок живлення, гарантія 30 днів',
    ],
    [
      'З-2026-0148',
      '2026-05-11',
      'Шевченко І.М.',
      'Принтер',
      'HP LaserJet Pro M404dn',
      'Друкує з смугами, потрібна заміна тонера',
      'В процесі',
      850,
      'Очікується постачання тонера HP 58A',
    ],
    [
      'З-2026-0149',
      '2026-05-11',
      'Бондар Т.О.',
      'Монітор',
      'Samsung Odyssey G5 S27BG55',
      'Мерехтить екран, можлива проблема з матрицею',
      'Діагностика',
      450,
      'Діагностика завершена, потрібна заміна LED-стрічки',
    ],
    [
      'З-2026-0150',
      '2026-05-12',
      'Мельник Д.К.',
      'Настільний ПК',
      'Self-built (RTX 3060, Ryzen 5 5600X)',
      'Перегрівається під навантаженням, автоматичне вимкнення',
      'Очікує на узгодження',
      1500,
      'Потрібно замінити термопасти, почистити систему охолодження',
    ],
    [
      'З-2026-0151',
      '2026-05-13',
      'Петренко Л.С.',
      'Ноутбук',
      'Lenovo IdeaPad 3 15ITL6',
      'Замикання клавіатури (клавіші W, E, R)',
      'Виконано',
      950,
      'Замінено клавіатуру, тест пройшов успішно',
    ],
    [
      'З-2026-0140',
      '2026-05-08',
      'Ткаченко А.М.',
      'Настільний ПК',
      'HP ProDesk 400 G7',
      'Повільна робота, заміна HDD на SSD',
      'Виконано',
      1450,
      'Замінено HDD 1TB на SSD NVMe 512GB, перенесено дані, встановлено Windows 11',
    ],
    [
      'З-2026-0135',
      '2026-05-06',
      'Коваленко О.В.',
      'Монітор',
      'LG 24MN450',
      'Не вмикається, підозра на блок живлення монітора',
      'Виконано',
      800,
      'Замінено блок живлення, тест стабільності пройшено, гарантія 30 днів',
    ],
    [
      'З-2026-0130',
      '2026-05-05',
      'ТОВ "ТехноСтарт"',
      'Принтер',
      'Canon PIXMA G3411',
      'Принтер не видаляє картридж, помилка P-05',
      'Виконано',
      550,
      'Чистка механізму подачі, перезасинка чипів картриджів',
    ],
  ];

  rows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (cell.column === 8 && typeof cell.value === 'number') {
        cell.numFmt = '# ##0';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  autoFit(worksheet);

  const buf = await workbook.xlsx.writeBuffer();
  await writeFile(join(OUTPUT_DIR, 'jobs.xlsx'), Buffer.from(buf));
  console.log('✅ jobs.xlsx created');
}

// ──────────────────────────────────────────────
// 2. CLIENTS — Customer directory
// ──────────────────────────────────────────────

async function createClientsXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Клієнти');

  const headers = [
    'ID клієнта',
    'Прізвище та ініціали',
    'Телефон',
    'Email',
    'Адреса',
    'Тип',
  ];

  addHeaderRow(worksheet, headers);

  const rows = [
    ['КЛ-001', 'Коваленко Олександр Вячеславович', '+380631234567', 'kovalenko@email.ua', 'м. Київ, вул. Хрещатик, 22, кв. 15', 'Фізична особа'],
    ['КЛ-002', 'Шевченко Ірина Миколаївна', '+380998765432', 'shevchenko.i@gmail.com', 'м. Київ, пр. Перемоги, 45, кв. 8', 'Фізична особа'],
    ['КЛ-003', 'Бондар Тарас Олегович', '+380501112233', 'bondar.t@ukr.net', 'м. Київ, вул. Лєскова, 10', 'Фізична особа'],
    ['КЛ-004', 'ТОВ "ТехноСтарт"', '+380442223344', 'info@techstart.ua', 'м. Київ, бул. Лесі Українки, 12, офіс 301', 'Юридична особа'],
    ['КЛ-005', 'Мельник Дмитро Костянтинович', '+380674445566', 'melnyk.d@outlook.com', 'м. Київ, вул. Січових Стрільців, 33, кв. 7', 'Фізична особа'],
  ];

  rows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  autoFit(worksheet);

  const buf = await workbook.xlsx.writeBuffer();
  await writeFile(join(OUTPUT_DIR, 'clients.xlsx'), Buffer.from(buf));
  console.log('✅ clients.xlsx created');
}

// ──────────────────────────────────────────────
// 3. PARTS — Spare parts catalog
// ──────────────────────────────────────────────

async function createPartsXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Запчастини');

  const headers = [
    'Артикул',
    'Назва',
    'Категорія',
    'Ціна закупівлі (₴)',
    'Ціна продажу (₴)',
    'Наявність',
  ];

  addHeaderRow(worksheet, headers);

  const rows = [
    // --- Блоки живлення ---
    ['ЗЧ-БЖ-001', 'Блок живлення ASUS 19V 3.42A (120W)', 'Блоки живлення', 420, 650, 'Так'],
    ['ЗЧ-БЖ-002', 'Блок живлення ASUS 19V 4.74A (180W)', 'Блоки живлення', 560, 850, 'Так'],
    ['ЗЧ-БЖ-003', 'Блок живлення Lenovo 20V 4.5A (90W)', 'Блоки живлення', 480, 720, 'Так'],
    ['ЗЧ-БЖ-004', 'Блок живлення Lenovo 20V 6.7A (135W)', 'Блоки живлення', 620, 920, 'Ні'],
    // --- Оперативна пам\'ять ---
    ['ЗЧ-ОЗУ-005', 'Планка RAM DDR4 8GB 2666MHz (Single Rank)', 'Оперативна пам\'ять', 650, 900, 'Так'],
    ['ЗЧ-ОЗУ-006', 'Планка RAM DDR4 16GB 3200MHz (Dual Rank)', 'Оперативна пам\'ять', 980, 1350, 'Так'],
    ['ЗЧ-ОЗУ-007', 'Планка RAM DDR5 16GB 4800MHz (Single Rank)', 'Оперативна пам\'ять', 1200, 1650, 'Так'],
    ['ЗЧ-ОЗУ-008', 'Планка RAM DDR5 32GB 5600MHz (Dual Rank)', 'Оперативна пам\'ять', 2200, 2900, 'Ні'],
    // --- Накопичувачі ---
    ['ЗЧ-ДН-009', 'SSD NVMe M.2 256GB Samsung 980', 'Накопичувачі', 750, 1100, 'Так'],
    ['ЗЧ-ДН-010', 'SSD NVMe M.2 512GB Samsung 980', 'Накопичувачі', 1100, 1600, 'Так'],
    ['ЗЧ-ДН-011', 'Жорсткий диск HDD 1TB 7200rpm 2.5"', 'Накопичувачі', 1100, 1600, 'Ні'],
    // --- Відеокарти ---
    ['ЗЧ-ВК-012', 'Відеокарта NVIDIA RTX 3060 12GB', 'Відеокарти', 8500, 11000, 'Так'],
    ['ЗЧ-ВК-013', 'Відеокарта NVIDIA RTX 4060 8GB', 'Відеокарти', 9800, 12800, 'Так'],
    ['ЗЧ-ВК-014', 'Відеокарта AMD RX 6600 8GB', 'Відеокарти', 7200, 9500, 'Ні'],
    // --- Клавіатури ---
    ['ЗЧ-КЛ-015', 'Клавіатура Lenovo IdeaPad 3 15ITL6 (US)', 'Клавіатури', 680, 950, 'Так'],
    ['ЗЧ-КЛ-016', 'Клавіатура Lenovo IdeaPad 3 15ITL6 (EU)', 'Клавіатури', 680, 950, 'Так'],
    ['ЗЧ-КЛ-017', 'Клавіатура HP Pavilion 15-eg (RU)', 'Клавіатури', 720, 1000, 'Так'],
    // --- LED-підсвітка ---
    ['ЗЧ-LED-018', 'LED-стрічка Samsung 27" G5 (60cm)', 'Світлодіоди', 350, 580, 'Так'],
    ['ЗЧ-LED-019', 'LED-стрічка LG 24" (45cm)', 'Світлодіоди', 280, 460, 'Так'],
    ['ЗЧ-LED-020', 'LED-стрічка BenQ 27" (55cm)', 'Світлодіоди', 310, 510, 'Ні'],
    // --- Ткери та картриджі ---
    ['ЗЧ-ТН-021', 'Тонер-картридж HP CF258A (58A) ~1000 ст.', 'Ткери та картриджі', 210, 380, 'Немає'],
    ['ЗЧ-ТН-022', 'Тонер-картридж HP CF258X (58X) ~2200 ст.', 'Ткери та картриджі', 380, 620, 'Так'],
    ['ЗЧ-ТН-023', 'Тонер-картридж Canon CRG-054 ~1600 ст.', 'Ткери та картриджі', 290, 480, 'Так'],
    ['ЗЧ-ТН-024', 'Фотобарабан HP 58A ~10000 ст.', 'Ткери та картриджі', 420, 650, 'Так'],
    // --- Термопасти ---
    ['ЗЧ-ТМ-025', 'Термопаста MX-4 (4г)', 'Матеріали', 45, 90, 'Так'],
    ['ЗЧ-ТМ-026', 'Термопаста Arctic MX-6 (4г)', 'Матеріали', 60, 110, 'Так'],
    ['ЗЧ-ТМ-027', 'Термопрокладки 1mm (набір)', 'Матеріали', 35, 70, 'Так'],
    // --- Системи охолодження ---
    ['ЗЧ-СО-028', 'Вентилятор 80mm (ноутбук)', 'Системи охолодження', 180, 320, 'Так'],
    ['ЗЧ-СО-029', 'Вентилятор 120mm (ПК)', 'Системи охолодження', 220, 380, 'Так'],
    ['ЗЧ-СО-030', 'Система водяного охолодження 240mm', 'Системи охолодження', 1800, 2500, 'Ні'],
  ];

  rows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (cell.column >= 4 && cell.column <= 5 && typeof cell.value === 'number') {
        cell.numFmt = '# ##0';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  autoFit(worksheet);

  const buf = await workbook.xlsx.writeBuffer();
  await writeFile(join(OUTPUT_DIR, 'parts.xlsx'), Buffer.from(buf));
  console.log('✅ parts.xlsx created');
}

// ──────────────────────────────────────────────
// 4. DEVICES — Device catalog
// ──────────────────────────────────────────────

async function createDevicesXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Пристрої');

  const headers = [
    'Категорія',
    'Бренд',
    'Модель',
    'Тип пристрою',
    'Складність ремонту (1-5)',
    'Час ремонту (год)',
    'Типові запчастини',
    'Чорний список запчастин',
    'Примітки',
  ];

  addHeaderRow(worksheet, headers);

  const rows = [
    // --- Ноутбуки ---
    ['Ноутбук', 'ASUS', 'VivoBook 15 X515', 'Лайтбоук', 3, 2, 'ЗЧ-БЖ-001, ЗЧ-БЖ-002, ЗЧ-ОЗУ-005, ЗЧ-ОЗУ-006, ЗЧ-ДН-009, ЗЧ-ДН-010, ЗЧ-ТМ-025', 'ЗЧ-ОЗУ-007, ЗЧ-ОЗУ-008, ЗЧ-СО-030'],
    ['Ноутбук', 'Lenovo', 'IdeaPad 3 15ITL6', 'Лайтбоук', 2, 1, 'ЗЧ-КЛ-015, ЗЧ-КЛ-016, ЗЧ-БЖ-003, ЗЧ-ОЗУ-005, ЗЧ-ОЗУ-006, ЗЧ-ТМ-025', 'ЗЧ-ОЗУ-007, ЗЧ-ОЗУ-008, ЗЧ-ВК-012, ЗЧ-ВК-013, ЗЧ-СО-030'],
    ['Ноутбук', 'HP', 'Pavilion 15-eg0000', 'Лайтбоук', 3, 2, 'ЗЧ-КЛ-017, ЗЧ-БЖ-001, ЗЧ-ОЗУ-005, ЗЧ-ДН-010, ЗЧ-ТМ-025', 'ЗЧ-ОЗУ-007, ЗЧ-ОЗУ-008, ЗЧ-СО-030'],
    ['Ноутбук', 'Dell', 'Inspiron 15 3511', 'Лайтбоук', 3, 2, 'ЗЧ-БЖ-003, ЗЧ-БЖ-004, ЗЧ-ОЗУ-005, ЗЧ-ДН-009, ЗЧ-ТМ-026', 'ЗЧ-ОЗУ-007, ЗЧ-ОЗУ-008, ЗЧ-СО-030'],
    // --- Принтери ---
    ['Принтер', 'HP', 'LaserJet Pro M404dn', 'Лазерний принтер', 3, 3, 'ЗЧ-ТН-021, ЗЧ-ТН-022, ЗЧ-ТН-024', 'ЗЧ-ТН-023, ЗЧ-ВК-012'],
    ['Принтер', 'Epson', 'L3250', 'Струменевий принтер', 4, 4, 'ЗЧ-ТМ-027', 'ЗЧ-ТН-021, ЗЧ-ТН-022, ЗЧ-ТН-024, ЗЧ-ВК-012'],
    ['Принтер', 'Canon', 'PIXMA G3411', 'Струменевий принтер', 3, 3, 'ЗЧ-ТН-023, ЗЧ-ТМ-027', 'ЗЧ-ТН-021, ЗЧ-ТН-022, ЗЧ-ТН-024, ЗЧ-ВК-013'],
    // --- Монітори ---
    ['Монітор', 'Samsung', 'Odyssey G5 S27BG55', 'Ігровий монітор', 4, 3, 'ЗЧ-LED-018', 'ЗЧ-LED-019, ЗЧ-LED-020, ЗЧ-ОЗУ-005, ЗЧ-ОЗУ-006'],
    ['Монітор', 'LG', '24MN450', 'Офісний монітор', 2, 1, 'ЗЧ-LED-019, ЗЧ-ТМ-025', 'ЗЧ-LED-018, ЗЧ-LED-020'],
    ['Монітор', 'BenQ', 'GW2780', 'Мультимедійний', 3, 2, 'ЗЧ-LED-020, ЗЧ-ТМ-025', 'ЗЧ-LED-018, ЗЧ-LED-019'],
    // --- Настільні ПК ---
    ['Настільний ПК', 'Self-built', 'Custom (RTX 3060, Ryzen 5)', 'Збірка', 4, 3, 'ЗЧ-ОЗУ-006, ЗЧ-ОЗУ-007, ЗЧ-ДН-010, ЗЧ-ВК-012, ЗЧ-ТМ-026, ЗЧ-СО-029', 'ЗЧ-ОЗУ-005, ЗЧ-СО-028'],
    ['Настільний ПК', 'HP', 'ProDesk 400 G7', 'Офісний ПК', 2, 1, 'ЗЧ-ОЗУ-005, ЗЧ-ОЗУ-006, ЗЧ-ДН-009, ЗЧ-ДН-010, ЗЧ-СО-029, ЗЧ-ТМ-025', 'ЗЧ-ВК-012, ЗЧ-ВК-013, ЗЧ-СО-030'],
  ];

  rows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  autoFit(worksheet);

  const buf = await workbook.xlsx.writeBuffer();
  await writeFile(join(OUTPUT_DIR, 'devices.xlsx'), Buffer.from(buf));
  console.log('✅ devices.xlsx created');
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await createJobsXlsx();
  await createClientsXlsx();
  await createPartsXlsx();
  await createDevicesXlsx();
  console.log(`\n📁 All mock files written to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Error generating mock data:', err);
  process.exit(1);
});
