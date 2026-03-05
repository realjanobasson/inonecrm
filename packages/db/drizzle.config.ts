import type { Config } from 'drizzle-kit';
export default { schema:'./src/schema/*', out:'./drizzle', dialect:'sqlite' } satisfies Config;
