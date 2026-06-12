import 'reflect-metadata';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { Task } from '@/lib/db/entities/Task';
import { TaskService } from '@/lib/services/TaskService';
import { InvoiceAgent } from '@/lib/agent/InvoiceAgent';
import { ETaskStatus } from '@/lib/constants';
import { invoiceAgent, taskService } from '@/lib/container';

const POLL_INTERVAL_MS = 5000;

class WorkerService {
  constructor(
    private readonly taskService: TaskService,
    private readonly invoiceAgent: InvoiceAgent,
  ) {}

  async processNext(): Promise<void> {
    const ds = await getGlobalDataSource();

    await ds.transaction(async (em) => {
      const task = await em
        .createQueryBuilder(Task, 'task')
        .where('task.status = :status', { status: ETaskStatus.QUEUED })
        .setLock('pessimistic_write_or_fail')
        .getOne();

      if (!task) return;

      await em.update(Task, task.id, { status: ETaskStatus.PROCESSING });
      console.log(`[worker] picked up task ${task.id}`); // todo: move to logger.

      try {
        const state = await this.invoiceAgent.run(
          task.id,
          task.instructions ?? '',
        );

        const hasErrors = this.invoiceAgent.hasErrors(state);
        await this.taskService.updateStatus(
          task.id,
          hasErrors ? ETaskStatus.FAILED : ETaskStatus.REVIEW,
          hasErrors ? state.errors.join('; ') : undefined,
        );
        console.log(
          `[worker] task ${task.id} → ${hasErrors ? ETaskStatus.FAILED : ETaskStatus.REVIEW}`, // todo: move to logger.
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.taskService.updateStatus(task.id, ETaskStatus.FAILED, msg);
        console.error(`[worker] task ${task.id} failed:`, err); // todo: move to logger.
      }
    });
  }

  start(): void {
    console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms');
    const poll = async () => {
      try {
        await this.processNext();
      } catch (err) {
        console.error('[worker] poll error:', err);
      } finally {
        setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };
    void poll();
  }
}

async function main() {
  await getGlobalDataSource();
  const worker = new WorkerService(taskService, invoiceAgent);
  worker.start();
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
