const axios = require("axios");
const moment = require("moment");
const logger = require("../logger")("queries.events");
const queue = require("../queue");
const { sleep, timeout } = require("../utils");
const { getConfigByGuild } = require("../config");
const { embedEvent, embedEventAsImage, embedInventoryAsImage } = require("../messages");
const dailyRanking = require("./dailyRanking");

const EVENTS_ENDPOINT = "https://gameinfo.albiononline.com/api/gameinfo/events";
const EVENTS_LIMIT = 51;
const EVENTS_EXCHANGE = "events";

let latestEvent;
let pubChannel;

exports.get = async () => {
  const logger = require("../logger")("queries.events.get");
  if (!pubChannel) {
    pubChannel = await queue.createChannel();
  }

  const isFirstEvent = !latestEvent;
  const fetchEventsTo = async (latestEvent, offset = 0, events = []) => {
    // First time loading, fast return so we start recording from now
    if (isFirstEvent && events.length > 0) return events;
    // Maximum offset reached, just return what we have
    if (offset >= 1000) return events;

    try {
      logger.debug(`Fetching events with offset: ${offset}`);
      const res = await axios.get(EVENTS_ENDPOINT, {
        params: {
          offset,
          limit: isFirstEvent ? 1 : EVENTS_LIMIT,
          timestamp: moment().unix(),
        },
        timeout: 60000,
      });
      const foundLatest = !res.data.every(evt => {
        if (evt.EventId <= latestEvent.EventId) return false;
        events.push(evt);
        return true;
      });
      return foundLatest ? events : fetchEventsTo(latestEvent, offset + EVENTS_LIMIT, events);
    } catch (err) {
      logger.error(`Unable to fetch event data from API [${err}].`);
      await sleep(5000);
      return fetchEventsTo(latestEvent, offset, events);
    }
  };

  if (!latestEvent) {
    logger.info("No latest event found. Retrieving first events.");
    latestEvent = { EventId: 0 };
  } else {
    logger.info(`Fetching Albion Online events from API up to event ${latestEvent.EventId}.`);
  }

  // Fetch new events
  const events = await fetchEventsTo(latestEvent);
  if (events.length === 0) return logger.debug("No new events.");
  latestEvent = events[0];

  // Publish new events, from oldest to newest
  await pubChannel.assertExchange(EVENTS_EXCHANGE, "fanout", {
    durable: false,
  });

  for (const evt of events.reverse()) {
    await pubChannel.publish(EVENTS_EXCHANGE, "", Buffer.from(JSON.stringify(evt)));
  }
};

const getTrackedEvent = (event, { trackedPlayers, trackedGuilds, trackedAlliances }) => {
  if (trackedPlayers.length === 0 && trackedGuilds.length === 0 && trackedAlliances.length === 0) {
    return null;
  }

  const playerIds = trackedPlayers.map(t => t.id);
  const guildIds = trackedGuilds.map(t => t.id);
  const allianceIds = trackedAlliances.map(t => t.id);

  // Ignore Arena kills or Duel kills
  if (event.TotalVictimKillFame <= 0) {
    return;
  }

  // Check for kill in event.Killer / event.Victim for anything tracked
  // Since we are parsing from newer to older events
  // we need to use FILO array
  const goodEvent =
      allianceIds.indexOf(event.Killer.AllianceId) >= 0 ||
      guildIds.indexOf(event.Killer.GuildId) >= 0 ||
      playerIds.indexOf(event.Killer.Id) >= 0;
  const badEvent =
      allianceIds.indexOf(event.Victim.AllianceId) >= 0 ||
      guildIds.indexOf(event.Victim.GuildId) >= 0 ||
      playerIds.indexOf(event.Victim.Id) >= 0;
  if (goodEvent || badEvent) {
    // We need to create a new object here for every guild
    return Object.assign({}, event, { good: goodEvent });
  }
  return null;
};

exports.subscribe = async ({ client, sendGuildMessage }) => {
  const subChannel = await queue.createChannel();
  subChannel.prefetch(1);
  subChannel.assertExchange(EVENTS_EXCHANGE, "fanout", {
    durable: false,
  });

  // Set consume callback
  const cb = async (msg) => {
    const evt = JSON.parse(msg.content.toString());

    const allGuildConfigs = await getConfigByGuild(client.guilds.cache.array());
    for (const guild of client.guilds.cache.array()) {
      guild.config = allGuildConfigs[guild.id];
      const event = getTrackedEvent(evt, guild.config);
      if (!event) continue;

      logger.info(`[Shard #${client.shardId}] Sending event ${event.EventId} to guild "${guild.name}".`);
      dailyRanking.add(guild, event, guild.config);
      const mode = guild.config.mode;
      const hasInventory = event.Victim.Inventory.filter(i => i != null).length > 0;

      try {
        if (mode === "image") {
          const killImage = await embedEventAsImage(event, guild.config.lang);
          await timeout(sendGuildMessage(guild, killImage, "events"), 10000);
          if (hasInventory) {
            const inventoryImage = await embedInventoryAsImage(event, guild.config.lang);
            await timeout(sendGuildMessage(guild, inventoryImage, "events"), 10000);
          }
        } else {
          await timeout(sendGuildMessage(guild, embedEvent(event, guild.config.lang), "events"), 10000);
        }
      } catch (e) {
        logger.error(`[Shard #${client.shardId}] Error while sending event ${event.EventId} [${e}]`);
      }
    }

    subChannel.ack(msg);
  };

  // Consume events as they come
  const q = await subChannel.assertQueue("");
  await subChannel.bindQueue(q.queue, EVENTS_EXCHANGE, "");
  logger.info("Subscribe to event queue");
  await subChannel.consume(q.queue, cb);
};
