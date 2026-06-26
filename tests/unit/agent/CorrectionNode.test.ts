import { CorrectionNode } from '../../../src/lib/agent/nodes/CorrectionNode';
import { LlmAdapter } from '../../../src/lib/llm/LlmAdapter';
import { TInvoiceAgentState } from '../../../src/lib/agent/state/annotation';
import { IMatchedJob } from '../../../src/lib/output/types';

const makeJob = (overrides: Partial<IMatchedJob> = {}): IMatchedJob => ({
  jobNumber: 'З-001',
  jobDate: '2026-05-10',
  clientName: 'Test Client',
  deviceType: 'Ноутбук',
  deviceModel: 'ASUS VivoBook X515',
  faultDescription: 'Test fault',
  jobStatus: 'Виконано',
  originalCost: 0,
  matchedParts: [
    {
      partId: 'ЗЧ-001',
      partName: 'Картридж тонерний',
      category: 'Витратні матеріали',
      price: 350,
      quantity: 1,
      compatibilityConfidence: 1,
      warningLevel: 0,
      comment: '',
    },
  ],
  warnings: [],
  matchedTotal: 350,
  ...overrides,
});

const makeState = (
  matchedJobs: IMatchedJob[],
  pendingCorrection: string,
): TInvoiceAgentState => ({
  taskId: 'test',
  instructions: '',
  taskFiles: [],
  jobs: [],
  clients: [],
  parts: [],
  devices: [],
  matchedJobs,
  warnings: [],
  errors: [],
  zipPath: null,
  pendingCorrection,
});

const mockLlm = (returnValue: unknown): LlmAdapter => ({
  generateJson: jest.fn().mockResolvedValue(returnValue),
  generate: jest.fn(),
});

describe('CorrectionNode', () => {
  it('returns empty update when pendingCorrection is empty', async () => {
    const node = new CorrectionNode(mockLlm([]));
    const result = await node.execute(makeState([makeJob()], ''));
    expect(result).toEqual({});
  });

  it('removes a job when LLM returns updated list without it', async () => {
    const jobs = [
      makeJob({ jobNumber: 'З-001' }),
      makeJob({ jobNumber: 'З-002' }),
    ];
    const updatedJobs = [makeJob({ jobNumber: 'З-002' })];
    const node = new CorrectionNode(mockLlm(updatedJobs));

    const result = await node.execute(makeState(jobs, 'remove job З-001'));

    expect(result.matchedJobs).toHaveLength(1);
    expect(result.matchedJobs![0].jobNumber).toBe('З-002');
    expect(result.pendingCorrection).toBe('');
  });

  it('adds a part when LLM returns job with extra part', async () => {
    const updatedJob = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-001',
          partName: 'Картридж тонерний',
          category: 'Витратні матеріали',
          price: 350,
          quantity: 1,
          compatibilityConfidence: 1,
          warningLevel: 0,
          comment: '',
        },
        {
          partId: 'ЗЧ-002',
          partName: 'Фотобарабан',
          category: 'Витратні матеріали',
          price: 500,
          quantity: 1,
          compatibilityConfidence: 1,
          warningLevel: 0,
          comment: '',
        },
      ],
      matchedTotal: 850,
    });
    const node = new CorrectionNode(mockLlm([updatedJob]));

    const result = await node.execute(
      makeState([makeJob()], 'add фотобарабан to job З-001'),
    );

    expect(result.matchedJobs![0].matchedParts).toHaveLength(2);
    expect(result.matchedJobs![0].matchedTotal).toBe(850);
    expect(result.pendingCorrection).toBe('');
  });

  it('changes part quantity when LLM returns updated quantity', async () => {
    const updatedJob = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-001',
          partName: 'Картридж тонерний',
          category: 'Витратні матеріали',
          price: 350,
          quantity: 3,
          compatibilityConfidence: 1,
          warningLevel: 0,
          comment: '',
        },
      ],
      matchedTotal: 1050,
    });
    const node = new CorrectionNode(mockLlm([updatedJob]));

    const result = await node.execute(
      makeState([makeJob()], 'set quantity of ЗЧ-001 to 3'),
    );

    expect(result.matchedJobs![0].matchedParts[0].quantity).toBe(3);
    expect(result.matchedJobs![0].matchedTotal).toBe(1050);
    expect(result.pendingCorrection).toBe('');
  });

  it('returns error when LLM response fails Zod validation', async () => {
    const node = new CorrectionNode(mockLlm([{ invalid: 'data' }]));

    const result = await node.execute(
      makeState([makeJob()], 'some correction'),
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain('CorrectionNode');
    expect(result.matchedJobs).toBeUndefined();
  });
});
