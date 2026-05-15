import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { AuthService } from '@/lib/services/AuthService';

const authService = new AuthService();

class InvalidCredentials extends CredentialsSignin {}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password)
          throw new InvalidCredentials();
        const user = await authService.verifyCredentials(
          credentials.username as string,
          credentials.password as string,
        );
        if (!user) throw new InvalidCredentials();
        return { id: user.id, name: user.username };
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  logger: {
    error(error) {
      if ((error as any).type === 'CredentialsSignin') {
        console.error('CredentialsSignin error');
        return;
      }
      console.error(error);
    },
  },
});
