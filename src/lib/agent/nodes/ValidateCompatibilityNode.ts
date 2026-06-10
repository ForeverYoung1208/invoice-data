import { IMatchedJob } from '../../output/types';
import { IDevicePartRow } from '../../parsers/types';
import { IBaseNode, TInvoiceAgentState } from '../state/annotation';

export class ValidateCompatibilityNode implements IBaseNode {
  execute(state: TInvoiceAgentState): Promise<Partial<TInvoiceAgentState>> {
    const matchedJobs = state.matchedJobs.map((job) =>
      this.validateJob(job, state.devices),
    );
    return Promise.resolve({ matchedJobs });
  }

  private validateJob(
    job: IMatchedJob,
    devices: IDevicePartRow[],
  ): IMatchedJob {
    const deviceRule = devices.find(
      (d) => d.model.toLowerCase() === job.deviceModel.toLowerCase(),
    );

    if (!deviceRule?.blacklistedParts) return job;

    const blacklist = deviceRule.blacklistedParts
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (blacklist.length === 0) return job;

    const warnings = [...job.warnings];
    const matchedParts = job.matchedParts.map((part) => {
      const isBlacklisted = blacklist.some(
        (entry) =>
          part.partId.toLowerCase().includes(entry) ||
          part.partName.toLowerCase().includes(entry),
      );

      if (isBlacklisted) {
        const msg = `Part "${part.partName}" (${part.partId}) is blacklisted for ${job.deviceType} ${job.deviceModel}`;
        console.warn(`[ValidateCompatibilityNode] ${msg}`);
        warnings.push(msg);
        return { ...part, warningLevel: 1 };
      }

      return part;
    });

    return { ...job, matchedParts, warnings };
  }
}
