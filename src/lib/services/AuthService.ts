import bcrypt from 'bcryptjs';
import { getGlobalDataSource } from '../db/dataSource';
import { User } from '../db/entities/User';

export class AuthService {
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const ds = await getGlobalDataSource();
    const user = await ds.getRepository(User).findOneBy({ username });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async createUser(username: string, password: string): Promise<User> {
    const ds = await getGlobalDataSource();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = ds.getRepository(User).create({ username, passwordHash });
    return ds.getRepository(User).save(user);
  }
}
