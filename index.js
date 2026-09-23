const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Apex Wallet Bot is active and running!');
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// Directly configure using the parameters from your downloaded JSON file
Coinbase.configure({
    apiKeyName: "8a2dc84f-ca63-4229-afb0-f06fb82fb1b8", // e.g., the UUID string
    privateKey: "f+fIaqwymb3bIo/Xkb+qFwx1z9qn2Tpckd4M4Xe9PdDzDuSezZlBVLyQ2PUg+1Yp657YHXjYdgfFghNwz6LW+A==" // e.g., the long Ed25519 string block
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Bot ready.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        await interaction.deferReply({ ephemeral: true });

        try {
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
                content: `❌ Wallet Creation Failed: ${error.message || "Check API credentials."}`
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
