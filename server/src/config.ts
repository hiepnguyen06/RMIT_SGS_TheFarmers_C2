import { z } from 'zod';

const schema = z
  .object({
    PORT: z.coerce.number().default(4000),
    APP_URL: z.string().default('http://localhost:3000'),
    AUTH_MODE: z.enum(['tidecloak', 'mock']).default('mock'),
    TIDECLOAK_URL: z.string().optional(),
    TIDECLOAK_REALM: z.string().default('safedesk'),
    TIDECLOAK_AUDIENCE: z.string().optional(),
    /** Web client id; tokens must carry it as `azp`. */
    TIDECLOAK_CLIENT_ID: z.string().default('safedesk-web'),
    /** Adapter JSON from the realm bootstrap; its embedded `jwk` is the only key tokens are verified against. */
    TIDECLOAK_ADAPTER_FILE: z.string().default('../data/tidecloak.json'),
    /** Honour x-forwarded-host/-proto when rebuilding the DPoP `htu`. Only behind a proxy you control. */
    TRUST_FORWARDED_HEADERS: z.enum(['true', 'false']).default('false'),
    AGENT_IDENTITY: z.enum(['simulated', 'client_credentials']).default('client_credentials'),
    AGENT_CLIENT_ID: z.string().optional(),
    AGENT_CLIENT_SECRET: z.string().optional(),
    UNSAFE_DEMO: z.enum(['true', 'false']).default('false'),
    NODE_ENV: z.string().default('development'),
    OPENAI_API_KEY: z.string().optional(),
    AGENT_MODEL: z.string().default('gpt-4o-mini'),
    REFUND_LIMIT_VND: z.coerce.number().default(500000),
    /** Approvals a refund needs. Admins are the approvers, so with one admin account this is 1. */
    APPROVALS_REQUIRED: z.coerce.number().default(1),
    /** Number of admin accounts that can vote; a request is denied once approval is no longer reachable. */
    APPROVER_COUNT: z.coerce.number().default(1),
    DATA_FILE: z.string().optional(),
    /** The shop's public customer. Chat needs no sign-in; every chat acts as this fixed identity. */
    PUBLIC_CUSTOMER_SUB: z.string().default('cust-an'),
    PUBLIC_CUSTOMER_NAME: z.string().default('An Nguyen'),
    /** Chat messages allowed per client address per 10 minutes (the chat endpoint is public). */
    CHAT_RATE_LIMIT: z.coerce.number().int().positive().default(30),
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
