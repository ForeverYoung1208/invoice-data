import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixColumnTypes1777228738248 implements MigrationInterface {
  name = 'FixColumnTypes1777228738248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_files" DROP COLUMN "filePath"`);
    await queryRunner.query(
      `ALTER TABLE "task_files" ADD "filePath" character varying(2048) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_files" DROP COLUMN "originalName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_files" ADD "originalName" character varying(2048) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_files" DROP COLUMN "originalName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_files" ADD "originalName" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "task_files" DROP COLUMN "filePath"`);
    await queryRunner.query(
      `ALTER TABLE "task_files" ADD "filePath" character varying NOT NULL`,
    );
  }
}
