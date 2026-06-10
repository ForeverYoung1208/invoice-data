import {
  CompiledStateGraph,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';

import { TaskResultRepository } from '../db/repositories/TaskResultRepository';
import { LlmAdapter } from '../llm/LlmAdapter';
import { TaskService } from '../services/TaskService';
import { GenerateOutputNode } from './nodes/GenerateOutputNode';
import { MatchPartsNode } from './nodes/MatchPartsNode';
import { ParseNode } from './nodes/ParseNode';
import { ValidateCompatibilityNode } from './nodes/ValidateCompatibilityNode';
import {
  IAgentTaskFileRef,
  InvoiceAgentStateAnnotation,
  TInvoiceAgentState,
} from './state/annotation';

export class InvoiceAgent {
  private readonly graph: CompiledStateGraph<any, any, any>;

  constructor(
    private readonly taskService: TaskService,
    readonly llmAdapter: LlmAdapter,
    readonly taskResultRepository: TaskResultRepository,
  ) {
    const parseNode = new ParseNode();
    const matchNode = new MatchPartsNode(llmAdapter);
    const validateNode = new ValidateCompatibilityNode();
    const generateNode = new GenerateOutputNode(taskResultRepository);

    const graph = new StateGraph(InvoiceAgentStateAnnotation)
      .addNode('parse', (s) => parseNode.execute(s))
      .addNode('match', (s) => matchNode.execute(s))
      .addNode('validate', (s) => validateNode.execute(s))
      .addNode('generate', (s) => generateNode.execute(s))
      .addEdge(START, 'parse')
      .addEdge('parse', 'match')
      .addEdge('match', 'validate')
      .addEdge('validate', 'generate')
      .addEdge('generate', END);

    this.graph = graph.compile();
  }

  async run(taskId: string, instructions: string): Promise<TInvoiceAgentState> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const taskFiles: IAgentTaskFileRef[] = task.files.map((f) => ({
      role: f.role,
      filePath: f.filePath,
      originalName: f.originalName,
    }));

    const initialState: Partial<TInvoiceAgentState> = {
      taskId,
      instructions,
      taskFiles,
    };

    return this.graph.invoke(initialState) as Promise<TInvoiceAgentState>;
  }

  hasErrors(state: TInvoiceAgentState): boolean {
    return state.errors.length > 0;
  }
}
