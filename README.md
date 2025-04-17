  <img src="assets/logo1.png" alt="Logo 1" width="100"/> <img src="assets/logo2.png" alt="Logo 2" width="500"/><img src="assets/logo3.png" alt="Logo 3" width="110"/>

# dramallama — A Self-Hosted LLM Discord Bot

> **Note:** This project is based on [dhavdc/discord-bot-llm](https://github.com/dhavdc/discord-bot-llm).  
> For a the walkthrough and demo, you watch his video here:  
> [https://www.youtube.com/watch?v=aNzc8BsPIkQ&t=724s](https://www.youtube.com/watch?v=aNzc8BsPIkQ&t=724s)  
> The second half of the video explains how to get the bot running on AWS as well.


---

## 🚀 Features

- 🧵 Threads: Keeps Discord channels clean by auto-creating threads per prompt and then answers in the channel.
- ⏱ Queueing: Handles multiple users using a queue with concurrency control.
- ⚡ Fast Streaming: Works with `/api/generate` NDJSON stream responses.
- 🔒 Ephemeral Acknowledgments: Replies only to the user before switching to thread mode.

---

## ✅ Requirements

- A running self-hosted LLM API supporting:
  - POST to `/api/generate`
  - Streaming NDJSON responses (e.g., Ollama, LM Studio)
- Docker or Node.js to run the bot.
- A Discord account and server.

## 🗓️ Planned Features

- 🧬 Custom Personality Presets: Define your default behavior using `SYSTEM_PROMPT`.

---

# 🛠️ Setup

## 🔧 How to Create a Discord Bot (From Discord Developer Portal)

> 📺 *Based on [this YouTube tutorial](https://www.youtube.com/watch?v=aNzc8BsPIkQ&t=724s)*

---

### 🧠 1. Set Up a New Bot in Discord Developer Portal

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter a name for your bot (e.g. `mybot`)
4. Click **"Create"**

---

### :robot: 2. Add a Bot User to the Application

1. In the left sidebar, click **"Bot"**
2. Click **"Add Bot"**
3. Confirm by clicking **"Yes, do it!"**
4. (Optional) Enable **"Public Bot"** if you want others to invite it
5. Enable **"Message Content Intent"**
   - Scroll down and toggle it ON
   - This allows your bot to read message content in channels
6. Click **Reset Token** and save it securely (you’ll need it in your `.env` file)
   - ⚠️ *Never share your bot token publicly*
7. Navigate to the **OAuth2** section in the left sidebar
   - Copy the **Client ID** under **OAuth2 → General**
   - You’ll also need this in your `.env` file as `DISCORD_CLIENT_ID`

---

### 🛡️ 3. Configure Privileged Intents

Still in the **Bot** section:
- Enable:
  - ✅ **MESSAGE CONTENT INTENT**
  - ✅ **SERVER MEMBERS INTENT** (if interacting with users)
  - ✅ **PRESENCE INTENT** (if needed for status tracking)

---

### 🔗 4. Generate an OAuth2 Invite URL

1. Click on **"OAuth2" → "URL Generator"**
2. Under **Scopes**, check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, check the following:

#### 📂 General Permissions
- ✅ `View Channels`

#### 💬 Text Permissions
- ✅ `Send Messages`  
- ✅ `Create Public Threads`  
- ✅ `Send Messages in Threads`  
- ✅ `Manage Messages`  
- ✅ `Manage Threads`  
- ✅ `Embed Links`  
- ✅ `Attach Files`  
- ✅ `Read Message History`  
- ✅ `Use Slash Commands`  
- ✅ `Add Reactions` *(optional but useful)*

#### ✨ Optional Enhancements
- ☑️ `Use External Emojis` *(for emoji support)*
- ☑️ `Create Private Threads` *(if your bot will use them)*

4. Copy the **generated URL** at the bottom.
5. Paste the URL into your browser and **invite your bot** to your server.

> ⚠️ Only select permissions your bot needs. Do **not** give `Administrator` unless absolutely required.


---

### 🧪 5. Test the Bot in Your Server

Once you've invited the bot to your Discord server, it should appear **online** as soon as the Docker container is **running**.

To start the bot:

### 🐳 Run the Bot with Docker Compose

Create a file called `docker-compose.yml` in your project directory:

```yaml
services:
  dramallama:
    container_name: dramallama
    image: danktankk/dramallama:latest
    environment:
      - DISCORD_LLM_BOT_TOKEN=${BOT_TOKEN}
      - DISCORD_LLM_BOT_CLIENT_ID=${CLIENT_ID}
      - LLM_MODEL=${LLM_MODEL}
      - LLM_API_URL=${LLM_API_URL}
      #- SYSTEM_PROMPT=${SYSTEM_PROMPT} # not implemented yet
    restart: unless-stopped
```

Then, create a `.env` file in the same directory:

```env
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
LLM_MODEL=llama3
LLM_API_URL=http://your-ollama-server:11434/v1
#SYSTEM_PROMPT=You are a helpful assistant.
```

Start the bot using:

```bash
docker compose up -d
```

This will pull and run the bot image, and your Discord bot should come online.


### 📌 Notes

- You must **add the bot to a server where you have "Manage Server" permissions**
- If you need to regenerate the token, you can do it from the **Bot** section
- Store tokens and secrets securely (e.g. in `.env`, and make sure it’s in `.gitignore`)
