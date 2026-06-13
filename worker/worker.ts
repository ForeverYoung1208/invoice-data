import 'reflect-metadata';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { Task } from '@/lib/db/entities/Task';
import { TaskService } from '@/lib/services/TaskService';
import { InvoiceAgent } from '@/lib/agent/InvoiceAgent';
import { ETaskStatus } from '@/lib/constants';
import { configService, invoiceAgent, taskService } from '@/lib/container';
import { ConfigService } from '@/lib/services/ConfigService';

class WorkerService {
  constructor(
    private readonly taskService: TaskService,
    private readonly invoiceAgent: InvoiceAgent,
    private readonly configService: ConfigService,
  ) {}

  async processNext(): Promise<void> {
    const ds = await getGlobalDataSource();

    const taskId = await ds.transaction(async (em) => {
      const task = await em
        .createQueryBuilder(Task, 'task')
        .where('task.status = :status', { status: ETaskStatus.QUEUED })
        .setLock('pessimistic_write_or_fail')
        .getOne();

      if (!task) {
        console.log('[worker] no tasks to process');
        return null;
      }

      await em.update(Task, task.id, { status: ETaskStatus.PROCESSING });
      console.log(`[worker] picked up task ${task.id}`);
      return task.id;
    });

    if (!taskId) return;

    try {
      const task = await this.taskService.findById(taskId);
      const state = await this.invoiceAgent.run(
        taskId,
        task?.instructions ?? '',
      );

      const hasErrors = this.invoiceAgent.hasErrors(state);
      await this.taskService.updateStatus(
        taskId,
        hasErrors ? ETaskStatus.FAILED : ETaskStatus.REVIEW,
        hasErrors ? state.errors.join('; ') : undefined,
      );
      console.log(
        `[worker] task ${taskId} → ${hasErrors ? ETaskStatus.FAILED : ETaskStatus.REVIEW}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.taskService.updateStatus(taskId, ETaskStatus.FAILED, msg);
      console.error(`[worker] task ${taskId} failed:`, err);
    }
  }

  start(): void {
    const { pollIntervalMs } = this.configService.getConfig();
    console.log('[worker] starting, polling every', pollIntervalMs, 'ms');
    const poll = async () => {
      try {
        await this.processNext();
      } catch (err) {
        console.error('[worker] poll error:', err);
      } finally {
        setTimeout(() => void poll(), pollIntervalMs);
      }
    };
    void poll();
  }
}

async function main() {
  await getGlobalDataSource();
  const worker = new WorkerService(taskService, invoiceAgent, configService);
  worker.start();
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
