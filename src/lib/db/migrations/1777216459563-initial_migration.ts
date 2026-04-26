import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1777216459563 implements MigrationInterface {
  name = 'InitialMigration1777216459563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "passwordHash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."task_files_role_enum" AS ENUM('jobs', 'clients', 'parts', 'devices')`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."task_files_role_enum" NOT NULL, "filePath" character varying NOT NULL, "originalName" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "taskId" uuid NOT NULL, CONSTRAINT "PK_ef0155509609893f1c0cb9811a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "correction_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" text NOT NULL, "resultSnapshotBefore" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "taskId" uuid NOT NULL, CONSTRAINT "PK_9c849de3e5736c1845aaddfcdf8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('uploaded', 'queued', 'processing', 'review', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'uploaded', "instructions" text, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resultJson" jsonb NOT NULL, "zipPath" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "taskId" uuid NOT NULL, CONSTRAINT "PK_2af90d7705199563f820496cbfd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_files" ADD CONSTRAINT "FK_a2652bf7bcf7d691eb5da322729" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "correction_logs" ADD CONSTRAINT "FK_d77be252f59b1f1515ceca06dc9" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_results" ADD CONSTRAINT "FK_c933a534f2d681e1a90c943ab6e" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_results" DROP CONSTRAINT "FK_c933a534f2d681e1a90c943ab6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "correction_logs" DROP CONSTRAINT "FK_d77be252f59b1f1515ceca06dc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_files" DROP CONSTRAINT "FK_a2652bf7bcf7d691eb5da322729"`,
    );
    await queryRunner.query(`DROP TABLE "task_results"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(`DROP TABLE "correction_logs"`);
    await queryRunner.query(`DROP TABLE "task_files"`);
    await queryRunner.query(`DROP TYPE "public"."task_files_role_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
