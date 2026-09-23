const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
const express = require('express');
const axios = require('axios');

// Keep Render free web service alive with a simple HTTP server
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

// Explicitly format the private key with proper newline characters
const rawKey = "SLpKclXe/JIcBwjOdAGdB6OVdjJXTl31JP+Y3F/CRjXQUOEcwJQ0DcFyfMVWlLsM3GHn7nO5vcuo/NQVCNnALQ==";
const formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;

// Configure Coinbase SDK using the formatted variable
Coinbase.configure({
    apiKeyName: "1d8aa094-239c-41c9-90cc-403735ac7a43",
    privateKey: formattedPrivateKey
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Real Web3 client active.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const wallet = await Wallet.create();
            const address = await wallet.getDefaultAddress();
            const addressId = await address.getId();

            const embed = new EmbedBuilder()
                .setTitle("🪙 Apex Wallet Created")
                .setDescription("Your official on-chain Web3 wallet has been successfully provisioned on Coinbase Developer Platform.")
                .addFields(
                    { name: "Wallet Address", value: `\`${addressId}\`` },
                    { name: "Network", value: "Base Sepolia / Polygon (Managed)" }
                )
                .setColor(0x00FF00);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("DETAILED COINBASE ERROR:", error.response?.data || error.message);
            await interaction.editReply({
                content: `❌ Coinbase Error: ${error.message}`
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
