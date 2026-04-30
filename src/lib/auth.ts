import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authService } from '@/lib/container';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await authService.verifyCredentials(
          credentials.username as string,
          credentials.password as string,
        );
        if (!user) return null;
        return { id: user.id, name: user.username };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
});
