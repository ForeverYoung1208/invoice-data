import { getGlobalDataSource } from '../dataSource';
import { TaskResult } from '../entities/TaskResult';
import { IOutputData } from '../../output/types';

export class TaskResultRepository {
  private async repo() {
    return (await getGlobalDataSource()).getRepository(TaskResult);
  }

  async create(
    taskId: string,
    outputData: IOutputData,
    zipPath: string,
  ): Promise<TaskResult> {
    const repo = await this.repo();
    const entity = repo.create({
      taskId,
      resultJson: outputData as object,
      zipPath,
    });
    await repo.save(entity);
    return entity;
  }

  async findLatestByTaskId(taskId: string): Promise<TaskResult | null> {
    const repo = await this.repo();
    return repo.findOne({ where: { taskId }, order: { createdAt: 'DESC' } });
  }
}
