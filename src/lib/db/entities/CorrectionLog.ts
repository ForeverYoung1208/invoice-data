import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import type { Task } from './Task';
import type { TResultJsonDto } from '../../contracts/schemas/task.schema';

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

  @Column({ type: 'timestamptz', nullable: true, default: null })
  appliedAt: Date | null;

  @ManyToOne('Task', 'corrections', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  taskId: string;
}
