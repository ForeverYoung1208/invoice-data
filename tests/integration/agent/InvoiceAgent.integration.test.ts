/**
 * Integration test for the InvoiceAgent pipeline.
 *
 * What this tests:
 *   parse → match (mocked LLM) → validate (blacklist) → generate → ZIP on disk
 *
 * The LLM is mocked so the test is deterministic and fast.
 * TaskService.findById is mocked to return a fixture Task with file refs
 * pointing at the existing tests/fixtures/mock-data CSVs — no DB required.
 * TaskResultRepository.create is mocked to skip the DB write.
 *
 * Why integration (not unit):
 *   This is the only place that runs the full compiled StateGraph end-to-end,
 *   proving that node wiring, state reducers, and file I/O all work together.
 */

import path, { join } from 'path';
import { existsSync, rmSync } from 'fs';

import { InvoiceAgent } from '../../../src/lib/agent/InvoiceAgent';
import { LlmAdapter } from '../../../src/lib/llm/LlmAdapter';
import { TaskService } from '../../../src/lib/services/TaskService';
import { TaskResultRepository } from '../../../src/lib/db/repositories/TaskResultRepository';
import { ConfigService } from '../../../src/lib/services/ConfigService';
import { OutputZipper } from '../../../src/lib/output/OutputZipper';
import { ETaskFileRole } from '../../../src/lib/constants';
import { IMatchedPart } from '../../../src/lib/output/types';

const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures', 'mock-data');
const TEMPLATE_PATH = join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'templates',
  'invoice_template.csv',
);
const OUTPUT_DIR = join(__dirname, '..', '..', 'fixtures', 'agent-output');
const TASK_ID = 'test-task-integration-001';

/**
 * Minimal matched parts returned by the mocked LLM for each job.
 * We pick parts that actually exist in the fixture catalog so that
 * GenerateOutputNode can build valid output.
 *
 * Note: ЗЧ-КЛ-015 is blacklisted for "MacBook Pro 14" M2" in the devices
 * fixture, so the blacklist test can assert warningLevel = 1 override.
 */
const MOCK_MATCHED_PARTS: IMatchedPart[] = [
  {
    partId: 'ЗЧ-БЖ-001',
    partName: 'Блок живлення ASUS 19V 3.42A (120W)',
    category: 'Блоки живлення',
    price: 650,
    quantity: 1,
    compatibilityConfidence: 0.95,
    warningLevel: 0.05,
    comment: '',
  },
];

/**
 * Returns both the LlmAdapter mock object and the underlying jest.Mock
 * for generateJson as a standalone reference.
 * Using a standalone reference avoids the @typescript-eslint/unbound-method
 * error when passing it to expect().
 */
function makeMockLlm(
  impl: () => Promise<IMatchedPart[]> = () =>
    Promise.resolve(MOCK_MATCHED_PARTS),
): {
  llm: LlmAdapter;
  generateJsonMock: jest.Mock;
} {
  const generateJsonMock = jest.fn().mockImplementation(impl);
  const llm = {
    generate: jest.fn(),
    generateJson: generateJsonMock,
  } as unknown as LlmAdapter;
  return { llm, generateJsonMock };
}

function makeMockTaskService(): jest.Mocked<TaskService> {
  return {
    findById: jest.fn().mockResolvedValue({
      id: TASK_ID,
      instructions: 'Test instructions',
      files: [
        {
          role: ETaskFileRole.JOBS,
          filePath: join(FIXTURES_DIR, 'jobs.csv'),
          originalName: 'jobs.csv',
        },
        {
          role: ETaskFileRole.CLIENTS,
          filePath: join(FIXTURES_DIR, 'clients.csv'),
          originalName: 'clients.csv',
        },
        {
          role: ETaskFileRole.PARTS,
          filePath: join(FIXTURES_DIR, 'parts.csv'),
          originalName: 'parts.csv',
        },
        {
          role: ETaskFileRole.DEVICES,
          filePath: join(FIXTURES_DIR, 'devices.csv'),
          originalName: 'devices.csv',
        },
      ],
    }),
  } as unknown as jest.Mocked<TaskService>;
}

/**
 * Returns both the repository mock and the underlying jest.Mock for create
 * as a standalone reference to avoid @typescript-eslint/unbound-method.
 */
function makeMockRepo(): { repo: TaskResultRepository; createMock: jest.Mock } {
  const createMock = jest.fn().mockResolvedValue(undefined);
  const repo = { create: createMock } as unknown as TaskResultRepository;
  return { repo, createMock };
}

function makeConfigService(): ConfigService {
  // Override getConfig so outputDir and templatePath point at our fixture dirs.
  // The node computes: join(dataDir, outputDir, taskId) for the output path.
  const svc = new ConfigService();
  jest.spyOn(svc, 'getConfig').mockReturnValue({
    env: 'test',
    dataDir: path.resolve(__dirname, '..', '..', 'fixtures'),
    templatePath: TEMPLATE_PATH,
    outputDir: 'agent-output',
    pollIntervalMs: 1000,
  });
  return svc;
}

function makeAgent(
  llm: LlmAdapter,
  taskService: TaskService,
  repo: TaskResultRepository,
): InvoiceAgent {
  return new InvoiceAgent(
    taskService,
    llm,
    repo,

    makeConfigService(),
    new OutputZipper(),
  );
}

afterEach(() => {
  const taskOutputDir = join(OUTPUT_DIR, TASK_ID);
  if (existsSync(taskOutputDir)) rmSync(taskOutputDir, { recursive: true });
  jest.restoreAllMocks();
});

describe('InvoiceAgent integration — happy path', () => {
  it('runs the full pipeline and produces a ZIP file', async () => {
    const { llm, generateJsonMock } = makeMockLlm();
    const taskService = makeMockTaskService();
    const { repo, createMock } = makeMockRepo();
    const agent = makeAgent(llm, taskService, repo);

    const state = await agent.run(TASK_ID, 'Test instructions');

    // ParseNode populated all CSV arrays
    expect(state.jobs.length).toBeGreaterThan(0);
    expect(state.clients.length).toBeGreaterThan(0);
    expect(state.parts.length).toBeGreaterThan(0);
    expect(state.devices.length).toBeGreaterThan(0);

    // MatchPartsNode produced one MatchedJob per job
    expect(state.matchedJobs.length).toBe(state.jobs.length);
    state.matchedJobs.forEach((job) => {
      expect(job.matchedParts.length).toBeGreaterThan(0);
    });

    // LLM was called once per job
    expect(generateJsonMock).toHaveBeenCalledTimes(state.jobs.length);

    // warningLevel = 1 − compatibilityConfidence (0.95 → 0.05)
    state.matchedJobs.forEach((job) => {
      job.matchedParts.forEach((part) => {
        expect(part.warningLevel).toBeCloseTo(
          1 - part.compatibilityConfidence,
          2,
        );
      });
    });

    // GenerateOutputNode created a ZIP
    expect(state.zipPath).toBeTruthy();
    expect(existsSync(state.zipPath!)).toBe(true);
    expect(state.zipPath).toMatch(/\.zip$/);

    // Repository was called to persist the result
    expect(createMock).toHaveBeenCalledWith(
      TASK_ID,
      expect.objectContaining({ matchedJobs: expect.any(Array) }),
      state.zipPath,
    );

    // No errors
    expect(agent.hasErrors(state)).toBe(false);
  });

  it('overrides warningLevel to 1 for blacklisted parts (ValidateCompatibilityNode)', async () => {
    /**
     * ЗЧ-КЛ-015 is in the blacklist for "MacBook Pro 14" M2" in devices.csv.
     * We use a single-job fixture for that device and force the LLM to return
     * ЗЧ-КЛ-015, then assert ValidateCompatibilityNode overrides warningLevel to 1.
     */
    const blacklistedPart: IMatchedPart = {
      partId: 'ЗЧ-КЛ-015',
      partName: 'Клавіатура Lenovo IdeaPad 3 15ITL6 (US)',
      category: 'Клавіатури',
      price: 950,
      quantity: 1,
      compatibilityConfidence: 0.9, // high LLM confidence — but blacklisted
      warningLevel: 0.1,
      comment: '',
    };

    const { llm } = makeMockLlm(() => Promise.resolve([blacklistedPart]));
    const taskService = makeMockTaskService();

    // Override task to have a single MacBook Pro job so the blacklist fires.
    (taskService.findById as jest.Mock).mockResolvedValue({
      id: TASK_ID,
      instructions: '',
      files: [
        {
          role: ETaskFileRole.JOBS,
          filePath: join(__dirname, 'fixtures', 'macbook_job.csv'),
          originalName: 'jobs.csv',
        },
        {
          role: ETaskFileRole.CLIENTS,
          filePath: join(FIXTURES_DIR, 'clients.csv'),
          originalName: 'clients.csv',
        },
        {
          role: ETaskFileRole.PARTS,
          filePath: join(FIXTURES_DIR, 'parts.csv'),
          originalName: 'parts.csv',
        },
        {
          role: ETaskFileRole.DEVICES,
          filePath: join(FIXTURES_DIR, 'devices.csv'),
          originalName: 'devices.csv',
        },
      ],
    });

    const { repo } = makeMockRepo();
    const agent = makeAgent(llm, taskService, repo);

    const state = await agent.run(TASK_ID, '');

    const macJob = state.matchedJobs.find((j) =>
      j.deviceModel.includes('MacBook'),
    );
    expect(macJob).toBeDefined();
    const flaggedPart = macJob!.matchedParts.find(
      (p) => p.partId === 'ЗЧ-КЛ-015',
    );
    expect(flaggedPart).toBeDefined();
    expect(flaggedPart!.warningLevel).toBe(1);
  });
});

describe('InvoiceAgent integration — error path', () => {
  it('accumulates errors in state when LLM throws, does not crash', async () => {
    const { llm } = makeMockLlm(() =>
      Promise.reject(new Error('LLM unavailable')),
    );
    const { repo } = makeMockRepo();
    const agent = makeAgent(llm, makeMockTaskService(), repo);

    const state = await agent.run(TASK_ID, '');

    // Every job failed → errors accumulated, matchedJobs still populated (emptyJob)
    expect(state.errors.length).toBeGreaterThan(0);
    expect(state.matchedJobs.length).toBe(state.jobs.length);
    state.matchedJobs.forEach((job) => {
      expect(job.matchedParts).toHaveLength(0);
    });
  });
});
