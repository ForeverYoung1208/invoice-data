### Task 2: Authentication

- **Objective:** Only authenticated users can access the app
- **Implementation:** next-auth v5 credentials provider. AuthService class in container: verifyCredentials(username, password) with bcrypt. Middleware protects all routes except /login. Seed script creates default admin from env vars (ADMIN_USER, ADMIN_PASSWORD). Login page with shadcn Card + Form
- **Demo:** Unauthenticated / redirects to /login; valid credentials grant access; invalid shows error