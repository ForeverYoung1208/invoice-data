import 'reflect-metadata';
import { DataSource } from 'typeorm';
import ormConfigData from '../../../typeorm.config';

// Cache on global to survive Next.js HMR hot reloads in dev.
// We also track entity references so we can detect when HMR replaces
// the entity classes with new copies (which invalidates TypeORM metadata).
declare global {
  var __dataSource: DataSource | undefined;

  var __dataSourceEntities: unknown[] | undefined;
}

/**
 * Check whether the entity references the DataSource was built with
 * still match the ones in the current (possibly HMR-refreshed) config.
 */
function entitiesChanged(): boolean {
  const current = ormConfigData.entities as unknown[] | undefined;
  const cached = global.__dataSourceEntities;
  if (!cached || !current) return true;
  if (cached.length !== current.length) return true;
  return cached.some((entity, i) => entity !== current[i]);
}

function createDataSource(): DataSource {
  return new DataSource(ormConfigData);
}

// Serialize all getGlobalDataSource calls to prevent concurrent destroy/init races
let initPromise: Promise<DataSource> | null = null;

export async function getGlobalDataSource(): Promise<DataSource> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // If entities changed (HMR replaced class references), tear down and rebuild
      if (global.__dataSource && entitiesChanged()) {
        if (global.__dataSource.isInitialized) {
          await global.__dataSource.destroy();
        }
        global.__dataSource = undefined;
        global.__dataSourceEntities = undefined;
      }

      if (!global.__dataSource) {
        global.__dataSource = createDataSource();
        global.__dataSourceEntities = [
          ...((ormConfigData.entities as unknown[]) ?? []),
        ];
      }

      if (!global.__dataSource.isInitialized) {
        await global.__dataSource.initialize();
      }

      return global.__dataSource;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

const DataSourceInstance = new DataSource(ormConfigData);
export default DataSourceInstance;
