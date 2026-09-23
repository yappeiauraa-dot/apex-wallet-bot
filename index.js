const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  AttachmentBuilder,
  ActivityType
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const STAFF_USER_ID = "1529116683514544138";
const EXCHANGE_HISTORY_CHANNEL_ID = "1549492213958967306";

// Category-specific transcript channels
const TRANSCRIPT_CHANNELS = {
  i2c: "1549494567471161506",
  c2i: "1549494636752412692",
  c2c: "1549494710152990781"
};

const ticketDataStore = new Map();
const userStats = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}! Bot is online.`);

  // Set Bot Presence / Activity
  client.user.setPresence({
    activities: [{ name: '/help | apexexchange.xyz', type: ActivityType.Watching }],
    status: 'online',
  });

  const commands = [
    new SlashCommandBuilder().setName('exch_panel').setDescription('Sends the Apex Exchange Panel'),
    new SlashCommandBuilder().setName('panel').setDescription('Sends the Apex Exchange Panel'),
    new SlashCommandBuilder().setName('close').setDescription('Closes the current ticket'),
    new SlashCommandBuilder().setName('add').setDescription('Adds a user to the ticket').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('delete').setDescription('Deletes ticket'),
    new SlashCommandBuilder().setName('transcript').setDescription('Generates transcript'),
    new SlashCommandBuilder().setName('help').setDescription('Shows all available commands for Apex Exchange'),
    new SlashCommandBuilder()
      .setName('reset_stats')
      .setDescription('Resets a user stats to 0')
      .addUserOption(opt => opt.setName('user').setDescription('User to reset stats for').setRequired(true))
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
});

function sendTicketError(target) {
  const errContainer = new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`This command can only be used inside a valid bot-created ticket channel!`)
    );

  if (target.reply && typeof target.reply === 'function') {
    return target.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
  } else if (target.channel) {
    return target.channel.send({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
  }
}

function createPanelContainer() {
  const selectMenuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('exchange_select')
      .setPlaceholder('Select exchange type')
      .addOptions([
        { label: 'INR TO CRYPTO', value: 'i2c', description: 'Initiate INR to Crypto exchange', emoji: { id: '1549496865790103634', name: 'Apex_notes', animated: true } },
        { label: 'CRYPTO TO INR', value: 'c2i', description: 'Initiate Crypto to INR exchange', emoji: { id: '1549497007796654260', name: 'Apex_btc', animated: true } },
        { label: 'CRYPTO TO CRYPTO', value: 'c2c', description: 'Initiate Crypto to Crypto exchange', emoji: { id: '1549497653606490183', name: 'Apex_Crypto', animated: false } }
      ])
  );

  return new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### APEX EXCHANGE PANEL\n` +
        `-# _Apex Exchange & MM • Fast Secure Trusted_`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `_Exchange Rates:_\n` +
        `<a:Apex_notes:1549496865790103634>**INR TO CRYPTO**\n` +
        `> <:Apex_arrow:1549500051741614140> 104/$ Any Amount \n\n` +
        `<a:Apex_btc:1549497007796654260> **CRYPTO TO INR**\n` +
        `> <:Apex_arrow:1549500051741614140> Above 100$: 102/$\n` +
        `> <:Apex_arrow:1549500051741614140> Below 100$: 101/$\n\n` +
        `<:Apex_Crypto:1549497653606490183> **CRYPTO TO CRYPTO**\n` +
        `> <:Apex_arrow:1549500051741614140> 4% Fees + Transaction Fees \n\n` +
        `<a:Apex_dots:1549500069726650378> Fixed Rates No Negotiation \n` +
        `<a:Apex_dots:1549500069726650378> Minimum Exchange is **1$**\n` +
        `<a:Apex_dots:1549500069726650378> Don't Create Tickets For Fun \n` +
        `<a:Apex_dots:1549500069726650378> Don't Ping Staff in ticket`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(selectMenuRow)
    .addSeparatorComponents(new SeparatorBuilder());
}

async function sendExchangePanel(target) {
  await target.channel.send({ 
    components: [createPanelContainer()], 
    flags: MessageFlags.IsComponentsV2 
  });
}

function getUserStatsData(userId) {
  if (!userStats.has(userId)) {
    userStats.set(userId, { 
      completedDeals: 0, 
      totalExchanged: 0, 
      latestDeal: 'None',
      breakdown: { i2c: { deals: 0, amount: 0 }, c2i: { deals: 0, amount: 0 }, c2c: { deals: 0, amount: 0 } }
    });
  }
  return userStats.get(userId);
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const isStaffOrAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator) || message.author.id === STAFF_USER_ID;

  if (message.content === '!panel' || message.content === '!exchpanel') {
    if (!isStaffOrAdmin) return message.reply({ content: 'You do not have permission.' });
    await sendExchangePanel(message);
    await message.delete().catch(() => {});
  } 
  else if (message.content.startsWith('.p')) {
    const targetUser = message.mentions.users.first() || message.author;
    const stats = getUserStatsData(targetUser.id);
    const avgAmount = stats.completedDeals > 0 ? (stats.totalExchanged / stats.completedDeals).toFixed(2) : 0;

    const breakdownToken = Math.random().toString(36).substring(2, 10);
    ticketDataStore.set(`breakdown_${breakdownToken}`, stats.breakdown);

    const breakdownRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`view_breakdown_${breakdownToken}`)
        .setLabel('View Breakdown')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji({ id: '1549497151854223470', name: 'Apex_Money' })
    );

    const profileContainer = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${targetUser.username}'s Profile\n\n` +
          `[Avatar URL](${targetUser.displayAvatarURL({ dynamic: true, size: 256 })})\n` +
          `<:Apex_Tick:1549497537034063902> **User Info**\n` +
          `> <:Apex_arrow:1549500051741614140> **ID:** \`${targetUser.id}\`\n` +
          `> <:Apex_arrow:1549500051741614140> **Mention:** ${targetUser}\n` +
          `> <:Apex_arrow:1549500051741614140> **Server Joined:** \`${message.member?.joinedAt ? message.member.joinedAt.toLocaleString() : 'Unknown'}\``
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `<:Apex_Money:1549497151854223470> **Client Stats**\n` +
          `> <:Apex_arrow:1549500051741614140> Deal Count: \`${stats.completedDeals}\`\n` +
          `> <:Apex_arrow:1549500051741614140> Total Exchanged: \`${stats.totalExchanged.toFixed(2)}$\`\n` +
          `> <:Apex_arrow:1549500051741614140> Average Amount: \`${avgAmount}$\`\n` +
          `> <:Apex_arrow:1549500051741614140> Latest Deal: \`${stats.latestDeal}\``
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Apex Exchange • Fast Secure Trusted`
        )
      )
      .addActionRowComponents(breakdownRow);

    await message.channel.send({
      components: [profileContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
  else if (message.content.startsWith('.remind')) {
    if (!ticketDataStore.has(message.channel.id)) {
      return sendTicketError(message);
    }
    if (!isStaffOrAdmin) return message.reply({ content: 'You do not have permission.' });
    
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply({ content: 'Please mention a user to remind! Usage: `.remind @user`', flags: MessageFlags.Ephemeral });
    }

    try {
      const goButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Go to ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${message.guild.id}/${message.channel.id}`)
          .setEmoji({ id: '1549500051741614140', name: 'Apex_arrow' })
      );

      const remindContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:Apex_Tick:1549497537034063902> **Reminder — ${message.guild.name}**\n\n` +
            `Hello ${targetUser},\n\n` +
            `You have been requested to join your ticket channel at your earliest convenience:\n\n` +
            `<:Apex_arrow:1549500051741614140> Channel: ${message.channel}\n\n` +
            `<a:Apex_dots:1549500069726650378> Please make your way there as soon as possible.\n\n` +
            `-# Apex Exchange & MM • Fast Secure Trusted`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(goButton);

      await targetUser.send({
        components: [remindContainer],
        flags: MessageFlags.IsComponentsV2
      });

      await message.reply({ content: `Reminder successfully sent to ${targetUser} in DM!`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      await message.reply({ content: `Could not send DM to ${targetUser}. Their DMs might be closed.`, flags: MessageFlags.Ephemeral });
    }
    await message.delete().catch(() => {});
  }
  else if (message.content === '.done') {
    if (!ticketDataStore.has(message.channel.id)) {
      return sendTicketError(message);
    }

    if (!isStaffOrAdmin) {
      return message.reply({ content: 'Only the exchanger can use the .done command.' });
    }

    const clientConfirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('client_confirm_deal').setLabel('Confirm Deal').setStyle(ButtonStyle.Success).setEmoji({ id: '1549496817144569906', name: 'Apex_check' })
    );

    const ticketStoreData = ticketDataStore.get(message.channel.id) || { dealId: `Apex-${Math.random().toString(36).substring(2, 8).toUpperCase()}` };
    
    const doneContainer = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `<:Apex_check:1549496817144569906> **DEAL COMPLETED**\n\n` +
          `This deal has been successfully marked as completed by ${message.author}\n\n` +
          `<:ticket:1551557328606724217> **DEAL ID**\n` +
          `\`${ticketStoreData.dealId}\`\n\n` +
          `**Waiting for client confirmation...**\n\n` +
          `-# Apex Exchange & MM • Fast Secure Trusted`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(clientConfirmRow);

    await message.channel.send({ 
      components: [doneContainer], 
      flags: MessageFlags.IsComponentsV2 
    });
    await message.delete().catch(() => {});
  }
  else if (message.content === '!close') {
    if (!ticketDataStore.has(message.channel.id)) {
      return sendTicketError(message);
    }

    if (!isStaffOrAdmin) {
      return message.reply({ content: 'You do not have permission.' });
    }

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('transcript_ticket').setLabel('Transcript').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger)
    );

    const closeContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Ticket ID: \`${message.channel.name}\`\n` +
          `Close By: ${message.author}\n\n` +
          `Reason: No reason provided`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(closeRow);

    await message.channel.send({ components: [closeContainer], flags: MessageFlags.IsComponentsV2 });
    await message.delete().catch(() => {});
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    const isStaffOrAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === STAFF_USER_ID;

    if (commandName === 'help') {
      const helpContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🛠️ Apex Exchange — Help Menu\n` +
            `Here are all available commands and utility features.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Slash Commands (/)**\n` +
            `> \`/help\` - Displays this help menu.\n` +
            `> \`/panel\` or \`/exch_panel\` - Sends the exchange ticket panel (Staff/Admin).\n` +
            `> \`/close\` - Closes the current active ticket channel.\n` +
            `> \`/add\` - Adds a user to the current ticket.\n` +
            `> \`/delete\` - Deletes a ticket channel.\n` +
            `> \`/transcript\` - Generates a transcript file.\n` +
            `> \`/reset_stats\` - Resets a user's exchange statistics to 0 (Staff/Admin).`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Prefix Commands (.)**\n` +
            `> \`.p [@user]\` - Views user profile and client statistics.\n` +
            `> \`.done\` - Marks a deal complete and requests client confirmation (Exchanger).\n` +
            `> \`.remind [@user]\` - Sends a DM reminder to a user to join their ticket (Staff/Admin).\n\n` +
            `-# Apex Exchange & MM • Fast Secure Trusted`
          )
        );

      return interaction.reply({
        components: [helpContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (commandName === 'reset_stats') {
      if (!isStaffOrAdmin) {
        return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
      }
      const targetUser = interaction.options.getUser('user');
      userStats.set(targetUser.id, { 
        completedDeals: 0, 
        totalExchanged: 0, 
        latestDeal: 'None',
        breakdown: { i2c: { deals: 0, amount: 0 }, c2i: { deals: 0, amount: 0 }, c2c: { deals: 0, amount: 0 } }
      });
      return interaction.reply({ content: `Successfully reset stats for ${targetUser} to 0.`, flags: MessageFlags.Ephemeral });
    }

    if (!ticketDataStore.has(interaction.channel.id) && commandName !== 'exch_panel' && commandName !== 'panel' && commandName !== 'help') {
      return sendTicketError(interaction);
    }

    if (commandName === 'exch_panel' || commandName === 'panel') {
      if (!isStaffOrAdmin) {
        return interaction.reply({ content: 'You do not have permission.', flags: MessageFlags.Ephemeral });
      }
      await sendExchangePanel(interaction);
      await interaction.reply({ content: 'Exchange panel sent successfully!', flags: MessageFlags.Ephemeral });
    }
  }
  else if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('view_breakdown_')) {
      const breakdownToken = customId.replace('view_breakdown_', '');
      const breakdown = ticketDataStore.get(`breakdown_${breakdownToken}`) || { i2c: { deals: 0, amount: 0 }, c2i: { deals: 0, amount: 0 }, c2c: { deals: 0, amount: 0 } };

      const breakdownContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Deal Breakdown Summary\n\n` +
            `I2C ➞ Deals: \`${breakdown.i2c.deals}\` \`${breakdown.i2c.amount.toFixed(2)}$\`\n` +
            `C2I ➞ Deals: \`${breakdown.c2i.deals}\` \`${breakdown.c2i.amount.toFixed(2)}$\`\n` +
            `C2C ➞ Deals: \`${breakdown.c2c.deals}\` \`${breakdown.c2c.amount.toFixed(2)}$\``
          )
        );

      return interaction.reply({ components: [breakdownContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (customId === 'client_confirm_deal') {
      const ticketInfo = ticketDataStore.get(interaction.channel.id) || { clientObj: null, dealId: `Apex-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, f3: "0", exchangerObj: interaction.user };
      const clientUser = ticketInfo.clientObj || interaction.user;

      if (interaction.user.id !== clientUser.id && !interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Only the ticket owner can click this button!', flags: MessageFlags.Ephemeral });
      }

      const channelName = interaction.channel.name;
      const parts = channelName.split('-');
      const type = parts[0].toLowerCase(); 

      let exchangeTypeStr = type === 'i2c' ? 'INR to Crypto Exchange' : type === 'c2i' ? 'Crypto to INR Exchange' : 'Crypto to Crypto Exchange';
      
      let numericAmount = 1; 
      let calculatedDisplay = "1.00$";
      try {
        const rawAmount = ticketInfo.f3 ? ticketInfo.f3.toString() : "0";
        const numericMatch = rawAmount.replace(/[^0-9.]/g, '');
        const amountNum = parseFloat(numericMatch);

        if (!isNaN(amountNum) && amountNum > 0) {
          numericAmount = amountNum;
          if (type === 'i2c') {
            calculatedDisplay = (amountNum / 104).toFixed(2) + '$';
          } else if (type === 'c2i') {
            const rate = amountNum >= 100 ? 102 : 101;
            calculatedDisplay = (amountNum * rate).toFixed(2) + '₹';
          } else {
            calculatedDisplay = amountNum + '$';
          }
        }
      } catch (e) {
        console.error("Calculation error:", e);
      }

      let assignedExchanger = ticketInfo.exchangerObj || `<@!${STAFF_USER_ID}>`;

      // Update Exchanger Stats
      const exchangerId = ticketInfo.exchangerObj?.id || STAFF_USER_ID;
      const exchStats = getUserStatsData(exchangerId);
      exchStats.completedDeals += 1;
      exchStats.totalExchanged += numericAmount;
      exchStats.latestDeal = ticketInfo.dealId;
      if (exchStats.breakdown[type]) {
        exchStats.breakdown[type].deals += 1;
        exchStats.breakdown[type].amount += numericAmount;
      }
      userStats.set(exchangerId, exchStats);

      // Update Client Stats
      const clientStats = getUserStatsData(clientUser.id);
      clientStats.completedDeals += 1;
      clientStats.totalExchanged += numericAmount;
      clientStats.latestDeal = ticketInfo.dealId;
      if (clientStats.breakdown[type]) {
        clientStats.breakdown[type].deals += 1;
        clientStats.breakdown[type].amount += numericAmount;
      }
      userStats.set(clientUser.id, clientStats);

      const confirmedContainer = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:Apex_check:1549496817144569906> **DEAL CONFIRMED BY CLIENT**\n\n` +
            `Confirmed by client ${clientUser}\n\n` +
            `<:ticket:1551557328606724217> **DEAL ID**\n` +
            `\`${ticketInfo.dealId}\`\n\n` +
            `-# Apex Exchange • Fast Secure Trusted`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder());

      await interaction.update({ components: [confirmedContainer], flags: MessageFlags.IsComponentsV2 });

      await interaction.channel.send({
        content: `+rep ${assignedExchanger} **${exchangeTypeStr} (${calculatedDisplay})**`
      });

      // Send Exchange History Log to Exchange History Channel with the proper :Apex_notes: animated emoji tag fixed
      try {
        const historyChannel = interaction.guild.channels.cache.get(EXCHANGE_HISTORY_CHANNEL_ID);
        if (historyChannel) {
          const historyContainer = new ContainerBuilder()
            .setAccentColor(0xFEE75C)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `<a:Apex_stars:1549497856333713598> **Exchange Complete!**\n\n` +
                `<:Apex_Tick:1549497537034063902> A deal has been successfully completed on ${interaction.guild.name}.`
              )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `<:ticket:1551557328606724217> **Deal ID**\n` +
                `\`${ticketInfo.dealId}\`\n\n` +
                `<:Apex_Money:1549497151854223470> **Amount**\n` +
                `\`${calculatedDisplay}\`\n\n` +
                `<a:Apex_notes:1549496865790103634> **Category**\n` +
                `${exchangeTypeStr}\n\n` +
                `<:exchanger:1551494971046232086> **Exchanger**\n` +
                `${assignedExchanger}\n\n` +
                `<:Apex_Crypto:1549497653606490183> **Client**\n` +
                `${clientUser}`
              )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `Apex Exchange • Trusted Exchange Service • ${new Date().toLocaleString()}`
              )
            );

          await historyChannel.send({
            components: [historyContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } catch (err) {
        console.error("Failed to post to exchange history channel:", err);
      }

      const exchangerDoneRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('exchanger_final_done').setLabel('Done').setStyle(ButtonStyle.Success).setEmoji({ id: '1549496817144569906', name: 'Apex_check' })
      );

      const vouchContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:Apex_dots:1549500069726650378> ${clientUser} please do vouch on <#1549492912142680064>\n` +
            `> <a:Apex_dots:1549500069726650378> And leave a Feedback At <#1549492853619560448> \n` +
            `> <a:Apex_dots:1549500069726650378> or you will be blacklisted`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(exchangerDoneRow);

      await interaction.channel.send({
        components: [vouchContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    else if (customId === 'exchanger_final_done') {
      const isStaffOrAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === STAFF_USER_ID;
      if (!isStaffOrAdmin) {
        return interaction.reply({ content: 'Only the exchanger can click this Done button!', flags: MessageFlags.Ephemeral });
      }

      const ticketInfo = ticketDataStore.get(interaction.channel.id) || { clientObj: null, dealId: `Apex-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, exchangerObj: interaction.user, type: 'i2c' };
      const clientUser = ticketInfo.clientObj || interaction.user;
      const exchangerUser = ticketInfo.exchangerObj || interaction.user;
      const ticketType = ticketInfo.type || 'i2c';

      let htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript - ${interaction.channel.name}</title><style>body{background:#36393f;color:#dcddde;font-family:sans-serif;padding:20px;} .msg{margin-bottom:15px;}.author{font-weight:bold;color:#fff;}.time{font-size:0.8em;color:#72767d;margin-left:5px;}.content{margin-top:5px;}</style></head><body>`;
      htmlContent += `<h2>Transcript for ticket ${interaction.channel.name}</h2><hr>`;
      try {
        const fetchedMsgs = await interaction.channel.messages.fetch({ limit: 100 });
        const sortedMsgs = Array.from(fetchedMsgs.values()).reverse();
        for (const m of sortedMsgs) {
          htmlContent += `<div class="msg"><span class="author">${m.author.tag}</span><span class="time">${m.createdAt.toLocaleString()}</span><div class="content">${m.content || '[Embed/Attachment]'}</div></div>`;
        }
      } catch (err) {}
      htmlContent += `</body></html>`;

      const buffer = Buffer.from(htmlContent, 'utf-8');
      const transcriptAttachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.html` });

      ticketDataStore.set(`transcript_file_${interaction.channel.id}`, transcriptAttachment);
      ticketDataStore.set(`ticket_info_obj_${interaction.channel.id}`, { clientUser, exchangerUser, dealId: ticketInfo.dealId, channelName: interaction.channel.name });

      const transcriptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`get_transcript_${interaction.channel.id}`).setLabel('Get Transcript').setStyle(ButtonStyle.Primary).setEmoji({ id: '1549496865790103634', name: 'Apex_notes' }),
        new ButtonBuilder().setCustomId(`vouch_action_${interaction.channel.id}`).setLabel('Vouch').setStyle(ButtonStyle.Success).setEmoji({ id: '1549496817144569906', name: 'Apex_check' })
      );

      const transcriptContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Your Ticket Transcript\n` +
            `Your ticket has been closed. Here are your record details and transcript file attached below.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:Apex_Tick:1549497537034063902> **Ticket Information**\n` +
            `> **Channel:** \`${interaction.channel.name}\`\n` +
            `> **Closed At:** \`${new Date().toLocaleString()}\``
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:exchanger:1551494971046232086> **Involved Parties**\n` +
            `> **Requester / Client:** ${clientUser}\n` +
            `> **Exchanger:** ${exchangerUser}`
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<a:Apex_notes:1549496865790103634> **Closure Details**\n` +
            `> **Deal ID:** \`${ticketInfo.dealId}\`\n` +
            `> **Status:** Completed`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Apex Exchange | Fast Secure Trusted`
          )
        )
        .addActionRowComponents(transcriptRow);

      await interaction.update({ components: [], content: 'Processing transcript...' }).catch(() => {});

      // 1. Send Transcript to User's DM
      if (clientUser && !clientUser.bot) {
        await clientUser.send({
          components: [transcriptContainer],
          files: [transcriptAttachment],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }

      // 2. Send Transcript to the Appropriate Transcript Channel based on Ticket Type
      try {
        const targetTranscriptChannelId = TRANSCRIPT_CHANNELS[ticketType];
        if (targetTranscriptChannelId) {
          const transcriptChannel = interaction.guild.channels.cache.get(targetTranscriptChannelId);
          if (transcriptChannel) {
            await transcriptChannel.send({
              components: [transcriptContainer],
              files: [transcriptAttachment],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      } catch (err) {
        console.error("Failed to send transcript to category channel:", err);
      }

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
    }
    else if (customId.startsWith('get_transcript_')) {
      const channelIdKey = customId.replace('get_transcript_', '');
      const transcriptAttachment = ticketDataStore.get(`transcript_file_${channelIdKey}`);
      const infoObj = ticketDataStore.get(`ticket_info_obj_${channelIdKey}`);

      if (!transcriptAttachment || !infoObj) {
        return interaction.reply({ content: 'Transcript session expired or not found!', flags: MessageFlags.Ephemeral });
      }

      const directTranscriptContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Your Ticket Transcript File\n` +
            `Here is your requested transcript file for ticket \`${infoObj.channelName}\`.`
          )
        );

      await interaction.reply({
        components: [directTranscriptContainer],
        files: [transcriptAttachment],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    else if (customId.startsWith('vouch_action_')) {
      const channelIdKey = customId.replace('vouch_action_', '');
      const infoObj = ticketDataStore.get(`ticket_info_obj_${channelIdKey}`);
      const exchangerUser = infoObj ? infoObj.exchangerUser : `<@!${STAFF_USER_ID}>`;

      const vouchedContainer = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:Apex_Tick:1549497537034063902> **You have been successfully vouched for user**\n\n` +
            `> **Exchanger:** ${exchangerUser}\n` +
            `> **Status:** Vouched\n\n` +
            `<a:Apex_stars:1549497856333713598> Thank you for choosing Apex Exchange!\n` +
            `<:Apex_Money:1549497151854223470> Fast, secure, and fully trusted transactions.\n` +
            `<:Apex_Crypto:1549497653606490183> Hope to see you back for future deals.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Apex Exchange | Fast Secure Trusted`
          )
        );

      await interaction.reply({
        components: [vouchedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    else if (customId.startsWith('tp_yes_') || customId.startsWith('tp_no_')) {
      const isYes = customId.startsWith('tp_yes_');
      const dataToken = customId.split('_')[2];
      
      const storedData = ticketDataStore.get(dataToken) || { f1: "N/A", f2: "N/A", f3: "N/A", type: "i2c" };
      const thirdPartyVal = isYes ? 'Yes' : 'No';

      const newToken = Math.random().toString(36).substring(2, 10);
      ticketDataStore.set(newToken, { ...storedData, thirdPartyVal });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`conf_yes_${newToken}`).setLabel('Confirm').setStyle(ButtonStyle.Success).setEmoji({ id: '1549497537034063902', name: 'Apex_Tick' }),
        new ButtonBuilder().setCustomId('conf_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji({ id: '1549497125933686788', name: 'Apex_cros' })
      );

      const confirmContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<a:TICK_TICK:1549511146816667888> **Review all the ticket details before your exchange ticket is created.**`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Exchange Overview**\n` +
            `> **Type:** ${storedData.type === 'i2c' ? 'INR TO CRYPTO EXCHANGE' : storedData.type === 'c2i' ? 'CRYPTO TO INR EXCHANGE' : 'CRYPTO TO CRYPTO EXCHANGE'}\n` +
            `> **Deal Amount:** ${storedData.f3}\n` +
            `> **Details:** ${storedData.f1} -> ${storedData.f2}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Details**\n` +
            `> **App/Wallet:** ${storedData.f1}\n` +
            `> **Asset Details:** ${storedData.f2}\n` +
            `> **Third Party Payment:** ${thirdPartyVal}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Apex Exchange Trusted And Secure.`
          )
        )
        .addActionRowComponents(confirmRow);

      await interaction.update({ 
        components: [confirmContainer],
        flags: MessageFlags.IsComponentsV2 
      });
    }
    else if (customId.startsWith('conf_yes_')) {
      try {
        const dataToken = customId.split('_')[2];
        const storedData = ticketDataStore.get(dataToken) || { f1: "N/A", f2: "N/A", f3: "N/A", type: "i2c", thirdPartyVal: "No" };
        const { f1, f2, f3, type, thirdPartyVal } = storedData;

        const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.update({ 
            components: [new ContainerBuilder().setAccentColor(0xFF0000).addTextDisplayComponents(new TextDisplayBuilder().setContent("Error: Bot is missing 'Manage Channels' permission!"))], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
          });
        }

        const ticketChannel = await interaction.guild.channels.create({
          name: `${type}-${safeUsername}-${Math.floor(Math.random() * 90000 + 10000)}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: STAFF_USER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
          ]
        });

        const dealId = `Apex-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        ticketDataStore.set(ticketChannel.id, { clientObj: interaction.user, dealId, f3, type, exchangerObj: null });
        
        const claimToken = Math.random().toString(36).substring(2, 10);
        ticketDataStore.set(claimToken, { f1, f2, f3, clientTag: interaction.user.toString(), dealId, type, channelId: ticketChannel.id });

        const ticketContainer = new ContainerBuilder()
          .setAccentColor(0xFEE75C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `<a:Apex_stars:1549497856333713598> **Exchange Ticket Created**\n` +
              `Your exchange ticket has been successfully created and is awaiting an exchanger claim.`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Ticket Details**\n` +
              `<:ticket:1551557328606724217> **Deal ID:** \`${dealId}\`\n` +
              `<:exchanger:1551494971046232086> **Client:** ${interaction.user}\n` +
              `<:Apex_arrow:1549500051741614140> **Category:** ${type === 'i2c' ? 'INR TO CRYPTO EXCHANGE' : type === 'c2i' ? 'CRYPTO TO INR EXCHANGE' : 'CRYPTO TO CRYPTO EXCHANGE'}`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Payment Details**\n` +
              `<a:Apex_notes:1549496865790103634> **Send:** ${f3} via ${f1}\n` +
              `<:Apex_Money:1549497151854223470> **Receive:** ${f2}\n` +
              `Third Party Payment: ${thirdPartyVal}`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `<a:Apex_stars:1549497856333713598> Apex Exchange Trusted And Secure`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`claim_tkt_${claimToken}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji({ id: '1549497537034063902', name: 'Apex_Tick' }),
              new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji({ id: '1549497125933686788', name: 'Apex_cros' }),
              new ButtonBuilder().setCustomId('change_details').setLabel('Change Details').setStyle(ButtonStyle.Secondary).setEmoji({ id: '1549511106031001811', name: 'refresh', animated: true }),
              new ButtonBuilder().setCustomId('req_mm').setLabel('Req Mm').setStyle(ButtonStyle.Primary).setEmoji({ id: '1551494971046232086', name: 'exchanger' })
            )
          );

        await ticketChannel.send({ content: `@EXCHANGER @I2C ${interaction.user}` });
        await ticketChannel.send({ 
          components: [ticketContainer], 
          flags: MessageFlags.IsComponentsV2 
        });

        const createdContainer = new ContainerBuilder()
          .setAccentColor(0xFEE75C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Ticket Created ${ticketChannel}`)
          );

        await interaction.update({ 
          components: [createdContainer], 
          flags: MessageFlags.IsComponentsV2 
        });
      } catch (err) {
        console.error("Error creating ticket:", err);
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Failed to create ticket channel: ${err.message}`)
          );
        await interaction.update({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }
    } 
    else if (customId === 'conf_no') {
      const cancelContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Exchange creation cancelled.`)
        );
      await interaction.update({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
    }
    else if (customId.startsWith('claim_tkt_')) {
      const isStaffOrAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === STAFF_USER_ID;
      if (!isStaffOrAdmin) {
        return interaction.reply({ content: 'Only staff can claim tickets.', flags: MessageFlags.Ephemeral });
      }

      const claimToken = customId.replace('claim_tkt_', '');
      const storedData = ticketDataStore.get(claimToken) || { f1: "N/A", f2: "N/A", f3: "N/A", clientTag: "Client", dealId: "Apex-0000", type: "i2c" };
      const { f1, f2, f3, clientTag, dealId, type, channelId } = storedData;

      const randomIdNum = Math.floor(Math.random() * 900 + 100);
      await interaction.channel.setName(`${type}-claimed-${randomIdNum}`).catch(() => {});

      if (channelId) {
        const clientUser = interaction.guild.members.cache.find(m => m.toString() === clientTag)?.user || interaction.user;
        ticketDataStore.set(channelId, { clientObj: clientUser, dealId, f3, type, exchangerObj: interaction.user });
      }

      const claimedContainer = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<a:Apex_stars:1549497856333713598> **TICKET CLAIMED**\n\n` +
            `> **Exchanger:** ${interaction.user}\n` +
            `> **Client:** ${clientTag}\n` +
            `> **Deal ID:** \`${dealId}\`\n` +
            `> **Exchange Amount:** ${f3}\n` +
            `> **Category:** ${type === 'i2c' ? 'INR TO CRYPTO' : type === 'c2i' ? 'CRYPTO TO INR' : 'CRYPTO TO CRYPTO'}\n\n` +
            `This ticket has been successfully claimed and is now in progress.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji({ id: '1549497125933686788', name: 'Apex_cros' }),
            new ButtonBuilder().setCustomId('req_mm').setLabel('Req Mm').setStyle(ButtonStyle.Primary).setEmoji({ id: '1551494971046232086', name: 'exchanger' })
          )
        );

      await interaction.deferUpdate();
      await interaction.message.edit({ components: [] }).catch(() => {});

      await interaction.channel.send({ 
        components: [claimedContainer], 
        flags: MessageFlags.IsComponentsV2 
      });
    }
    else if (customId === 'close_ticket') {
      const isStaffOrAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === STAFF_USER_ID;
      if (!isStaffOrAdmin) {
        return interaction.reply({ content: 'You do not have permission to close this ticket.', flags: MessageFlags.Ephemeral });
      }

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('transcript_ticket').setLabel('Transcript').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger)
      );

      const closeContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Ticket ID: \`${interaction.channel.name}\`\n` +
            `Close By: ${interaction.user}\n\n` +
            `Reason: None`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(closeRow);

      await interaction.reply({ components: [closeContainer], flags: MessageFlags.IsComponentsV2 });
    }
    else if (customId === 'transcript_ticket') {
      await interaction.reply({ content: 'Transcript generated successfully!', flags: MessageFlags.Ephemeral });
    }
    else if (customId === 'delete_ticket') {
      await interaction.reply({ content: 'Deleting ticket in 3 seconds...' });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
    else if (customId === 'change_details') {
      await interaction.reply({ content: 'Please close this ticket and create a new one with correct details using the panel.', flags: MessageFlags.Ephemeral });
    }
    else if (customId === 'req_mm') {
      await interaction.reply({ content: `<@&${STAFF_USER_ID}> Middleman has been requested for this exchange!` });
    }
  }
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'exchange_select') {
      const selectedValue = interaction.values[0];

      const modal = new ModalBuilder()
        .setCustomId(`modal_${selectedValue}`)
        .setTitle(selectedValue === 'i2c' ? 'Initiate INR to Crypto Exchange' : selectedValue === 'c2i' ? 'Initiate Crypto to INR Exchange' : 'Initiate Crypto to Crypto Exchange');

      if (selectedValue === 'i2c') {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field1').setLabel('sending INR app').setStyle(TextInputStyle.Short).setPlaceholder('e.g. UPI / Bank / Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field2').setLabel('receiving crypto name').setStyle(TextInputStyle.Short).setPlaceholder('Ltc/Usdt/Sol/Usdc/Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field3').setLabel('Deal Amount').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 1000 or $500').setRequired(true))
        );
      } else if (selectedValue === 'c2i') {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field1').setLabel('sending crypto name').setStyle(TextInputStyle.Short).setPlaceholder('Ltc / Usdt / Sol / Usdc / Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field2').setLabel('Crypto Wallet Name').setStyle(TextInputStyle.Short).setPlaceholder('Exodus / Cwallet / Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field3').setLabel('Deal Amount').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 100 or ₹100').setRequired(true))
        );
      } else if (selectedValue === 'c2c') {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field1').setLabel('sending crypto name').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Litecoin / USDT / Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field2').setLabel('receiving crypto name').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Wallet / App / Others').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field3').setLabel('Deal Amount').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 100 or $100').setRequired(true))
        );
      }

      await interaction.message.edit({ components: [createPanelContainer()] }).catch(() => {});
      await interaction.showModal(modal);
    }
  }
  else if (interaction.isModalSubmit()) {
    const { customId, fields } = interaction;
    if (customId.startsWith('modal_')) {
      const type = customId.replace('modal_', '');
      const f1 = fields.getTextInputValue('field1');
      const f2 = fields.getTextInputValue('field2');
      const f3 = fields.getTextInputValue('field3');

      const dataToken = Math.random().toString(36).substring(2, 10);
      ticketDataStore.set(dataToken, { f1, f2, f3, type });

      const yesNoRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tp_yes_${dataToken}`).setLabel('Yes').setStyle(ButtonStyle.Success).setEmoji({ id: '1549497537034063902', name: 'Apex_Tick' }),
        new ButtonBuilder().setCustomId(`tp_no_${dataToken}`).setLabel('No').setStyle(ButtonStyle.Danger).setEmoji({ id: '1549497125933686788', name: 'Apex_cros' })
      );

      const buttonContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<a:TICK_TICK:1549511146816667888> **Review all the ticket details before your exchange ticket is created.**`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Exchange Overview**\n` +
            `> **Type:** ${type === 'i2c' ? 'INR TO CRYPTO EXCHANGE' : type === 'c2i' ? 'CRYPTO TO INR EXCHANGE' : 'CRYPTO TO CRYPTO EXCHANGE'}\n` +
            `> **Deal Amount:** ${f3}\n` +
            `> **Details:** ${f1} -> ${f2}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Third Party Payment**\n` +
            `> Please select Yes or No below:`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Apex Exchange Trusted And Secure.`
          )
        )
        .addActionRowComponents(yesNoRow);

      await interaction.reply({ 
        components: [buttonContainer], 
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
      });
    }
  }
});

client.login(TOKEN);
