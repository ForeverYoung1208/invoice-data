import { getGlobalDataSource } from '../db/dataSource';
import { Task } from '../db/entities/Task';
import { ETaskStatus } from '../constants';
import { CorrectionLog } from '../db/entities/CorrectionLog';
import { IsNull } from 'typeorm';

export class TaskService {
  async create(): Promise<Task> {
    const ds = await getGlobalDataSource();
    const task = ds
      .getRepository(Task)
      .create({ status: ETaskStatus.UPLOADED });
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
    status: ETaskStatus,
    errorMessage?: string | null,
  ): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).update(id, {
      status,
      errorMessage: errorMessage ?? null,
    });
  }

  async updateInstructions(
    id: string,
    instructions: string | null,
  ): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).update(id, { instructions });
  }

  async addCorrection(taskId: string, message: string): Promise<void> {
    const ds = await getGlobalDataSource();
    const correctionLogRepo = ds.getRepository(CorrectionLog);
    const correction = correctionLogRepo.create({ taskId, message });
    await correctionLogRepo.save(correction);
  }

  async loadPendingCorrection(taskId: string): Promise<CorrectionLog | null> {
    const ds = await getGlobalDataSource();
    return ds.getRepository(CorrectionLog).findOne({
      where: { taskId, appliedAt: IsNull() },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async markCorrectionApplied(correctionId: string): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds
      .getRepository(CorrectionLog)
      .update(correctionId, { appliedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    const ds = await getGlobalDataSource();
    await ds.getRepository(Task).delete(id);
  }
}
