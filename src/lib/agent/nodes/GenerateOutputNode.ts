import { join } from 'path';
import { TaskResultRepository } from '../../db/repositories/TaskResultRepository';
import { Logger } from '../../logger';
import { OutputZipper } from '../../output/OutputZipper';
import { IClientInvoiceData, IOutputData } from '../../output/types';
import { IClientRow } from '../../parsers/types';
import { ConfigService } from '../../services/ConfigService';
import { IBaseNode, TInvoiceAgentState } from '../state/annotation';

export class GenerateOutputNode implements IBaseNode {
  private readonly logger = new Logger('GenerateOutputNode');
  constructor(
    private readonly taskResultRepository: TaskResultRepository,
    private readonly configService: ConfigService,
    private readonly outputZipper: OutputZipper,
  ) {}

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

      const { templatePath, dataDir, outputDir } =
        this.configService.getConfig();
      const outputDirPath = join(dataDir, outputDir, state.taskId);
      const zipPath = await this.outputZipper.assemble(
        outputData,
        clientInvoices,
        outputDirPath,
        templatePath,
      );

      await this.taskResultRepository.create(state.taskId, outputData, zipPath);

      this.logger.info(`ZIP created at ${zipPath}`);
      return { zipPath };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`failed: ${msg}`);
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
