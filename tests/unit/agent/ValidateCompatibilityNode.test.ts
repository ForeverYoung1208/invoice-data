import { ValidateCompatibilityNode } from '../../../src/lib/agent/nodes/ValidateCompatibilityNode';
import { TInvoiceAgentState } from '../../../src/lib/agent/state/annotation';
import { IMatchedJob } from '../../../src/lib/output/types';
import { IDevicePartRow } from '../../../src/lib/parsers/types';

const makeJob = (overrides: Partial<IMatchedJob> = {}): IMatchedJob => ({
  jobNumber: 'З-001',
  jobDate: '2026-05-10',
  clientName: 'Test Client',
  deviceType: 'Ноутбук',
  deviceModel: 'ASUS VivoBook X515',
  faultDescription: 'Test fault',
  jobStatus: 'Виконано',
  originalCost: 0,
  matchedParts: [],
  warnings: [],
  matchedTotal: 0,
  ...overrides,
});

const makeDevice = (
  overrides: Partial<IDevicePartRow> = {},
): IDevicePartRow => ({
  category: 'Ноутбук',
  brand: 'ASUS',
  model: 'ASUS VivoBook X515',
  deviceType: 'Ноутбук',
  repairComplexity: '2',
  repairTimeHours: '1',
  typicalParts: '',
  blacklistedParts: '',
  notes: '',
  ...overrides,
});

const makeState = (
  matchedJobs: IMatchedJob[],
  devices: IDevicePartRow[],
): TInvoiceAgentState => ({
  taskId: 'test',
  instructions: '',
  taskFiles: [],
  jobs: [],
  clients: [],
  parts: [],
  devices,
  matchedJobs,
  warnings: [],
  errors: [],
  zipPath: null,
  pendingCorrection: '',
});

describe('ValidateCompatibilityNode', () => {
  let node: ValidateCompatibilityNode;

  beforeEach(() => {
    node = new ValidateCompatibilityNode();
  });

  it('sets warningLevel=1 and adds warning for blacklisted part (matched by partId)', async () => {
    const job = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-БЖ-001',
          partName: 'Блок живлення',
          category: 'БЖ',
          price: 650,
          quantity: 1,
          compatibilityConfidence: 0.9,
          warningLevel: 0.1,
          comment: '',
        },
      ],
    });
    const device = makeDevice({ blacklistedParts: 'ЗЧ-БЖ-001, ЗЧ-ЕК-999' });

    const result = await node.execute(makeState([job], [device]));

    expect(result.matchedJobs![0].matchedParts[0].warningLevel).toBe(1);
    expect(result.matchedJobs![0].warnings).toHaveLength(1);
    expect(result.matchedJobs![0].warnings[0]).toContain('ЗЧ-БЖ-001');
  });

  it('sets warningLevel=1 for blacklisted part matched by partName', async () => {
    const job = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-БЖ-999',
          partName: 'Блок живлення ASUS',
          category: 'БЖ',
          price: 650,
          quantity: 1,
          compatibilityConfidence: 0.9,
          warningLevel: 0.1,
          comment: '',
        },
      ],
    });
    const device = makeDevice({ blacklistedParts: 'Блок живлення ASUS' });

    const result = await node.execute(makeState([job], [device]));

    expect(result.matchedJobs![0].matchedParts[0].warningLevel).toBe(1);
  });

  it('does not modify parts that are not blacklisted', async () => {
    const job = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-LED-018',
          partName: 'LED-стрічка',
          category: 'Світлодіоди',
          price: 580,
          quantity: 1,
          compatibilityConfidence: 1,
          warningLevel: 0,
          comment: '',
        },
      ],
    });
    const device = makeDevice({ blacklistedParts: 'ЗЧ-БЖ-001' });

    const result = await node.execute(makeState([job], [device]));

    expect(result.matchedJobs![0].matchedParts[0].warningLevel).toBe(0);
    expect(result.matchedJobs![0].warnings).toHaveLength(0);
  });

  it('returns job unchanged when no matching device rule found', async () => {
    const job = makeJob({ deviceModel: 'Unknown Model' });
    const device = makeDevice({
      model: 'ASUS VivoBook X515',
      blacklistedParts: 'ЗЧ-БЖ-001',
    });

    const result = await node.execute(makeState([job], [device]));

    expect(result.matchedJobs![0]).toEqual(job);
  });

  it('returns job unchanged when blacklistedParts is empty', async () => {
    const job = makeJob({
      matchedParts: [
        {
          partId: 'ЗЧ-БЖ-001',
          partName: 'Блок живлення',
          category: 'БЖ',
          price: 650,
          quantity: 1,
          compatibilityConfidence: 1,
          warningLevel: 0,
          comment: '',
        },
      ],
    });
    const device = makeDevice({ blacklistedParts: '' });

    const result = await node.execute(makeState([job], [device]));

    expect(result.matchedJobs![0].matchedParts[0].warningLevel).toBe(0);
    expect(result.matchedJobs![0].warnings).toHaveLength(0);
  });
});
