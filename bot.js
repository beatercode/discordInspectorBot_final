const eris = require('eris');
const axios = require('axios');
const { MessageEmbed } = require('discord.js');
const PREFIX = '!';

// Create a Client instance with our bot token.
const bot = new eris.Client('OTc3MzMzMDkyMTEwOTc5MDky.Gtpi13.vwz41yjbkBspyQtbNUoc7A8_VVLVBUbQsYeqqg');

// When the bot is connected and ready, log to console.
bot.on('ready', () => {
    console.log('Connected and ready.');
});

const commandHandlerForCommandName = {};
commandHandlerForCommandName['fullscan'] = async (msg) => {
    const res = await callScan();
    if (res.length == 0) return;
    var outputString = '';
    outputString += "Timeframe [24h]\n";
    outputString += "Analyzed wallet [41]\n";
    res.forEach(function (obj) {
        if (outputString.length > 1500) {
            msg.channel.createMessage(outputString);
            outputString = '';
        }
        outputString += `\nWallet [${obj.wallet}] ${obj.operazione} ${obj.target}`;
    });
    return msg.channel.createMessage(outputString);
};
commandHandlerForCommandName['scan'] = async (msg) => {

    const res = await callScan();
    if (res.length == 0) return;
    var outputString = '';
    outputString += "Timeframe [24h]\n";
    outputString += "Analyzed wallet [41]\n";
    const account = res.reduce((acc, cur) => {
        const idx = cur.id;
        if (acc[idx]) acc[idx].push(cur); // if already there, just push
        else acc[idx] = [cur];            // otherwise initialise
        return acc;
    }, [])

    /*
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
            if (outputString.length > 1500) {
                msg.channel.createMessage(```md\n${outputString}```);
                outputString = '';
            }
            outputString += `\nWallet [${wallet}] ${inn.oprazione} ${inn.target} ${inn.occurence} times`;
        });
    });
    return msg.channel.createMessage(```md\n${outputString}```);
    */
    const exampleEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Some title')
        .setURL('https://discord.js.org/')
        .setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
        .setDescription('Some description here')
        .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .addFields(
            { name: 'Regular field title', value: 'Some value here' },
            { name: '\u200B', value: '\u200B' },
            { name: 'Inline field title', value: 'Some value here', inline: true },
            { name: 'Inline field title', value: 'Some value here', inline: true },
        )
        .addField('Inline field title', 'Some value here', true)
        .setImage('https://i.imgur.com/AfFp7pu.png')
        .setTimestamp()
        .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

    client.channels.cache.get('id').send({ embeds: [exampleEmbed] });
};

// Every time a message is sent anywhere the bot is present,
// this event will fire and we will check if the bot was mentioned.
// If it was, the bot will attempt to respond with "Present".
bot.on('messageCreate', async (msg) => {

    const content = msg.content;
    if (!msg.channel.guild) {
        return;
    }
    if (!content.startsWith(PREFIX)) {
        return;
    }

    const parts = content.split(' ').map(s => s.trim()).filter(s => s);
    const commandName = parts[0].substr(PREFIX.length);

    const commandHandler = commandHandlerForCommandName[commandName];
    if (!commandHandler) {
        return;
    }
    try {
        await commandHandler(msg);
    } catch (err) {
        console.warn('Error handling command');
        console.warn(err);
    }
});

bot.on('error', err => {
    console.warn(err);
});

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

/* ---- LAUNCH BOT ------ */

bot.connect();