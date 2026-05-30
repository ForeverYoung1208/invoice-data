import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import type { Task } from './Task';
import { TResultJsonDto } from '../../contracts/schemas/task.schema';

@Entity('task_results')
export class TaskResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  resultJson: TResultJsonDto;

  @Column({ type: 'text', nullable: true })
  zipPath: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Task', 'results', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  taskId: string;
}
