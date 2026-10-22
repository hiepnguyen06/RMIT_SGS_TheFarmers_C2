import { z } from 'zod';

const schema = z
  .object({
    PORT: z.coerce.number().default(4000),
    APP_URL: z.string().default('http://localhost:3000'),
    AUTH_MODE: z.enum(['tidecloak', 'mock']).default('mock'),
    TIDECLOAK_URL: z.string().optional(),
    TIDECLOAK_REALM: z.string().default('safedesk'),
    TIDECLOAK_AUDIENCE: z.string().optional(),
    AGENT_CLIENT_ID: z.string().optional(),
    AGENT_CLIENT_SECRET: z.string().optional(),
    UNSAFE_DEMO: z.enum(['true', 'false']).default('false'),
    NODE_ENV: z.string().default('development'),
    OPENAI_API_KEY: z.string().optional(),
    AGENT_MODEL: z.string().default('gpt-4o-mini'),
    REFUND_LIMIT_VND: z.coerce.number().default(500000),
    APPROVALS_REQUIRED: z.coerce.number().default(2),
    APPROVER_COUNT: z.coerce.number().default(3),
    DATA_FILE: z.string().optional(),
    /** Comma-separated TideCloak user ids that own the seeded demo orders (default: mock subs). */
    SEED_CUSTOMER_SUBS: z.string().optional(),
  })
  .refine((c) => c.AUTH_MODE !== 'tidecloak' || !!c.TIDECLOAK_URL, {
    message: 'TIDECLOAK_URL is required when AUTH_MODE=tidecloak',
  })
  .refine((c) => c.AUTH_MODE !== 'tidecloak' || !!c.TIDECLOAK_AUDIENCE, {
    message: 'TIDECLOAK_AUDIENCE is required when AUTH_MODE=tidecloak',
  })
  .refine((c) => !(c.AUTH_MODE === 'mock' && c.NODE_ENV === 'production'), {
    message: 'AUTH_MODE=mock is not allowed when NODE_ENV=production',
  })
  .refine((c) => c.APPROVALS_REQUIRED >= 1 && c.APPROVALS_REQUIRED <= c.APPROVER_COUNT, {
    message: 'APPROVALS_REQUIRED must be between 1 and APPROVER_COUNT',
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const clean = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  return schema.parse(clean);
}
