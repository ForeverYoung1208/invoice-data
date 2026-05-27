import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import { TotalSheetBuilder } from '../../../src/lib/output/TotalSheetBuilder';
import {
  createOutputDataFixture,
  createEmptyOutputData,
} from '../../fixtures/output-data';

const TEMP_DIR = join(__dirname, '..', '..', 'fixtures', 'temp');

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

describe('TotalSheetBuilder', () => {
  const fixture = createOutputDataFixture();
  const builder = new TotalSheetBuilder();

  describe('build()', () => {
    test('should include correct CSV headers', () => {
      const csv = builder.build(fixture);
      const headers = csv.trim().split('\n')[0];
      expect(headers).toContain('№ заявки');
      expect(headers).toContain('Прапор');
      expect(headers).toContain('Застереження');
    });

    test('should include all matched parts and prices', () => {
      const csv = builder.build(fixture);
      expect(csv).toContain('ЗЧ-БЖ-001');
      expect(csv).toContain('ЗЧ-LED-018');
      expect(csv).toContain('650');
      expect(csv).toContain('580');
    });

    test('should flag uncertain and warning parts', () => {
      const csv = builder.build(fixture);
      expect(csv).toContain('⚠️ Невпевнено');
      expect(csv).toContain('❌ Несумісність');
    });

    test('should include subtotal and grand total rows', () => {
      const csv = builder.build(fixture);
      expect(csv).toContain('Підсумок');
      expect(csv).toContain('РАЗОМ');
    });

    test('should return header-only CSV for empty data', () => {
      const csv = builder.build(createEmptyOutputData());
      expect(csv.trim().split('\n').length).toBe(1);
      expect(csv).toContain('№ заявки');
    });
  });

  describe('writeToFile()', () => {
    test('should write CSV to disk', () => {
      const outputPath = join(TEMP_DIR, 'total_test.csv');
      const result = builder.writeToFile(fixture, outputPath);

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('ЗЧ-БЖ-001');
    });
  });

  describe('fileName()', () => {
    test('should format total_YYYY_MM_DD.csv', () => {
      expect(TotalSheetBuilder.fileName('2026-05-15T10:00:00.000Z')).toBe(
        'total_2026_05_15.csv',
      );
      expect(TotalSheetBuilder.fileName('2026-01-05T00:00:00.000Z')).toBe(
        'total_2026_01_05.csv',
      );
    });
  });
});
