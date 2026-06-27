import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskRefAndTaskDate1782593134086 implements MigrationInterface {
  name = 'AddTaskRefAndTaskDate1782593134086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "taskRef" text`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "taskDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "taskRef"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "taskDate"`);
  }
}
