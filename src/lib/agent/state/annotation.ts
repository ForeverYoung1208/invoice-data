import { Annotation } from '@langchain/langgraph';
import { ETaskFileRole } from '../../constants';
import {
  IClientRow,
  IDevicePartRow,
  IJobRow,
  IPartRow,
} from '../../parsers/types';
import { IMatchedJob } from '../../output/types';

export interface IAgentTaskFileRef {
  role: ETaskFileRole;
  filePath: string;
  originalName: string;
}

export const InvoiceAgentStateAnnotation = Annotation.Root({
  taskId: Annotation<string>(),
  instructions: Annotation<string>({
    reducer: (_old, newInstr) => newInstr,
    default: () => '',
  }),
  taskFiles: Annotation<IAgentTaskFileRef[]>({
    reducer: (_old, newFiles) => newFiles,
    default: () => [],
  }),
  jobs: Annotation<IJobRow[]>({
    reducer: (_old, newJobs) => newJobs,
    default: () => [],
  }),
  clients: Annotation<IClientRow[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  parts: Annotation<IPartRow[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  devices: Annotation<IDevicePartRow[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  matchedJobs: Annotation<IMatchedJob[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  warnings: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  zipPath: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
});

export interface IBaseNode {
  execute(state: TInvoiceAgentState): Promise<Partial<TInvoiceAgentState>>;
}

export type TInvoiceAgentState = typeof InvoiceAgentStateAnnotation.State;
