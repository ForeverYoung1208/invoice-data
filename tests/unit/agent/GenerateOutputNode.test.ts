import fs, { existsSync, rmSync } from 'fs';
import path, { join } from 'path';

import { GenerateOutputNode } from '../../../src/lib/agent/nodes/GenerateOutputNode';
import { OutputZipper } from '../../../src/lib/output/OutputZipper';
import { TaskResultRepository } from '../../../src/lib/db/repositories/TaskResultRepository';
import { ConfigService } from '../../../src/lib/services/ConfigService';
import { TInvoiceAgentState } from '../../../src/lib/agent/state/annotation';
import { createOutputDataFixture } from '../../fixtures/output-data';

const TEMP_DIR = join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'temp',
  'generate-output-node',
);
const TEMPLATE_DIR = join(__dirname, '..', '..', 'fixtures', 'templates');

const mockSave = jest.fn().mockResolvedValue(undefined);
const mockRepo = { create: mockSave } as unknown as TaskResultRepository;
const configService = new ConfigService();
const outputZipper = new OutputZipper();

const makeState = (): TInvoiceAgentState => {
  const fixture = createOutputDataFixture();
  return {
    taskId: 'test-task-id',
    instructions: fixture.instructions ?? '',
    taskFiles: [],
    jobs: [],
    clients: [
      {
        clientId: '1',
        fullName: 'Коваленко О.В.',
        phone: '+380501112233',
        email: 'k@test.ua',
        address: 'вул. Тестова 1',
        type: 'Фізична особа',
      },
      {
        clientId: '2',
        fullName: 'Шевченко І.М.',
        phone: '+380502223344',
        email: 's@test.ua',
        address: 'вул. Тестова 2',
        type: 'Фізична особа',
      },
      {
        clientId: '3',
        fullName: 'Бондар Т.О.',
        phone: '+380503334455',
        email: 'b@test.ua',
        address: 'вул. Тестова 3',
        type: 'Фізична особа',
      },
    ],
    parts: [],
    devices: [],
    matchedJobs: fixture.matchedJobs,
    warnings: [],
    errors: [],
    zipPath: null,
    pendingCorrection: '',
  };
};

beforeAll(() => {
  process.env.DATA_DIR = TEMP_DIR;
  // place template where the node expects it
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.copyFileSync(
    path.join(TEMPLATE_DIR, 'invoice_template.csv'),
    path.join(TEMP_DIR, 'invoice_template.csv'),
  );
});

afterAll(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
});

beforeEach(() => {
  mockSave.mockClear();
});

describe('GenerateOutputNode integration', () => {
  it('creates a ZIP file on disk and returns zipPath in state', async () => {
    const node = new GenerateOutputNode(mockRepo, configService, outputZipper);
    const result = await node.execute(makeState());

    expect(result.errors).toBeUndefined();
    expect(result.zipPath).toBeDefined();
    expect(existsSync(result.zipPath!)).toBe(true);
    expect(result.zipPath).toMatch(/invoices_\d{4}_\d{2}_\d{2}\.zip$/);
  });

  it('saves result to repository with taskId and zipPath', async () => {
    const node = new GenerateOutputNode(mockRepo, configService, outputZipper);
    const result = await node.execute(makeState());

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      'test-task-id',
      expect.objectContaining({ matchedJobs: expect.any(Array) }),
      result.zipPath,
    );
  });

  it('returns error in state when matchedJobs is empty', async () => {
    const node = new GenerateOutputNode(mockRepo, configService, outputZipper);
    const state = makeState();
    state.matchedJobs = [];

    const result = await node.execute(state);

    expect(result.errors).toHaveLength(1);
    expect(result.zipPath).toBeUndefined();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
