import 'reflect-metadata';
import { getGlobalDataSource } from './dataSource';
import { AuthService } from '../services/AuthService';

async function seed(): Promise<void> {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('ADMIN_USER and ADMIN_PASSWORD env vars are required');
    process.exit(1);
  }

  await getGlobalDataSource();
  const authService = new AuthService();

  try {
    await authService.createUser(username, password);
    console.log(`Admin user '${username}' created.`);
  } catch {
    console.log(`User '${username}' already exists, skipping.`);
  }

  process.exit(0);
}

void seed();
