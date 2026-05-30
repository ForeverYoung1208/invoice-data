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
