export const config = {
  debug: true,
  logLevel: 'debug',
  api: {
    baseUrl: 'https://api.elevenlabs.io/v1',
    timeout: 30000,
    retries: 3
  },
  voice: {
    defaultEmotion: 'sensuel',
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.85
    }
  },
  logging: {
    api: true,
    components: true,
    state: true,
    errors: true
  }
};

export const logger = {
  debug: (...args: any[]) => {
    if (config.debug) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  group: (label: string) => {
    if (config.debug) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (config.debug) {
      console.groupEnd();
    }
  }
};
