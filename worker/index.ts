import 'reflect-metadata';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskService } from '@/lib/services/TaskService';
import { ETaskStatus } from '@/lib/constants';

const POLL_INTERVAL_MS = 5000;

class WorkerService {
  constructor(private readonly taskService: TaskService) {}

  async processNext(): Promise<void> {
    const ds = await getGlobalDataSource();

    await ds.transaction(async (em) => {
      const task = await em
        .createQueryBuilder()
        .select('task')
        .from('tasks', 'task')
        .where('task.status = :status', { status: ETaskStatus.QUEUED })
        .setLock('pessimistic_write_or_fail')
        .getOne();

      if (!task) return;

      await em.update('tasks', task.id, { status: ETaskStatus.PROCESSING });
      console.log(`[worker] picked up task ${task.id}`);

      // TODO: invoke InvoiceAgent (Task 6)
      await this.taskService.updateStatus(
        task.id,
        ETaskStatus.FAILED,
        'Agent not yet implemented',
      );
    });
  }

  start(): void {
    console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms');
    const poll = async () => {
      try {
        await this.processNext();
      } catch (err) {
        console.error('[worker] error:', err);
      } finally {
        setTimeout(() => {
          void poll();
        }, POLL_INTERVAL_MS);
      }
    };
    void poll();
  }
}

async function main() {
  await getGlobalDataSource();
  const worker = new WorkerService(new TaskService());
  worker.start();
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
