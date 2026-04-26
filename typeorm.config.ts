import { config } from 'dotenv';
import 'reflect-metadata';
import type { DataSourceOptions } from 'typeorm';
import path from 'path';

config();
const {
  TYPEORM_HOST,
  TYPEORM_PORT,
  TYPEORM_DATABASE,
  TYPEORM_USERNAME,
  TYPEORM_PASSWORD,
} = process.env;
if (
  !TYPEORM_HOST ||
  !TYPEORM_PORT ||
  !TYPEORM_DATABASE ||
  !TYPEORM_USERNAME ||
  !TYPEORM_PASSWORD
) {
  const nullish = [
    { TYPEORM_HOST },
    { TYPEORM_PORT },
    { TYPEORM_DATABASE },
    { TYPEORM_USERNAME },
    { TYPEORM_PASSWORD },
  ].filter((v) => !Object.values(v)[0]);
  throw new Error(
    `Missing env variables: ${nullish.map((v) => Object.keys(v)[0]).join(', ')}`,
  );
}

const DataSourceOptions: DataSourceOptions = {
  type: 'postgres' as const,
  host: process.env.TYPEORM_HOST,
  port: Number(TYPEORM_PORT),
  database: process.env.TYPEORM_DATABASE,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  entities: [path.join(__dirname, 'src/lib/db/entities/*.{ts,js}')],
  migrations: [path.join(__dirname, 'src/lib/db/migrations/*.{ts,js}')],
  synchronize: false,
};

export default DataSourceOptions;
