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
import { Task } from './Task';

@Entity('task_files')
export class TaskFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TaskFileRole })
  role: TaskFileRole;

  @Column()
  filePath: string;

  @Column()
  originalName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Task, (t) => t.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  taskId: string;
}
