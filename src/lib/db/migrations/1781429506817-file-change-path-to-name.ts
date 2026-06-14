import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1781429506817 implements MigrationInterface {
  name = 'Migrations1781429506817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_files" RENAME COLUMN "filePath" TO "fileName"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_files" RENAME COLUMN "fileName" TO "filePath"`,
    );
  }
}
