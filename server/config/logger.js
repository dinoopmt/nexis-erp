import environment from './environment.js';

// Simple logger implementation
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const levelToString = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

const currentLogLevel = LOG_LEVELS[environment.LOG_LEVEL] || LOG_LEVELS.info;

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const levelStr = levelToString[level];
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${levelStr}] ${message} ${metaStr}`.trim();
};

const logger = {
  error: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(formatMessage(LOG_LEVELS.error, message, meta));
    }
  },
  warn: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage(LOG_LEVELS.warn, message, meta));
    }
  },
  info: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(formatMessage(LOG_LEVELS.info, message, meta));
    }
  },
  debug: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage(LOG_LEVELS.debug, message, meta));
    }
  },
};

export default logger;
