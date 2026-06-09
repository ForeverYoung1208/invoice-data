import path from 'path';
import { ParseNode } from '../../../src/lib/agent/nodes/ParseNode';
import { ETaskFileRole } from '../../../src/lib/constants';
import { TInvoiceAgentState } from '../../../src/lib/agent/state/annotation';

const FIXTURES = path.join(__dirname, '../../fixtures/mock-data');

const makeState = (
  overrides: Partial<TInvoiceAgentState['taskFiles'][0]>[] = [],
): TInvoiceAgentState => ({
  taskId: 'test-task',
  instructions: '',
  taskFiles: overrides.length
    ? (overrides as TInvoiceAgentState['taskFiles'])
    : [
        {
          role: ETaskFileRole.JOBS,
          filePath: path.join(FIXTURES, 'jobs.csv'),
          originalName: 'jobs.csv',
        },
        {
          role: ETaskFileRole.CLIENTS,
          filePath: path.join(FIXTURES, 'clients.csv'),
          originalName: 'clients.csv',
        },
        {
          role: ETaskFileRole.PARTS,
          filePath: path.join(FIXTURES, 'parts.csv'),
          originalName: 'parts.csv',
        },
        {
          role: ETaskFileRole.DEVICES,
          filePath: path.join(FIXTURES, 'devices.csv'),
          originalName: 'devices.csv',
        },
      ],
  jobs: [],
  clients: [],
  parts: [],
  devices: [],
  matchedJobs: [],
  warnings: [],
  errors: [],
  zipPath: null,
});

describe('ParseNode', () => {
  let node: ParseNode;

  beforeEach(() => {
    node = new ParseNode();
  });

  it('parses all 4 CSV files and returns populated arrays', async () => {
    const result = await node.execute(makeState());

    expect(result.jobs?.length).toBeGreaterThan(0);
    expect(result.clients?.length).toBeGreaterThan(0);
    expect(result.parts?.length).toBeGreaterThan(0);
    expect(result.devices?.length).toBeGreaterThan(0);
    expect(result.errors).toBeUndefined();
  });

  it('returns errors when a required role is missing', async () => {
    // Only provide JOBS — the other 3 are missing
    const state = makeState([
      {
        role: ETaskFileRole.JOBS,
        filePath: path.join(FIXTURES, 'jobs.csv'),
        originalName: 'jobs.csv',
      },
    ]);

    const result = await node.execute(state);

    expect(result.errors?.length).toBe(3);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(ETaskFileRole.CLIENTS),
        expect.stringContaining(ETaskFileRole.PARTS),
        expect.stringContaining(ETaskFileRole.DEVICES),
      ]),
    );
  });

  it('returns an error when a file is empty', async () => {
    const state = makeState([
      {
        role: ETaskFileRole.JOBS,
        filePath: path.join(
          __dirname,
          '../../fixtures/edge_cases/empty_jobs.csv',
        ),
        originalName: 'jobs.csv',
      },
      {
        role: ETaskFileRole.CLIENTS,
        filePath: path.join(FIXTURES, 'clients.csv'),
        originalName: 'clients.csv',
      },
      {
        role: ETaskFileRole.PARTS,
        filePath: path.join(FIXTURES, 'parts.csv'),
        originalName: 'parts.csv',
      },
      {
        role: ETaskFileRole.DEVICES,
        filePath: path.join(FIXTURES, 'devices.csv'),
        originalName: 'devices.csv',
      },
    ]);

    const result = await node.execute(state);

    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]).toContain('jobs');
  });
});
