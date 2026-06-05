import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import { ClientCSVWriter } from '../../../src/lib/output/ClientCSVWriter';
import type { IClientInvoiceData } from '../../../src/lib/output/types';

const TEMP_DIR = join(__dirname, '..', '..', 'fixtures', 'temp');
const TEMPLATE_DIR = join(__dirname, '..', '..', 'fixtures', 'templates');
const templatePath = join(TEMPLATE_DIR, 'invoice_template.csv');

function setupTemp(): void {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanupTemp(): void {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

beforeEach(setupTemp);
afterEach(cleanupTemp);

describe('ClientCSVWriter', () => {
  const writer = new ClientCSVWriter();

  function createInvoiceData(): IClientInvoiceData {
    return {
      clientName: 'Коваленко Олександр Вячеславович',
      address: 'м. Київ, вул. Хрещатик, 22',
      phone: '+380631234567',
      email: 'kovalenko@email.ua',
      invoiceDate: '2026-05-15',
      grandTotal: 1110,
      allNotes: ['Замінено блок живлення'],
      matchedJobs: [
        {
          jobNumber: 'З-2026-0147',
          jobDate: '2026-05-10',
          clientName: 'Коваленко О.В.',
          deviceType: 'Ноутбук',
          deviceModel: 'ASUS VivoBook',
          faultDescription: 'Не вмикається',
          jobStatus: 'Виконано',
          originalCost: 1200,
          matchedParts: [
            {
              partId: 'ЗЧ-БЖ-001',
              partName: 'Блок живлення ASUS',
              category: 'Блоки живлення',
              price: 650,
              quantity: 1,
              isUncertain: false,
              warningLevel: 0,
            },
          ],
          flags: [],
          warnings: [],
          matchedTotal: 650,
        },
        {
          jobNumber: 'З-2026-0135',
          jobDate: '2026-05-06',
          clientName: 'Коваленко О.В.',
          deviceType: 'Монітор',
          deviceModel: 'LG 24MN450',
          faultDescription: 'Не вмикається монітор',
          jobStatus: 'Виконано',
          originalCost: 800,
          matchedParts: [
            {
              partId: 'ЗЧ-LED-019',
              partName: 'LED-стрічка LG',
              category: 'Світлодіоди',
              price: 460,
              quantity: 1,
              isUncertain: true,
              warningLevel: 1,
              comment: 'Не сумісний',
            },
          ],
          flags: ['невпевнено'],
          warnings: ['несумісність'],
          matchedTotal: 460,
        },
      ],
    };
  }

  describe('generate()', () => {
    test('should replace all template placeholders', () => {
      const csv = writer.generate(templatePath, createInvoiceData());
      expect(csv).toContain('2026-05-15');
      expect(csv).toContain('Коваленко Олександр Вячеславович');
      expect(csv).toContain('+380631234567');
      expect(csv).not.toContain('TEMPLATE_');
    });

    test('should include line items', () => {
      const csv = writer.generate(templatePath, createInvoiceData());
      expect(csv).toContain('ЗЧ-БЖ-001');
      expect(csv).toContain('ЗЧ-LED-019');
      expect(csv).toContain('Блок живлення ASUS');
    });

    test('should calculate totals correctly', () => {
      const csv = writer.generate(templatePath, createInvoiceData());
      expect(csv).toContain('1110');
      expect(csv).toContain('Всього');
      expect(csv).toContain('Разом');
    });

    test('should include flags and warnings', () => {
      const csv = writer.generate(templatePath, createInvoiceData());
      expect(csv).toContain('⚠️ Невпевнено');
      expect(csv).toContain('❌ Несумісність');
      expect(csv).toContain('Не сумісний');
    });

    test('should handle no matched parts', () => {
      const data = createInvoiceData();
      data.matchedJobs = [];
      data.grandTotal = 0;
      data.allNotes = [];

      const csv = writer.generate(templatePath, data);
      expect(csv).not.toContain('TEMPLATE_');
      expect(csv).toContain('0');
    });

    test('should default notes when empty', () => {
      const data = createInvoiceData();
      data.allNotes = [];
      const csv = writer.generate(templatePath, data);
      expect(csv).toContain('Зауважень немає');
    });
  });

  describe('writeToFile()', () => {
    test('should write CSV to disk', () => {
      const outputPath = join(TEMP_DIR, 'invoice_test.csv');
      const result = writer.writeToFile(
        templatePath,
        createInvoiceData(),
        outputPath,
      );

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).not.toContain('TEMPLATE_');
    });
  });

  describe('fileName()', () => {
    test('should generate valid filename', () => {
      const name = ClientCSVWriter.fileName(
        'Коваленко О.В.',
        '2026-05-15T10:00:00.000Z',
      );
      expect(name).toContain('Коваленко');
      expect(name).toContain('2026_05_15.csv');
      expect(name).not.toContain('"');
    });
  });
});
