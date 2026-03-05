export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ENV: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_SECRET: string;
  // one-time token used to create the first superadmin
  SEED_TOKEN?: string;
};
