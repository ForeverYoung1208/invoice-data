import 'reflect-metadata';
import { DataSource } from 'typeorm';
import ormConfigData from '../../../typeorm.config';

// Cache on global to survive Next.js HMR hot reloads in dev
declare global {
  var __dataSource: DataSource | undefined;
}

function createDataSource(): DataSource {
  return new DataSource(ormConfigData);
}

export async function getGlobalDataSource(): Promise<DataSource> {
  if (!global.__dataSource) {
    global.__dataSource = createDataSource();
  }
  if (!global.__dataSource.isInitialized) {
    await global.__dataSource.initialize();
  }
  return global.__dataSource;
}

const DataSourceInstance = new DataSource(ormConfigData);
export default DataSourceInstance;
