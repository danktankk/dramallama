// bot.ts
import path from "path";
import fs   from "fs";
import process from "process";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  Interaction
} from "discord.js";
import deployCommands from "./deploy/deployCommands";

// 1) Read & validate your bot token from process.env
const BOT_TOKEN = process.env.DISCORD_LLM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Missing environment variable: DISCORD_LLM_BOT_TOKEN");
  process.exit(1);
}

// 2) Create the Discord.js client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
});

// 3) Dynamically load all slash‑command modules
client.commands = new Collection<string, any>();
const commandsRoot = path.join(__dirname, "commands");
for (const folder of fs.readdirSync(commandsRoot)) {
  const folderPath = path.join(commandsRoot, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
    const cmd = require(path.join(folderPath, file));
    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
    } else {
      console.warn(`[WARNING] Command at ${file} is missing .data or .execute`);
    }
  }
}

// 4) Deploy slash‑commands
deployCommands()
  .then(() => console.log("Slash commands deployed"))
  .catch(err => {
    console.error("Error deploying commands:", err);
    process.exit(1);
  });

// 5) Log in and set up handlers
client.once(Events.ClientReady, () => {
  console.log(`Bot is online as ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error("Command execution error:", error);
    const reply = { content: "❌ There was an error executing that command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// 6) Log into Discord
client.login(BOT_TOKEN);

// ─── Graceful shutdown on Docker stop ────────────────────────────────────────
const cleanExit = () => {
  console.log("Received shutdown signal, destroying Discord client…");
  client.destroy()
    .then(() => {
      console.log("Client destroyed, exiting process.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error during client.destroy():", err);
      process.exit(1);
    });
};

process.on("SIGINT", cleanExit);
process.on("SIGTERM", cleanExit);
