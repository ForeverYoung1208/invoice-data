import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppliedAtToCorrectionLog1782465088748 implements MigrationInterface {
  name = 'AddAppliedAtToCorrectionLog1782465088748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "correction_logs" ADD "appliedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "correction_logs" DROP COLUMN "appliedAt"`,
    );
  }
}
