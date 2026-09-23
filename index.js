const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
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

// Explicitly format your private key with proper headers and line breaks
const rawKey = "SLpKclXe/JIcBwjOdAGdB6OVdjJXTl31JP+Y3F/CRjXQUOEcwJQ0DcFyfMVWlLsM3GHn7nO5vcuo/NQVCNnALQ==";
const formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;

// Initialize the Coinbase SDK with your CDP credentials
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
    console.log(`Logged in as ${client.user.tag}! Coinbase SDK active.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Provision a new wallet on Base Sepolia testnet
            const wallet = await Wallet.create({ networkId: 'base-sepolia' });
            const address = await wallet.getDefaultAddress();
            const addressId = await address.getId();

            const embed = new EmbedBuilder()
                .setTitle("🪙 Apex Wallet Created")
                .setDescription("Your official on-chain Web3 wallet has been successfully provisioned on Coinbase Developer Platform.")
                .addFields(
                    { name: "Wallet Address", value: `\`${addressId}\`` },
                    { name: "Network", value: "Base Sepolia" }
                )
                .setColor(0x00FF00);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("WALLET CREATION ERROR:", error);
            await interaction.editReply({
                content: `❌ Wallet Creation Failed: ${error.message || "Check API credentials or permissions."}`
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
