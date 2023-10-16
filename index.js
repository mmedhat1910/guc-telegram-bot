const express = require('express');
const app = express();
const axios = require('axios');
const path = require('path');
const port = process.env.PORT || 8080;
app.use(express.static('static'));
app.use(express.json());
require('dotenv').config();

const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
let chatId = '';
bot.start((ctx) => {
  console.log(ctx.message.chat.id);
  chatId = ctx.message.chat.id;
  ctx.reply('Welcome');
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
