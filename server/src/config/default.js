module.exports = {
  amqp: {
    uri: process.env.AMQP_URL,
    queue: {
      maxLength: Number(process.env.AMQP_QUEUE_MAX_LENGTH) || 10000,
      messageTtl: Number(process.env.AMQP_QUEUE_MESSAGE_TTL) || 1000 * 60 * 60 * 4, // 4 hours
    },
    events: {
      batch: process.env.AMQP_QUEUE_EVENTS_BATCH || true,
    },
    battles: {
      batch: process.env.AMQP_QUEUE_BATTLES_BATCH || true,
    },
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || "us-east-1",
    bucket: process.env.AWS_BUCKET || "albion-killbot",
  },

  datadog: {
    apiKey: process.env.DATADOG_API_KEY,
  },

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    token: process.env.DISCORD_TOKEN,
    community: {
      server: process.env.DISCORD_COMMUNITY_SERVER,
      premiumRole: process.env.DISCORD_COMMUNITY_PREMIUM_ROLE,
      admins: process.env.DISCORD_COMMUNITY_ADMINS.split(",") || [],
    },
  },

  logger: {
    level: process.env.DEBUG_LEVEL || "info",
  },

  loggly: {
    token: process.env.LOGGLY_TOKEN,
    subdomain: process.env.LOGGLY_SUBDOMAIN,
  },

  mongodb: {
    uri: process.env.MONGODB_URL,
  },

  stripe: {
    accessToken: process.env.STRIPE_ACCESS_TOKEN,
    product: process.env.STRIPE_PRODUCT,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  api: {
    port: process.env.PORT || 80,
    session: {
      cookieName: process.env.SESSION_COOKIE_NAME || "albion-killbot",
      domain: process.env.SESSION_DOMAIN || null,
      maxAge: process.env.SESSION_MAX_AGE || 604800000,
      secret: process.env.SESSION_SECRET || "defaultSecret",
    },
    rateLimit: {
      interval: process.env.RATE_LIMIT_WINDOW || 60000,
      requests: process.env.RATE_LIMIT_REQUESTS || 0,
    },
  },

  dashboard: {
    url: process.env.DASHBOARD_URL || "http://localhost",
  },

  bot: {
    shards: {
      total: process.env.SHARDS_TOTAL || "auto",
      spawn: process.env.SHARDS_TO_SPAWN || "auto",
    },
    guildRankings: true,
    servers: {
      cacheInterval: 60000,
    },
  },

  crawler: {
    events: {
      west: true,
      east: true,
    },
    battles: {
      west: true,
      east: true,
    },
  },
};
