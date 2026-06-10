export enum NODE_ENV {
  Development = 'development',
  Poduction = 'production',
  Test = 'test',
}

export enum ETaskStatus {
  UPLOADED = 'uploaded',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  REVIEW = 'review',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ETaskFileRole {
  JOBS = 'jobs',
  CLIENTS = 'clients',
  PARTS = 'parts',
  DEVICES = 'devices',
}

export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

/** Parts with LLM compatibility confidence below this threshold are flagged as uncertain */
export const PART_UNCERTAINTY_THRESHOLD = 0.8;
