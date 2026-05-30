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

@Entity('correction_logs')
export class CorrectionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  resultSnapshotBefore: TResultJsonDto | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Task', 'corrections', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  taskId: string;
}
