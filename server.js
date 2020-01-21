process.env.NTBA_FIX_319 = 1;

// link: http://t.me/lunchPickerMyBot
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_KEY;
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];

  bot.sendMessage(chatId, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Received your message');
});
