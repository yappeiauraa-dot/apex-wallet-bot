const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Apex Wallet Bot is active and running!');
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// Test outbound network connectivity on startup
axios.get('https://api.ipify.org?format=json')
    .then(res => console.log("🌐 Outbound network test SUCCESS. Server IP:", res.data.ip))
    .catch(err => console.log("❌ Outbound network test BLOCKED or FAILED:", err.message));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Direct REST client active.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Testing raw endpoint reachability to Coinbase API domain
            const response = await axios.get('https://api.developer.coinbase.com/portal/v1/health', {
                validateStatus: function (status) {
                    return status < 500; // Resolve even if 401/403 unauthorized, proving endpoint is reachable
                }
            });

            console.log("Coinbase API Health Reachability Status:", response.status);

            const embed = new EmbedBuilder()
                .setTitle("🪙 Apex Wallet Endpoint Check")
                .setDescription("Successfully reached Coinbase Developer Platform infrastructure.")
                .addFields(
                    { name: "API Status Code", value: `\`${response.status}\`` },
                    { name: "Network Status", value: "Connected" }
                )
                .setColor(0x00FF00);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("DIRECT API ERROR:", error.message);
            await interaction.editReply({
                content: `❌ Connection Error: ${error.message}`
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
