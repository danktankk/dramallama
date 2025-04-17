// src/commands/prompt.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import Queue from "../../queue/queue";

const queue = new Queue();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prompt")
    .setDescription("Send a prompt to your LLM")
    .addStringOption(option =>
      option
        .setName("input")
        .setDescription("The prompt to send")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // This ACK is now visible **only** to the user who invoked the command
    await interaction.deferReply({ ephemeral: true });

    queue.addItem(interaction);
  },
};
