import {
  CompiledStateGraph,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';

import { TaskResultRepository } from '../db/repositories/TaskResultRepository';
import { LlmAdapter } from '../llm/LlmAdapter';
import { ConfigService } from '../services/ConfigService';
import { TaskService } from '../services/TaskService';
import { CorrectionNode } from './nodes/CorrectionNode';
import { GenerateOutputNode } from './nodes/GenerateOutputNode';
import { MatchPartsNode } from './nodes/MatchPartsNode';
import { ParseNode } from './nodes/ParseNode';
import { ValidateCompatibilityNode } from './nodes/ValidateCompatibilityNode';
import {
  IAgentTaskFileRef,
  InvoiceAgentStateAnnotation,
  TInvoiceAgentState,
} from './state/annotation';
import { OutputZipper } from '../output/OutputZipper';
import { IMatchedJob } from '../output/types';

export class InvoiceAgent {
  private readonly graph: CompiledStateGraph<any, any, any>;
  private readonly parseNode: ParseNode;

  constructor(
    private readonly taskService: TaskService,
    readonly llmAdapter: LlmAdapter,
    readonly taskResultRepository: TaskResultRepository,
    readonly configService: ConfigService,
    readonly outputZipper: OutputZipper,
  ) {
    const parseNode = new ParseNode(configService);
    this.parseNode = parseNode;
    const matchNode = new MatchPartsNode(llmAdapter);
    const validateNode = new ValidateCompatibilityNode();
    const correctionNode = new CorrectionNode(llmAdapter);
    const generateNode = new GenerateOutputNode(
      taskResultRepository,
      configService,
      outputZipper,
    );

    const graph = new StateGraph(InvoiceAgentStateAnnotation)
      .addNode('parse', (s) => parseNode.execute(s))
      .addNode('match', (s) => matchNode.execute(s))
      .addNode('validate', (s) => validateNode.execute(s))
      .addNode('correct', (s) => correctionNode.execute(s))
      .addNode('generate', (s) => generateNode.execute(s))
      .addConditionalEdges(START, (s) =>
        s.pendingCorrection ? 'correct' : 'parse',
      )
      .addEdge('parse', 'match')
      .addEdge('match', 'validate')
      .addEdge('validate', 'generate')
      .addEdge('correct', 'generate')
      .addEdge('generate', END);

    this.graph = graph.compile();
  }

  async run(taskId: string, instructions: string): Promise<TInvoiceAgentState> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const taskFiles: IAgentTaskFileRef[] = task.files.map((f) => ({
      role: f.role,
      fileName: f.fileName,
      originalName: f.originalName,
    }));

    // Load oldest unapplied correction (FIFO)
    const pendingCorrection =
      await this.taskService.loadPendingCorrection(taskId);

    let correctionText: string | undefined;
    let matchedJobs: IMatchedJob[] | undefined;
    let parsedState: Partial<TInvoiceAgentState> = {};

    if (pendingCorrection) {
      // Load previous matchedJobs so CorrectionNode has something to work on
      const latestResult =
        await this.taskResultRepository.findLatestByTaskId(taskId);
      const outputData = latestResult?.resultJson as {
        matchedJobs?: IMatchedJob[];
      } | null;
      matchedJobs = outputData?.matchedJobs ?? [];
      correctionText = pendingCorrection.message;

      // Parse parts & devices so CorrectionNode has full catalog context
      const baseState: Partial<TInvoiceAgentState> = {
        taskId,
        instructions,
        taskFiles,
      };
      parsedState = await this.parseNode.execute(
        baseState as TInvoiceAgentState,
      );
    }

    const initialState: Partial<TInvoiceAgentState> = {
      taskId,
      instructions,
      taskFiles,
      ...(correctionText && matchedJobs
        ? { pendingCorrection: correctionText, matchedJobs, ...parsedState }
        : {}),
    };

    const result = (await this.graph.invoke(
      initialState,
    )) as TInvoiceAgentState;

    if (pendingCorrection && !result.errors.length) {
      await this.taskService.markCorrectionApplied(pendingCorrection.id);
    }

    return result;
  }

  hasErrors(state: TInvoiceAgentState): boolean {
    return state.errors.length > 0;
  }
}
