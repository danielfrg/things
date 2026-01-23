import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const isDev = process.env.NODE_ENV === 'development';

const getAllowedOrigins = () => {
  if (!isDev) return [baseUrl];

  const origins = [baseUrl, 'http://localhost:3000'];

  // Add additional dev origins from env if specified
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }

  return origins;
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  baseURL: baseUrl,
  trustedOrigins: isDev
    ? (req) => {
        const origin = req?.headers.get('origin');
        if (!origin) return getAllowedOrigins();

        // Allow localhost and local network IPs in dev
        if (
          origin.startsWith('http://localhost:') ||
          origin.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/) ||
          origin.match(/^http:\/\/.*\.local:\d+$/)
        ) {
          return [origin];
        }

        return getAllowedOrigins();
      }
    : [baseUrl],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
