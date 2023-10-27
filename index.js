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

//check if data.json doesn't exist and create it
if (!fs.existsSync('./data.json')) {
  fs.writeFile(
    'data.json',
    JSON.stringify({
      username: '',
      password: '',
    }),
    (err) => {
      if (err) throw err;
      console.log('data.json created');
    }
  );
}

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
  console.log('username', username);
  console.log('password', hidePassword(password));
  ctx.reply(`Logged in! ${username} ${hidePassword(password)}`);
});

const hidePassword = (password) => {
  if (password.length < 4) {
    return '****';
  }
  let hiddenPassword = password[0] + password[1];
  for (let i = 2; i < password.length - 2; i++) {
    hiddenPassword += '*';
  }
  return (
    hiddenPassword +
    password[password.length - 2] +
    password[password.length - 1]
  );
};
bot.command('check', (ctx) => {
  fetchEmails((data) => {
    ctx.reply(data);
  });
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

const fetchEmails = async (fn) => {
  const jsonFile = require('./data.json');
  const username = jsonFile.username;
  const password = jsonFile.password;
  const unread = jsonFile.unread || '-1';

  if (!username || username === '' || !password || password === '') {
    console.log('Please enter your username and password');
    if (fn) {
      fn('Please enter your username and password');
    }
    return;
  }

  console.log('Waiting...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto(
      'https://mail.guc.edu.eg/owa/auth/logon.aspx?replaceCurrent=1&url=https%3a%2f%2fmail.guc.edu.eg%2fowa%2f',
      { waitUntil: 'networkidle2' }
    );
    await page.focus('#username');
    await page.keyboard.type(username);
    await page.focus('#password');
    await page.keyboard.type(password);
    await page.click('.signinbutton');
    console.log('Logged in, retrieving emails...');
    fn('Logged in, retrieving emails...');
    await page.waitForXPath('//*[@id="frm"]');
    await page.waitForSelector('a[name="lnkFldr"]');
    let data = await page.evaluate(() => {
      // return document.querySelector('span[id=spnCV]').innerText;
      const unread = document.querySelector('span[class="unrd"]');
      if(unread === null || unread === undefined){
        console.log('No new emails');
        if (fn) {
          fn('No new emails');
        }
        return;
      }
      return unread.innerText;
    })
    data = data.replace('(', '');
    data = data.replace(')', '');
    console.log(data);
    let num = parseInt(data);
    if(num != unread){
      console.log(num + ' New email(s)!');
      if (fn) {
        fn(num+' New email(s)!');
      }
      jsonFile.unread = num;
      fs.writeFile('data.json', JSON.stringify(jsonFile), (err) => {
        if (err) throw err;
        console.log('Data written to file');
      });
    }
    else{
      console.log('No new emails');
      if (fn) {
        fn('No new emails');
      }
    }
  } catch (e) {
    console.error(e);
    if (fn) {
      fn('Error' + e.message);
    }
    return;
  } finally {
      await browser.close();
  }
};

///html/body/form/table/tbody/tr[2]/td[1]/table/tbody/tr[2]/td/table/tbody/tr/td/table[1]/tbody/tr[3]/td/a
////*[@id="frm"]/table/tbody/tr[2]/td[1]/table/tbody/tr[2]/td/table/tbody/tr/td/table[1]/tbody/tr[3]/td/a
//#frm > table > tbody > tr:nth-child(2) > td.nvtp > table > tbody > tr:nth-child(2) > td > table > tbody > tr > td > table.snt > tbody > tr:nth-child(3) > td > a
///html/body/form/table/tbody/tr[2]/td[1]/table/tbody/tr[2]/td/table/tbody/tr/td/table[1]/tbody/tr[3]/td