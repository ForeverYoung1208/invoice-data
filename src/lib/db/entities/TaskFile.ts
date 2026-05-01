import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskFileRole } from '../enums';

import type { Task } from './Task';

@Entity('task_files')
export class TaskFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TaskFileRole })
  role: TaskFileRole;

  @Column({ type: 'varchar', length: 2048 })
  filePath: string;

  @Column({ type: 'varchar', length: 2048 })
  originalName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Task', 'files', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  taskId: string;
}
