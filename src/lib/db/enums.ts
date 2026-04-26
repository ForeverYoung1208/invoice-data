export enum TaskStatus {
  UPLOADED = 'uploaded',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  REVIEW = 'review',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TaskFileRole {
  JOBS = 'jobs',
  CLIENTS = 'clients',
  PARTS = 'parts',
  DEVICES = 'devices',
}
