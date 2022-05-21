const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const CLIENT_ID = '977333092110979092';
const GUILD_ID = '977333696917041193';
const GENERAL_CHANNEL_ID = '977333697357422622';
const cron = require("cron");
const moment = require("moment");

const commands = [{
    name: 'scan',
    description: 'Summarize a Solana biggest wallets scan'
}, {
    name: 'fullscan',
    description: 'Perform a deep tsx scan'
}];
const rest = new REST({ version: '9' }).setToken('OTc3MzMzMDkyMTEwOTc5MDky.Gtpi13.vwz41yjbkBspyQtbNUoc7A8_VVLVBUbQsYeqqg');

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const job = new cron.CronJob('0 0 1 * * *', () => {
    scan();
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    job.start();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    if (interaction.commandName === 'scan') {
        await manualScan(interaction);
    }
    if (interaction.commandName === 'fullscan') {
        await fullScan(interaction);
    }
});

/* ------ LOGIC START ------ */

async function fullScan(msg) {

    if (!msg.member.roles.cache.some(r => r.name === "VIP")) {
        msg.reply("You can't use this command!");
    }

    const res = await callScan();
    if (res.length == 0) return;
    var outputString = '';
    outputString += "Timeframe [1h][Mode: full]";
    outputString += "Analyzed wallet [41]\n";
    res.forEach(function (obj) {
        if (outputString.length > 3500) {
            var exampleEmbed = new MessageEmbed()
                .setColor('#0000A3')
                .setDescription(outputString);
            msg.channel.send({ embeds: [exampleEmbed] });
            outputString = '';
        }
        outputString += `\nWallet [${obj.wallet}] ${obj.operazione} ${obj.target}`;
    });
    var exampleEmbed = new MessageEmbed()
        .setColor('#0000A3')
        .setDescription(outputString);
    return msg.channel.send({ embeds: [exampleEmbed] });
};

async function scan() {

    const res = await callScan();
    if (res.length == 0) return;
    var outputString = '';
    var nowH = moment(new Date()).format('HH:mm:ss a');
    var beforeH = moment(subtractHours(1, new Date())).format('HH:mm:ss a');
    outputString += "Timeframe [1h][" + nowH + " - " + beforeH + "]\n";
    outputString += "Analyzed wallet [41]\n";
    const account = res.reduce((acc, cur) => {
        const idx = cur.id;
        if (acc[idx]) acc[idx].push(cur); // if already there, just push
        else acc[idx] = [cur];            // otherwise initialise
        return acc;
    }, [])

    account.forEach(function (obj) {

        var wallet = obj[0].wallet;
        var helper = {};
        var result = obj.reduce(function (r, o) {
            var key = o.operazione + " - " + trimNftName(o.target);
            if (!helper[key]) {
                helper[key] = { "oprazione": o.operazione, "target": trimNftName(o.target), "occurence": 1 }
                r.push(helper[key]);
            } else {
                helper[key].occurence += 1;
            }
            return r;
        }, []);

        result.forEach(function (inn) {
            if (outputString.length > 3500) {
                var exampleEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setDescription(outputString);
                client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
                outputString = '';
            }
            outputString += `\nWallet [${wallet}] ${inn.oprazione} ${inn.target} ${inn.occurence} times`;
        });
    });
    //return msg.channel.createMessage(```md\n${outputString}```);

    var exampleEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription(outputString);
    return client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
};

async function manualScan(msg) {

    const res = await callScan();
    if (res.length == 0) return;
    var outputString = '';
    outputString += "Timeframe [1h][Mode: manual]\n";
    outputString += "Analyzed wallet [41]\n";
    const account = res.reduce((acc, cur) => {
        const idx = cur.id;
        if (acc[idx]) acc[idx].push(cur); // if already there, just push
        else acc[idx] = [cur];            // otherwise initialise
        return acc;
    }, [])

    account.forEach(function (obj) {

        var wallet = obj[0].wallet;
        var helper = {};
        var result = obj.reduce(function (r, o) {
            var key = o.operazione + " - " + trimNftName(o.target);
            if (!helper[key]) {
                helper[key] = { "oprazione": o.operazione, "target": trimNftName(o.target), "occurence": 1 }
                r.push(helper[key]);
            } else {
                helper[key].occurence += 1;
            }
            return r;
        }, []);

        result.forEach(function (inn) {
            if (outputString.length > 3500) {
                var exampleEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setDescription(outputString);
                msg.channel.send({ embeds: [exampleEmbed] });
                outputString = '';
            }
            var op = inn.oprazione == "ha comprato" ? "bought" : "sold"; 
            outputString += `\nWallet [*${wallet}*] ${op} **${inn.occurence} ${inn.target}**`;
        });
    });
    //return msg.channel.createMessage(```md\n${outputString}```);

    var exampleEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription(outputString);
    return msg.channel.send({ embeds: [exampleEmbed] });
};

/* ------ LOGIC END ------ */

async function callScan() {
    return new Promise(function (resolve, reject) {
        axios.get('http://localhost:3000/scan')
            .then(response => {
                resolve(JSON.parse(JSON.stringify(response.data)));
            })
            .catch(error => {
                console.log(error);
            });
    })
}

function trimNftName(name) {
    return name.substring(0, name.indexOf(' #'));
}

function groupArrayOfObjects(list, key) {
    return list.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

function subtractHours(numOfHours, date = new Date()) {
    date.setHours(date.getHours() - numOfHours);
    return date;
}

client.login('OTc3MzMzMDkyMTEwOTc5MDky.Gtpi13.vwz41yjbkBspyQtbNUoc7A8_VVLVBUbQsYeqqg');
