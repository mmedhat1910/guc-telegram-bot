const express = require('express');
const app = express();
const axios = require('axios');
const path = require('path');
const puppeteer = require('puppeteer');
const morgan = require('morgan');
const prompt = require('prompt');

const fs = require('fs');

const port = process.env.PORT || 8080;
app.use(express.static('static'));
app.use(express.json());
require('dotenv').config();

const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const jsonFile = require('./data.json');

const bot = new Telegraf(process.env.BOT_TOKEN);
let chatId = '';
bot.start((ctx) => {
  console.log('Bot initiated', ctx.message.chat.id);
  chatId = ctx.message.chat.id;
  ctx.reply('Welcome');
});

bot.command('username', (ctx) => {
  ctx.reply('Please enter your username');
  bot.on(message('text'), (ctx) => {
    const username = ctx.message.text;

    const jsonFile = require('./data.json');
    jsonFile.username = username;
    fs.writeFile('data.json', JSON.stringify(jsonFile), (err) => {
      if (err) throw err;
      console.log('Data written to file');
    });
  });
});

bot.command('password', (ctx) => {
  ctx.reply('Please enter your password');
  bot.on(message('text'), (ctx) => {
    const password = ctx.message.text;

    const jsonFile = require('./data.json');
    jsonFile.password = password;
    fs.writeFile('data.json', JSON.stringify(jsonFile), (err) => {
      if (err) throw err;
      console.log('Data written to file');
    });
  });
});

bot.command('login', (ctx) => {
  console.log('Logging in');
  const jsonFile = require('./data.json');
  const username = jsonFile.username;
  const password = jsonFile.password;
  ctx.reply(`Logged in! ${username} ${password}`);
});

bot.launch();
app.get('/', (req, res) => {
  res.json(bot.botInfo);
});

app.post('/', (req, res) => {
  try {
    if (chatId === '') {
      res.end('error, chatId not set');
      return;
    }
    const { message } = req.body;
    bot.telegram.sendMessage(chatId, 'Received your message: ' + message);
    res.end('ok');
  } catch (e) {
    console.log(e);
    res.end('error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
