const express = require('express');
const app = express();
const port = 8008;
const fs = require('fs');
const cronitor = require('cronitor')('cbaee3d8d9bb4bd090e5e26015a2813f');
const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const cron = require("node-cron");
const moment = require("moment");
const COMMAND_PREFIX = "/";
const AN_WALLET = 43;
const mySecret = process.env['token'];
const apiURL = 'https://daoinspectorserver.lucaminoi.repl.co/scan';
const monitor = new cronitor.Monitor('ODA Wallet Inspect - Discord Bot');
const { Client } = require('discord.js');
const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: ['GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILDS']
});
const target_id = '';
var wl_channels = [];
var cronSchedule = '05,35 */1 * * *';

cron.schedule(cronSchedule, () => {
    monitor.ping({ state: 'run' });
    try {
        if (wl_channels.length > 0) scan(0.5, 'a', null);
        monitor.ping({ state: 'complete' });
    } catch (e) {
        monitor.ping({ state: 'fail' });
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    wl_channels = fs.readFileSync("./data/channel.txt", 'utf-8');
    wl_channels = wl_channels.split('\n');
});

client.on("messageCreate", async message => {

    if (!message.content.startsWith(COMMAND_PREFIX)) return;

    const args = message.content.slice(COMMAND_PREFIX.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command == 'di' && args.length == 1) {
        if (args[0] == 'add' && !wl_channels.includes(message.channel.id)) {
            wl_channels.push(message.channel.id);
            fs.writeFileSync("./data/channel.txt", wl_channels.join("\n"),
                { encoding: 'utf8', flag: 'w' });
        }
        if (args[0] == 'rem' && wl_channels.includes(message.channel.id)) {
            index = wl_channels.indexOf(message.channel.id);
            wl_channels.splice(index, 1);
            fs.writeFileSync("./data/channel.txt", wl_channels.join("\n"),
                { encoding: 'utf8', flag: 'w' });
        }
      return;
    }

    var hLimit = 0.5;
    switch (command) {
        case 'fullscan':
            var name = '';
            var indexName = args.indexOf('n');
            var indexLimit = -1;
            if (args.includes('h')) indexLimit = args.indexOf('h');
            if (args.includes('m')) indexLimit = args.indexOf('m');
            if (indexName > -1) {
                if (args.length > indexName && isNaN(args[indexName + 1])) {
                    name = args[indexName + 1];
                }
            }
            if (indexLimit > -1) {
                if (args[indexLimit] == 'h' && args.length > indexLimit && !isNaN(args[indexLimit + 1])) {
                    hLimit = args[1];
                } else if (args[indexLimit] == 'm' && args.length > indexLimit && !isNaN(args[indexLimit + 1])) {
                    hLimit = Math.round((args[1] / 60) * 100) / 100;
                }
            }
            await fullScan(hLimit, name, message);
            break;
        case 'scan':
            if (args.length > 0) {
                if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
                    hLimit = args[1];
                } else if (args[0] == 'm' && args.length > 1 && !isNaN(args[1])) {
                    hLimit = Math.round((args[1] / 60) * 100) / 100;
                }
            }
            await scan(hLimit, 'm', message);
            break;
        case 'scanwallet':
            if (args.length > 0) {
                if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
                    hLimit = args[1];
                } else if (args[0] == 'm' && args.length > 1 && !isNaN(args[1])) {
                    hLimit = Math.round((args[1] / 60) * 100) / 100;
                }
            }
            await scanWallet(hLimit, message);
            break;
        case 'scancollection':
            var name = '';
            var indexName = args.indexOf('n');
            var indexLimit = -1;
            if (args.includes('h')) indexLimit = args.indexOf('h');
            if (args.includes('m')) indexLimit = args.indexOf('m');
            if (indexName > -1) {
                if (args.length > indexName && isNaN(args[indexName + 1])) {
                    name = args[indexName + 1];
                }
            }
            if (indexLimit > -1) {
                if (args[indexLimit] == 'h' && args.length > indexLimit && !isNaN(args[indexLimit + 1])) {
                    hLimit = args[1];
                } else if (args[indexLimit] == 'm' && args.length > indexLimit && !isNaN(args[indexLimit + 1])) {
                    hLimit = Math.round((args[1] / 60) * 100) / 100;
                }
            }
            await scanCollection(hLimit, name, message);
            break;
        default:
            break;
    }
})

app.get('/', (req, res) => res.send(`I'm alive!`));

app.listen(port, () => { });

//client.on("debug", ( e ) => console.log(e));

(async () => {
    client.login(mySecret);
})();

/* ------ LOGIC ------ */

async function fullScan(hoursLimit, name, message) {
    try {
        const res = await callScan();
        var outputString = '';
        var nowFixed = new Date().addHours(2);
        // create 'before', sub hoursLimit in seconds 
        var tempSec = (nowFixed.getTime() / 1000) - (60 * 60 * hoursLimit);
        // before back to date
        var beforeH = new Date(0);
        beforeH.setUTCSeconds(tempSec);
        beforeH = moment(beforeH).format('HH:mm:ss a');
        var nowH = moment(nowFixed).format('HH:mm:ss a');
        outputString += "[Mode: fullscan][" + hoursLimit + " h][" + beforeH + " - " + nowH + "]\n";
        outputString += "Analyzed wallet [" + AN_WALLET + "]\n";
        res.forEach(function (obj) {
            var hours = Math.abs(nowFixed - (new Date(obj.date)).addHours(2)) / 36e5;
            if (!(hours <= hoursLimit)) {
                return;
            }
            if (name != '' && !obj.target.toLowerCase().replace(/\s/g, '').includes(name.toLowerCase().replace(/\s/g, ''))) {
                return;
            }
            if (outputString.length > 3500) {
                var msgOutput = new MessageEmbed()
                    .setColor('#0000A3')
                    .setDescription(outputString);
                message.reply({ embeds: [msgOutput] });
                outputString = '';
            }
            var formattedDate = formatDate(new Date(obj.date));
            var operation = obj.operazione;// == 'bought' ? emoteBought() : emoteSold();
            var operationStart = obj.operazione == 'bought' ? emoteArrowBought() : emoteArrowSold();
            //var operationStart = obj.operazione == 'bought' ? '🟢' : '🔴';
            outputString += `\n${operationStart} Wallet [*${obj.wallet}*] ${operation} **${obj.target}** [*${formattedDate}*]`;
        });
        if (res.length == 0) outputString += `\nNo transaction found`;
        var msgOutput = new MessageEmbed()
            .setColor('#0000A3')
            .setDescription(outputString);
        return message.reply({ embeds: [msgOutput] });
    } catch (e) {
        console.log("Error: " + e);
    }
};

async function scan(hoursLimit, modal, message) {

    const res = await callScan();
    var outputString = '';
    var nowFixed = new Date().addHours(2);
    if (modal == 'a') {
        nowFixed = subtractMinutes(5, nowFixed);
        nowFixed.setSeconds(00);
    }
    // create 'before', sub hoursLimit in seconds 
    var tempSec = (nowFixed.getTime() / 1000) - (60 * 60 * hoursLimit);
    // before back to date
    var beforeH = new Date(0);
    beforeH.setUTCSeconds(tempSec);
    beforeH = moment(beforeH).format('HH:mm:ss a');
    var nowH = moment(nowFixed).format('HH:mm:ss a');
    outputString += "[Mode: scan][" + hoursLimit + " h][" + beforeH + " - " + nowH + "]\n";
    outputString += "Analyzed wallet [" + AN_WALLET + "]\n";
    const account = res.reduce((acc, cur) => {
        const idx = cur.id;
        if (acc[idx]) acc[idx].push(cur);
        else acc[idx] = [cur];
        return acc;
    }, [])

    var added = false;
    account.forEach(function (obj) {
        var wallet = obj[0].wallet;
        var helper = {};
        var result = [];
        result = obj.reduce(function (r, o) {
            var hours = Math.abs(nowFixed - (new Date(o.date)).addHours(2)) / 36e5;
            if (!(hours <= hoursLimit)) {
                return r;
            }
            var key = o.operazione + " - " + trimNftName(o.target);
            if (!helper[key]) {
                helper[key] = {
                    "operazione": o.operazione,
                    "target": trimNftName(o.target),
                    "occurence": 1
                }
                r.push(helper[key]);
            } else {
                helper[key].occurence += 1;
            }
            return r;
        }, []);

        result = result != null && result != undefined ? result : [];
        result.forEach(function (inn) {
            added = true;
            if (outputString.length > 3500) {
                var msgOutput = new MessageEmbed()
                    .setColor('#0099ff')
                    .setDescription(outputString);
                if(message == null) {
                  sendToWithlistedChannel(msgOutput);
                } else {
                  message.reply({ embeds: [msgOutput] });
                }
                outputString = '';
            }
            var operation = inn.operazione;// == 'bought' ? emoteBought() : emoteSold();
            var operationStart = inn.operazione == 'bought' ? emoteArrowBought() : emoteArrowSold();
            //var operationStart = inn.operazione == 'bought' ? '🟢' : '🔴';
            outputString += `\n${operationStart} Wallet [*${wallet}*] ${operation} **${inn.occurence} ${inn.target}**`;
        });
    });
    if (!added) outputString += `\nNo transaction found`;

    var msgOutput = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription(outputString);
    
    if(message == null) {
      return sendToWithlistedChannel(msgOutput);
    } else {
      return message.reply({ embeds: [msgOutput] });
    }
};

async function scanCollection(hoursLimit, name, message) {
    try {
        const res = await callScan();
        var outputString = '';
        var nowFixed = new Date().addHours(2);
        // create 'before', sub hoursLimit in seconds 
        var tempSec = (nowFixed.getTime() / 1000) - (60 * 60 * hoursLimit);
        // before back to date
        var beforeH = new Date(0);
        beforeH.setUTCSeconds(tempSec);
        beforeH = moment(beforeH).format('HH:mm:ss a');
        var nowH = moment(nowFixed).format('HH:mm:ss a');
        outputString += "[Mode: scancollection][" + hoursLimit + " h][" + beforeH + " - " + nowH + "]\n";
        outputString += "Analyzed wallet [" + AN_WALLET + "]\n";
        res.forEach(function (obj) {
            obj.target = trimNftName(obj.target);
        });

        var collection = [];
        var helper = {};
        collection = res.reduce(function (r, o) {
            var hours = Math.abs(nowFixed - (new Date(o.date)).addHours(2)) / 36e5;
            if (!(hours < hoursLimit)) {
                return r;
            }
            if (name != '' && !o.target.toLowerCase().replace(/\s/g, '').includes(name.toLowerCase().replace(/\s/g, ''))) {
                return r;
            }
            var key = o.operazione + " - " + o.target;
            if (!helper[key]) {
                helper[key] = {
                    "operazione": o.operazione,
                    "target": o.target,
                    "occurence": 1
                }
                r.push(helper[key]);
            } else {
                helper[key].occurence += 1;
            }
            return r;
        }, []);

        collection = collection != null && collection != undefined ? collection : [];
        var added = false;
        collection.forEach(function (inn) {
            var coll = inn.target;
            added = true;
            if (outputString.length > 3500) {
                var msgOutput = new MessageEmbed()
                    .setColor('#0099ff')
                    .setDescription(outputString);
                message.reply({ embeds: [msgOutput] });
                outputString = '';
            }
            var operation = inn.operazione;// == 'bought' ? emoteBought() : emoteSold();
            var operationStart = inn.operazione == 'bought' ? emoteArrowBought() : emoteArrowSold();
            //var operationStart = inn.operazione == 'bought' ? '🟢' : '🔴';
            outputString += `\n${operationStart} Collection [**${coll}**] ${operation} **${inn.occurence} times**`;
        });
        if (!added) outputString += `\nNo transaction found`;

        var msgOutput = new MessageEmbed()
            .setColor('#0099ff')
            .setDescription(outputString);
        return message.reply({ embeds: [msgOutput] });
    } catch (e) {
        console.log("Error: " + e);
    }
}

// TODO
async function scanWallet(hoursLimit, message) {

}

async function callScan() {
    return new Promise(function (resolve, reject) {
        axios.get(apiURL)
            .then(response => {
                resolve(JSON.parse(JSON.stringify(response.data)));
            })
            .catch(error => {
                console.log(error);
            });
    })
}

/* ------ UTIL ------ */

function trimNftName(name) {
    return (name.substring(0, name.indexOf(' #'))).replace(/[^\w\s]/gi, '');
}

function groupArrayOfObjects(list, key) {
    return list.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
        ].join('-') +
        ' ' + [
            padTo2Digits(date.getHours()),
            padTo2Digits(date.getMinutes()),
            padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}

function subtractMinutes(numOfMinutes, date = new Date()) {
    date.setMinutes(date.getMinutes() - numOfMinutes);
    return date;
}

function emoteSold() {
    return '' +
        '<:SOLD1_bg:979293309468041216>' +
        '<:SOLD2_bg:979293324152303636>' +
        '<:SOLD3_bg:979293339272757268>' +
        '<:SOLD4_bg:979293355211120650>';
}

function emoteBought() {
    return '' +
        '<:BOUGHT1_bg:979301639406096394>' +
        '<:BOUGHT2_bg:979301639410319360>' +
        '<:BOUGHT3_bg:979301639225737237>' +
        '<:BOUGHT4_bg:979301639347380234>' +
        '<:BOUGHT5_bg:979301639519363192>' +
        '<:BOUGHT6_bg:979301639385137182>';
}

function emoteArrowSold() {
    return '<:SARROWBG:979309246313300008>';
}

function emoteArrowBought() {
    return '<:BARROWBG:979370728212267008>';
}

function sendToWithlistedChannel(exampleEmbed) {
    wl_channels.forEach(x => {
        if (x != null && x != '') {
            var ch = client.channels.cache.get(x);
            ch.send({ embeds: [exampleEmbed] })
        }
    });
}

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}