import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ETaskStatus } from '../../constants';
import { TaskFile } from './TaskFile';
import { TaskResult } from './TaskResult';
import { CorrectionLog } from './CorrectionLog';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ETaskStatus, default: ETaskStatus.UPLOADED })
  status: ETaskStatus;

  @Column({ type: 'text', nullable: true })
  taskRef: string | null;

  @Column({ type: 'date', nullable: true })
  taskDate: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskFile, (f) => f.task, { cascade: true })
  files: TaskFile[];

  @OneToMany(() => TaskResult, (r) => r.task, { cascade: true })
  results: TaskResult[];

  @OneToMany(() => CorrectionLog, (c) => c.task, { cascade: true })
  corrections: CorrectionLog[];
}
