// logger.js
const chalk = require('chalk');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logsDirectory = path.resolve(__dirname, './logs');
if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      `${timestamp} ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDirectory, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.printf(({ level, message }) =>
        `${chalk.yellow(level.toUpperCase())}: ${chalk.green(message)}`
      )
    })
  ],
});

module.exports = {
  info: (message) => logger.info(message),
  error: (message) => logger.error(message),
  debug: (message) => {
    if (process.env.DEBUG) {
      logger.debug(message);
    }
  },
};