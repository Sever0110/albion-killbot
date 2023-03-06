const { createLogger, format, transports } = require("winston");
const { Loggly } = require("winston-loggly-bulk");
const path = require("path");
const fastRedact = require("fast-redact");
const { printSpace } = require("./utils");

const { MODE, DEBUG_LEVEL, LOGGLY_TOKEN, LOGGLY_SUBDOMAIN } = process.env;
const level = DEBUG_LEVEL || "info";

const redact = fastRedact({
  paths: ["notification.files", "response.request", "error.requestBody.files", "error.config.headers.Accept"],
  serialize: false,
  strict: false,
});

format.redact = format(redact);

const logger = createLogger({
  level: "debug",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.redact(), format.json()),
  defaultMeta: {
    service: MODE,
    get shard() {
      return process.env.SHARD;
    },
  },
  transports: [
    new transports.File({
      filename: path.join("logs", "debug.log"),
      level: "debug",
      maxsize: 10 * Math.pow(1024, 2), // 10 MB
      maxFiles: 1,
      tailable: true,
    }),
    new transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      maxsize: 1 * Math.pow(1024, 1), // 1 MB
      maxFiles: 1,
      tailable: true,
    }),
  ],
});

const consoleFormat = format.printf(({ level, message, timestamp, [Symbol.for("level")]: logLevel, shard }) => {
  const maxLen = "verbose".length;
  const count = maxLen - logLevel.length;
  const spacing = printSpace(count);
  const shardStr = shard ? `[#${shard}] ` : "";
  return `${timestamp} [${level}] ${spacing}: ${shardStr}${message}`;
});

logger.add(
  new transports.Console({
    format: format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), format.colorize(), consoleFormat),
    level,
  }),
);

if (LOGGLY_TOKEN && LOGGLY_SUBDOMAIN) {
  logger.add(
    new Loggly({
      token: LOGGLY_TOKEN,
      subdomain: LOGGLY_SUBDOMAIN,
      tags: [`albion-killbot`, MODE],
      json: true,
    }),
  );
}

logger.stream = {
  write: (message) => {
    logger.info(message);
  },
};

module.exports = logger;
