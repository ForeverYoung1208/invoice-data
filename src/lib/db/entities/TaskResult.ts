import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './Task';

@Entity('task_results')
export class TaskResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  resultJson: object;

  @Column({ type: 'text', nullable: true })
  zipPath: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Task, (t) => t.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  taskId: string;
}
