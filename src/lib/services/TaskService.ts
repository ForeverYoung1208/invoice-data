import { getGlobalDataSource } from '../db/dataSource';
import { Task } from '../db/entities/Task';
import { TaskStatus } from '../db/enums';
import { CorrectionLog } from '../db/entities/CorrectionLog';

export class TaskService {
  async create(): Promise<Task> {
    const ds = await getGlobalDataSource();
    const task = ds.getRepository(Task).create({ status: TaskStatus.UPLOADED });
    return ds.getRepository(Task).save(task);
  }

  async findAll(): Promise<Task[]> {
    const ds = await getGlobalDataSource();
    return ds.getRepository(Task).find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Task | null> {
    const ds = await getGlobalDataSource();
    return ds.getRepository(Task).findOne({
      where: { id },
      relations: ['files', 'results', 'corrections'],
    });
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    errorMessage?: string,
  ): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).update(id, {
      status,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    });
  }

  async updateInstructions(id: string, instructions: string): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).update(id, { instructions });
  }

  async addCorrection(taskId: string, message: string): Promise<void> {
    const ds = await getGlobalDataSource();
    const correctionLogRepo = ds.getRepository(CorrectionLog);
    const correction = correctionLogRepo.create({
      taskId,
      message,
    });
    await correctionLogRepo.save(correction);
  }

  async delete(id: string): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).delete(id);
  }
}
