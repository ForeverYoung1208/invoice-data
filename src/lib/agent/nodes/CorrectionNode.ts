import { z } from 'zod';
import { LlmAdapter } from '../../llm/LlmAdapter';
import { IMatchedJob } from '../../output/types';
import { IBaseNode, TInvoiceAgentState } from '../state/annotation';
import { Logger } from '../../logger';

const matchedPartSchema = z.object({
  partId: z.string(),
  partName: z.string(),
  category: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  compatibilityConfidence: z.number().min(0).max(1),
  warningLevel: z.number().min(0).max(1),
  comment: z.string().optional(),
});

const matchedJobSchema = z.object({
  jobNumber: z.string(),
  jobDate: z.string(),
  clientName: z.string(),
  deviceType: z.string(),
  deviceModel: z.string(),
  faultDescription: z.string(),
  jobStatus: z.string(),
  originalCost: z.number(),
  matchedParts: z.array(matchedPartSchema),
  warnings: z.array(z.string()),
  matchedTotal: z.number(),
});

const correctionResultSchema = z.array(matchedJobSchema);

export class CorrectionNode implements IBaseNode {
  private readonly logger = new Logger('CorrectionNode');

  constructor(private readonly llm: LlmAdapter) {}

  async execute(
    state: TInvoiceAgentState,
  ): Promise<Partial<TInvoiceAgentState>> {
    if (!state.pendingCorrection) {
      return {};
    }

    const partsCatalog = state.parts
      .map(
        (p) =>
          `${p.partId} | ${p.name} | ${p.category} | ${p.salePrice} UAH | stock: ${p.inStock}`,
      )
      .join('\n');

    // TODO: optimize — pass only devices relevant to the current jobs.
    // Exact model name matching (jobModels.has(d.model)) is unreliable because
    // job model names from the CSV may differ from catalog entries (abbreviations,
    // typos, partial names). Consider fuzzy matching or a separate lookup step.
    const deviceCatalog = state.devices
      .map(
        (d) =>
          `${d.deviceType} | ${d.model} | typical: ${d.typicalParts} | blacklisted: ${d.blacklistedParts}`,
      )
      .join('\n');

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a repair-shop invoicing assistant. You will receive a JSON array of matched invoice jobs (a draft) and a correction instruction from the user. ' +
          'Apply the correction as requested. Supported operations: remove a job, add/remove/move a part between jobs, change part quantity, add a new part, etc. ' +
          'After applying the correction, recalculate matchedTotal for each affected job (sum of price * quantity for all matchedParts). ' +
          'The user may intentionally add blacklisted or non-typical parts — follow the instruction regardless, but set an appropriate comment on the part if it conflicts with device rules. ' +
          'When adding a new part, look it up from the spare parts catalog and use its exact partId, name, category and salePrice. ' +
          'Return ONLY the full updated JSON array with the same structure — no markdown, no additional explanation (only appropriate comments are allowed in the JSON structure).\n\n' +
          'Note that the user might refer to the job by mentioning the part of its number. for example for the job "З-2026-0130" the user might say "job 130"' +
          (partsCatalog
            ? `Spare parts catalog (partId | name | category | price | stock):\n${partsCatalog}\n\n`
            : '') +
          (deviceCatalog
            ? `Device compatibility rules (deviceType | model | typicalParts | blacklistedParts):\n${deviceCatalog}`
            : ''),
      },
      {
        role: 'user' as const,
        content:
          `Current invoice data:\n${JSON.stringify(state.matchedJobs, null, 2)}\n\n` +
          `Correction: ${state.pendingCorrection}`,
      },
    ];

    const raw = await this.llm.generateJson<IMatchedJob[]>(messages, {
      temperature: 0,
    });

    const parsed = correctionResultSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(
        `LLM returned invalid correction data: ${parsed.error.message}`,
      );
      return {
        errors: [
          `CorrectionNode: invalid LLM response: ${parsed.error.message}`,
        ],
      };
    }

    this.logger.info(`Correction applied: "${state.pendingCorrection}"`);

    return {
      matchedJobs: parsed.data,
      pendingCorrection: '',
    };
  }
}
