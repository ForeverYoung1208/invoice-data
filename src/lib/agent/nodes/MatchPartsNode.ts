import { LlmAdapter } from '../../llm/LlmAdapter';
import { IJobRow, IPartRow } from '../../parsers/types';
import { IMatchedJob, IMatchedPart } from '../../output/types';
import { IBaseNode, TInvoiceAgentState } from '../state/annotation';

export class MatchPartsNode implements IBaseNode {
  constructor(private readonly llm: LlmAdapter) {}

  async execute(
    state: TInvoiceAgentState,
  ): Promise<Partial<TInvoiceAgentState>> {
    // Return via errors[] rather than throwing: LangGraph nodes accumulate
    // errors in state so the graph can complete and the worker can persist
    // a meaningful error message to the DB. A throw here would crash
    // graph.invoke() and lose context.
    if (state.jobs.length === 0) {
      return { errors: ['MatchPartsNode: no jobs to process'] };
    }

    const matchedJobs: IMatchedJob[] = [];
    const errors: string[] = [];

    for (const job of state.jobs) {
      try {
        matchedJobs.push(
          await this.matchJob(job, state.parts, state.instructions),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[MatchPartsNode] job ${job.jobNumber} failed: ${msg}`);
        errors.push(`job ${job.jobNumber}: ${msg}`);
        matchedJobs.push(emptyJob(job));
      }
    }

    console.log(
      `[MatchPartsNode] ${matchedJobs.length} jobs matched, ${errors.length} errors`,
    );
    return { matchedJobs, ...(errors.length ? { errors } : {}) };
  }

  private async matchJob(
    job: IJobRow,
    catalog: IPartRow[],
    instructions: string,
  ): Promise<IMatchedJob> {
    const catalogText = catalog
      .map(
        (p) =>
          `${p.partId} | ${p.name} | ${p.category} | ${p.salePrice}₴ | ${p.inStock}`,
      )
      .join('\n');

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a repair-shop invoicing assistant. Match spare parts from the catalog to the repair job. ' +
          'Return ONLY a raw JSON array (no markdown). Each element: ' +
          '{ "partId": string, "partName": string, "category": string, "price": number, "quantity": number, "isUncertain": boolean, "comment": string }. ' +
          '"isUncertain" = true when the match is ambiguous. "comment" explains uncertainty or is empty string. ' +
          (instructions ? `Extra instructions: ${instructions}` : ''),
      },
      {
        role: 'user' as const,
        content:
          `Job: ${job.jobNumber} | Device: ${job.deviceType} ${job.model}\n` +
          `Fault: ${job.faultDescription}\nNotes: ${job.notes}\n\n` +
          `Catalog:\n${catalogText}`,
      },
    ];

    const raw = await this.llm.generateJson<IMatchedPart[]>(messages, {
      temperature: 0,
    });
    const parts: IMatchedPart[] = (Array.isArray(raw) ? raw : []).map((p) => ({
      partId: String(p.partId ?? ''),
      partName: String(p.partName ?? ''),
      category: String(p.category ?? ''),
      price: Number(p.price ?? 0),
      quantity: Number(p.quantity ?? 1),
      isUncertain: Boolean(p.isUncertain),
      warningLevel: 0, // TODO: Think about using llm certainty level as basis for warning level.
      comment: p.comment ?? '',
    }));

    const matchedTotal = parts.reduce((s, p) => s + p.price * p.quantity, 0);
    const flags = parts.filter((p) => p.isUncertain).map(() => '⚠️ Невпевнено');

    return {
      jobNumber: job.jobNumber,
      jobDate: job.date,
      clientName: job.clientName,
      deviceType: job.deviceType,
      deviceModel: job.model,
      faultDescription: job.faultDescription,
      jobStatus: job.status,
      originalCost: Number(job.repairCost) || 0,
      matchedParts: parts,
      flags,
      warnings: [],
      matchedTotal,
    };
  }
}

function emptyJob(job: IJobRow): IMatchedJob {
  return {
    jobNumber: job.jobNumber,
    jobDate: job.date,
    clientName: job.clientName,
    deviceType: job.deviceType,
    deviceModel: job.model,
    faultDescription: job.faultDescription,
    jobStatus: job.status,
    originalCost: Number(job.repairCost) || 0,
    matchedParts: [],
    flags: [],
    warnings: ['LLM matching failed'],
    matchedTotal: 0,
  };
}
