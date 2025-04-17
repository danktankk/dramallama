// ─────────────────────────── src/queue/queue.ts ───────────────────────────
import {
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  ThreadAutoArchiveDuration,
  ThreadChannel
} from "discord.js";

const wait = require("node:timers/promises").setTimeout;

/* ---------- strip <think> / </think> blocks -------------------------------- */
function stripChainOfThought(raw: string): string {
  const noTags  = raw.replace(/<\/?think>/gi, "");                 // remove tags
  const lastEnd = raw.toLowerCase().lastIndexOf("</think>");
  return (lastEnd !== -1 ? raw.slice(lastEnd + 8) : noTags).trim();
}

/* ---------- queue infrastructure ------------------------------------------ */
interface QueueObject {
  [id: string]: {
    interaction: ChatInputCommandInteraction;
    status: { position: number; processing: boolean; waiting: boolean };
    thread?: ThreadChannel;
  };
}

export default class Queue {
  private static readonly CONCURRENT_QUEUE_SIZE = 3;
  private static readonly LLM_MODEL   = process.env.LLM_MODEL   ?? "llama2";
  private static readonly API_URL     = process.env.LLM_API_URL ?? "http://localhost:11434/api/generate";
  private static readonly SYSTEM_PROMPT =
    process.env.SYSTEM_PROMPT ??
    "You are a friendly, helpful assistant.";                      // fallback

  private queue: QueueObject = {};
  private interval?: NodeJS.Timeout;

  /* -------------------------- public API ---------------------------------- */
  addItem(interaction: ChatInputCommandInteraction) {
    const pos = Object.keys(this.queue).length;
    this.queue[interaction.id] = {
      interaction,
      status: { position: pos, processing: false, waiting: false }
    };

    if (!this.interval) {
      console.log("▶ Queue processor started");
      this.interval = setInterval(() => this.tick(), 3_000);
    }
  }

  /* --------------------------- helpers ------------------------------------ */
  private removeItem(id: string) {
    delete this.queue[id];
    Object.values(this.queue).forEach(q => q.status.position--);
  }

  private isEmpty() { return Object.keys(this.queue).length === 0; }

  /* --------------------------- main loop ---------------------------------- */
  private async tick() {
    if (this.isEmpty()) {
      clearInterval(this.interval!);
      this.interval = undefined;
      console.log("▶ Queue empty – processor stopped");
      return;
    }

    let active = 0;
    for (const id of Object.keys(this.queue)) {
      if (active >= Queue.CONCURRENT_QUEUE_SIZE) break;
      const item = this.queue[id];
      if (item.status.processing) { active++; continue; }

      item.status.processing = true; active++;
      const chan = await item.interaction.client.channels
                      .fetch(item.interaction.channelId) as TextChannel;

      this.processTask(id, item.interaction, chan).catch(console.error);
    }
  }

  /* ------------------------ per‑task handler ------------------------------ */
  private async processTask(
    id: string,
    interaction: ChatInputCommandInteraction,
    parent: TextChannel
  ) {
    const userPrompt = interaction.options.getString("input") ?? "";
    const userName   = interaction.user.displayName;
    console.log(`→ Final prompt being sent to LLM:\n ### System:\n${Queue.SYSTEM_PROMPT}\n\n ### User:\n${userPrompt}`);

    /* thread for live tokens ---------------------------------------------- */
    const thread = await parent.threads.create({
      name: `[${userName}] – ${userPrompt.slice(0,60) || "Prompt"}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      reason: "LLM Bot auto-thread"
    });
    this.queue[id].thread = thread;

    /* ✉️  call /api/generate with system prompt --------------------------- */
    const res = await fetch(Queue.API_URL, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        model : Queue.LLM_MODEL,
        system: Queue.SYSTEM_PROMPT,        // 👈 **THIS IS THE FIX**
        prompt: userPrompt,
        stream: true
      })
    });

    const reader = res.body!.getReader();
    const dec    = new TextDecoder();

    let buf = "", segment = "";
    const chunks: string[] = [];
    const msgs: Message[] = [];

    const throttler = setInterval(async () => {
      if (!segment.trim()) return;
      if (!msgs.length) msgs.push(await thread.send(segment));
      else if (msgs[msgs.length-1].content !== segment)
        await msgs[msgs.length-1].edit(segment);
    }, 2_000);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream:true });
      const lines = buf.split("\n"); buf = lines.pop()!;

      for (const l of lines) {
        if (!l.trim()) continue;
        let obj; try { obj = JSON.parse(l); } catch { continue; }
        const piece = obj.response as string;
        if (segment.length + piece.length > 1_800) {
          chunks.push(segment); segment = piece;
        } else segment += piece;
      }
    }
    if (segment) chunks.push(segment);

    clearInterval(throttler);
    if (msgs.length) await msgs[msgs.length-1].edit(chunks.at(-1)!);

    /* send cleaned answer back to channel -------------------------------- */
    await interaction.deleteReply();                     // drop “thinking…”
    const final = stripChainOfThought(chunks.join(""));
    for (let i = 0; i < final.length; i += 2_000)
      await parent.send(final.slice(i, i+2_000));

    this.removeItem(id);
    console.log(`✔ Task ${id} complete — cleaned up.`);
  }
}
// ──────────────────────────── end of file ──────────────────────────────────
