export const config = {
  MESSAGE_DELAY_MS: 500,

  EVOLUTION_API_BASE_URL: process.env.EVOLUTION_API_BASE_URL || '',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY || '',
  EVOLUTION_CONNECT_TIMEOUT_MS: Number(process.env.EVOLUTION_CONNECT_TIMEOUT_MS || 180000),
  EVOLUTION_POLL_INTERVAL_MS: Number(process.env.EVOLUTION_POLL_INTERVAL_MS || 5000)
} as const;

export type AutomationConfig = typeof config;
