import { join } from 'path';

import { TaskResultRepository } from '../../db/repositories/TaskResultRepository';
import { OutputZipper } from '../../output/OutputZipper';
import { IClientInvoiceData, IOutputData } from '../../output/types';
import { IClientRow } from '../../parsers/types';
import { IBaseNode, TInvoiceAgentState } from '../state/annotation';

export class GenerateOutputNode implements IBaseNode {
  constructor(private readonly taskResultRepository: TaskResultRepository) {}

  async execute(
    state: TInvoiceAgentState,
  ): Promise<Partial<TInvoiceAgentState>> {
    if (state.matchedJobs.length === 0) {
      return {
        errors: ['GenerateOutputNode: no matched jobs to generate output for'],
      };
    }

    try {
      const outputData: IOutputData = {
        generationDate: new Date().toISOString(),
        matchedJobs: state.matchedJobs,
        instructions: state.instructions || undefined,
      };

      const clientInvoices = this.buildClientInvoices(
        outputData,
        state.clients,
      );

      const dataDir = process.env.DATA_DIR; // TODO: Move to the config service and add validation there.
      if (!dataDir) throw new Error('DATA_DIR environment variable is not set');

      const outputDir = join(dataDir, 'output', state.taskId);
      const templatePath = join(dataDir, 'invoice_template.csv'); // TODO: Move to the config service and add validation there.

      const zipper = new OutputZipper();
      const zipPath = await zipper.assemble(
        outputData,
        clientInvoices,
        outputDir,
        templatePath,
      );

      await this.taskResultRepository.create(state.taskId, outputData, zipPath);

      console.log(`[GenerateOutputNode] ZIP created at ${zipPath}`); // TODO: create a custom logger and use it.
      return { zipPath };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[GenerateOutputNode] failed: ${msg}`); // TODO: create a custom logger and use it.
      return { errors: [msg] };
    }
  }

  private buildClientInvoices(
    outputData: IOutputData,
    clients: IClientRow[],
  ): IClientInvoiceData[] {
    const clientMap = new Map(clients.map((c) => [c.fullName, c]));

    const grouped = new Map<string, IClientInvoiceData>();

    for (const job of outputData.matchedJobs) {
      if (!grouped.has(job.clientName)) {
        const client = clientMap.get(job.clientName);
        grouped.set(job.clientName, {
          clientName: job.clientName,
          address: client?.address ?? '',
          phone: client?.phone ?? '',
          email: client?.email ?? '',
          matchedJobs: [],
          invoiceDate: outputData.generationDate,
          grandTotal: 0,
          allNotes: [],
        });
      }

      const entry = grouped.get(job.clientName)!;
      entry.matchedJobs.push(job);
      entry.grandTotal += job.matchedTotal;
    }

    return Array.from(grouped.values());
  }
}
