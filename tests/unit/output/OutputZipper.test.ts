import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

import { OutputZipper } from '../../../src/lib/output/OutputZipper';
import type {
  OutputData,
  ClientInvoiceData,
} from '../../../src/lib/output/types';
import { ClientCSVWriter } from '../../../src/lib/output/ClientCSVWriter';

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

function createClientInvoices(data: OutputData): ClientInvoiceData[] {
  const clientMap = new Map<string, ClientInvoiceData>();

  for (const job of data.matchedJobs) {
    if (!clientMap.has(job.clientName)) {
      clientMap.set(job.clientName, {
        clientName: job.clientName,
        address: `address for ${job.clientName}`,
        phone: '+380501112233',
        email: 'test@test.ua',
        matchedJobs: [],
        invoiceDate: new Date(data.generationDate).toISOString().split('T')[0],
        grandTotal: 0,
        allNotes: [],
      });
    }
    const client = clientMap.get(job.clientName)!;
    client.matchedJobs.push(job);
    client.grandTotal += job.matchedTotal;
    client.allNotes.push(job.faultDescription);
  }

  return Array.from(clientMap.values());
}

describe('OutputZipper', () => {
  const fixture: OutputData = {
    generationDate: '2026-05-15T10:30:00.000Z',
    matchedJobs: [
      {
        jobNumber: 'З-2026-0100',
        jobDate: '2026-05-10',
        clientName: 'Клиент 1',
        deviceType: 'Ноутбук',
        deviceModel: 'ASUS',
        faultDescription: 'Тестова несправність',
        jobStatus: 'Виконано',
        originalCost: 1200,
        matchedParts: [
          {
            partId: 'ЗЧ-ТН-021',
            partName: 'Тонер-картридж',
            category: 'Картриджі',
            price: 380,
            quantity: 1,
            isUncertain: false,
            warningLevel: 0,
          },
        ],
        flags: [],
        warnings: [],
        matchedTotal: 380,
      },
    ],
  };

  test('should assemble ZIP with total sheet and client invoices', async () => {
    const zipper = new OutputZipper();
    const clientInvoices = createClientInvoices(fixture);

    const zipPath = await zipper.assemble(
      fixture,
      clientInvoices,
      TEMP_DIR,
      templatePath,
    );

    expect(zipPath).toBeDefined();
    expect(existsSync(zipPath)).toBe(true);
    expect(zipPath).toContain('invoices_2026_05_15.zip');

    const content = readFileSync(zipPath);
    expect(content.toString('utf-8')).toContain('total_2026_05_15.csv');
  });

  test('ZIP should contain per-client invoice files', async () => {
    const zipper = new OutputZipper();
    const clientInvoices = createClientInvoices(fixture);

    const zipPath = await zipper.assemble(
      fixture,
      clientInvoices,
      TEMP_DIR,
      templatePath,
    );

    const content = readFileSync(zipPath);
    const contentStr = content.toString('utf-8');

    const expectedName = ClientCSVWriter.fileName(
      clientInvoices[0].clientName,
      fixture.generationDate,
    );
    expect(contentStr).toContain(expectedName);
  });

  test('should create output directory if it does not exist', async () => {
    const zipper = new OutputZipper();
    const clientInvoices = createClientInvoices(fixture);
    const newDir = join(TEMP_DIR, 'nested', 'deep');

    const zipPath = await zipper.assemble(
      fixture,
      clientInvoices,
      newDir,
      templatePath,
    );

    expect(existsSync(zipPath)).toBe(true);
  });

  test('getZipPath() is null before assembly', () => {
    const zipper = new OutputZipper();
    expect(zipper.getPath()).toBeNull();
  });
});
