const express = require('express');
const app = express();
const port = 8008;
const cronitor = require('cronitor')('cbaee3d8d9bb4bd090e5e26015a2813f');
const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const CLIENT_ID = '977333092110979092';
const GUILD_ID = '977333696917041193';
const GENERAL_CHANNEL_ID = '977333697357422622';
const cron = require("node-cron");
const moment = require("moment");
const COMMAND_PREFIX = "/";
const mySecret = 'OTc3MzMzMDkyMTEwOTc5MDky.GLzuJm.AnHrJQLOON28ws1AST16lLZnt-eAZLkF-uQCiI';
const apiURL = 'https://daoinspectorserver.lucaminoi.repl.co/scan';
const monitor = new cronitor.Monitor('ODA Wallet Inspect - Discord Bot');
const rest = new REST({ version: '9' }).setToken(mySecret);

const { Client, Intents } = require('discord.js');
const client = new Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  intents: ['DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILDS']
});

cron.schedule('00 */1 * * *', () => {
  monitor.ping({ state: 'run' });
  try {
    scan(1);
    monitor.ping({ state: 'complete' });
  } catch (e) {
    monitor.ping({ state: 'fail' });
  }
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async message => {

  if (!message.content.startsWith(COMMAND_PREFIX)) return;

  const args = message.content.slice(COMMAND_PREFIX.length).trim().split(' ');
  const command = args.shift().toLowerCase();
  switch (command) {
    case 'fullscan':
      var hLimit = 1;
      if (args.length > 0) {
        if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
          hLimit = args[1];
        }
      }
      await fullScan(hLimit);
      break;
    case 'scan':
      var hLimit = 1;
      if (args.length > 0) {
        if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
          hLimit = args[1];
        }
      }
      await scan(hLimit);
      break;
    case 'scanwallet':
      var hLimit = 1;
      if (args.length > 0) {
        if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
          hLimit = args[1];
        }
      }
      await scanWallet(hLimit);
      break;
    case 'scancollections':
      var hLimit = 1;
      if (args.length > 0) {
        if (args[0] == 'h' && args.length > 1 && !isNaN(args[1])) {
          hLimit = args[1];
        }
      }
      await scanCollections(hLimit);
      break;
    case 'scancollection':
      var name = '';
      var hLimit = 1;
      var indexName = args.indexOf('n');
      var indexLimit = args.indexOf('h');
      if (indexName > -1) {
        if (args.length > indexName && isNaN(args[indexName + 1])) {
          name = args[indexName + 1];
        }
      }
      if (indexLimit > -1) {
        if (args.length > indexLimit && !isNaN(args[indexLimit + 1])) {
          hLimit = args[indexLimit + 1];
        }
      }
      await scanCollection(hLimit, name);
      break;
    default:
      break;
  }
})

/* ------ LOGIC START ------ */

async function fullScan(hoursLimit) {

  try {
    const res = await callScan();
    var outputString = '';
    outputString += "Timeframe [" + hoursLimit + "h][Mode: full]\n";
    outputString += "Analyzed wallet [41]\n";
    res.forEach(function(obj) {
      var hours = Math.abs(new Date() - new Date(obj.date)) / 36e5;
      if (!(hours < hoursLimit)) {
        return;
      }
      if (outputString.length > 3500) {
        var exampleEmbed = new MessageEmbed()
          .setColor('#0000A3')
          .setDescription(outputString);
        client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
        outputString = '';
      }
      var formattedDate = formatDate(new Date(obj.date));
      outputString += `\nWallet [*${obj.wallet}*] ${obj.operazione} **${obj.target}** [*${formattedDate}*]`;
    });
    if (res.length == 0) outputString += `\nNo transaction found`;
    var exampleEmbed = new MessageEmbed()
      .setColor('#0000A3')
      .setDescription(outputString);
    return client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
  } catch (e) {
    console.log("Error: " + e);
  }
};

async function scan(hoursLimit) {
  try {
    const res = await callScan();
    var outputString = '';
    var nowH = new Date().addHours(2);
    nowH.setMinutes(0);
    nowH.setSeconds(0);
    nowH = moment(nowH).format('HH:mm:ss a');
    var beforeH = new Date().addHours(2);
    beforeH.setMinutes(0);
    beforeH.setSeconds(0);
    beforeH = moment(subtractHours(hoursLimit, beforeH)).format('HH:mm:ss a');
    outputString += "Timeframe [" + hoursLimit + "h][" + beforeH + " - " + nowH + "]\n";
    outputString += "Analyzed wallet [41]\n";
    const account = res.reduce((acc, cur) => {
      const idx = cur.id;
      if (acc[idx]) acc[idx].push(cur); // if already there, just push
      else acc[idx] = [cur];            // otherwise initialise
      return acc;
    }, [])

    var added = false;
    account.forEach(function(obj) {
      var wallet = obj[0].wallet;
      var helper = {};
      var result = [];
      result = obj.reduce(function(r, o) {
        var hours = Math.abs(new Date() - new Date(o.date)) / 36e5;
        if (!(hours < hoursLimit)) {
          return r;
        }
        var key = o.operazione + " - " + trimNftName(o.target);
        if (!helper[key]) {
          helper[key] = { "oprazione": o.operazione, "target": trimNftName(o.target), "occurence": 1 }
          r.push(helper[key]);
        } else {
          helper[key].occurence += 1;
        }
        return r;
      }, []);

      result = result != null && result != undefined ? result : [];
      result.forEach(function(inn) {
        added = true;
        if (outputString.length > 3500) {
          var exampleEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setDescription(outputString);
          client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
          outputString = '';
        }
        outputString += `\nWallet [*${wallet}*] ${inn.oprazione} **${inn.occurence} ${inn.target}**`;
      });
    });
    if (!added) outputString += `\nNo transaction found`;

    var exampleEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription(outputString);
    return client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
  } catch (e) {
    console.log("Error: " + e);
  }
};

async function scanCollection(hoursLimit, name) {
  try {
    const res = await callScan();
    var outputString = '';
    var nowH = new Date().addHours(2);
    nowH.setMinutes(0);
    nowH.setSeconds(0);
    nowH = moment(nowH).format('HH:mm:ss a');
    var beforeH = new Date().addHours(2);
    beforeH.setMinutes(0);
    beforeH.setSeconds(0);
    beforeH = moment(subtractHours(hoursLimit, beforeH)).format('HH:mm:ss a');
    outputString += "Timeframe [" + hoursLimit + "h][" + beforeH + " - " + nowH + "]\n";
    outputString += "Analyzed wallet [41]\n";
    res.forEach(function(obj) {
      obj.target = trimNftName(obj.target);
    });

    var collection = [];
    var helper = {};
    collection = res.reduce(function(r, o) {
      var hours = Math.abs(new Date() - new Date(o.date)) / 36e5;
      if (!(hours < hoursLimit)) {
        return r;
      }
      if (name != '' && name.toLowerCase().replace(/\s/g, '') != o.target.toLowerCase().replace(/\s/g, '')) {
        return r;
      }
      var key = o.operazione + " - " + o.target;
      if (!helper[key]) {
        helper[key] = { "oprazione": o.operazione, "target": o.target, "occurence": 1 }
        r.push(helper[key]);
      } else {
        helper[key].occurence += 1;
      }
      return r;
    }, []);

    collection = collection != null && collection != undefined ? collection : [];
    var added = false;
    collection.forEach(function(inn) {
      var coll = inn.target;
      added = true;
      if (outputString.length > 3500) {
        var exampleEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setDescription(outputString);
        client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
        outputString = '';
      }
      outputString += `\nCollection [**${coll}**] ${inn.oprazione} **${inn.occurence} times**`;
    });
    if (!added) outputString += `\nNo transaction found`;

    var exampleEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription(outputString);
    return client.channels.cache.get(GENERAL_CHANNEL_ID).send({ embeds: [exampleEmbed] });
  } catch (e) {
    console.log("Error: " + e);
  }
}

// TODO
async function scanWallet(hoursLimit) {

}

/* ------ LOGIC END ------ */

async function callScan() {
  return new Promise(function(resolve, reject) {
    axios.get(apiURL)
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
  return list.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

function subtractHours(numOfHours, date = new Date()) {
  date.setHours(date.getHours() - numOfHours);
  return date;
}

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
    ' ' +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(':')
  );
}

Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}

app.get('/', (req, res) => res.send(`I'm alive!`));

app.listen(port, () => {
});

client.login(mySecret);
