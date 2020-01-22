process.env.NTBA_FIX_319 = 1;

// bot name: lunchPickerMyBot
// link: http://t.me/lunchPickerMyBot
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const _ = require('lodash');

const token = process.env.TELEGRAM_BOT_KEY;
const bot = new TelegramBot(token, {polling: true});

const ROOT_URL = `https://lunch-picker-api.herokuapp.com`;

let answerCallbacks = {};

function getAvailableCountry() {
  const availableCountry = [
      "Argentina",
      "Australia",
      "Austria",
      "Belgium",
      "Brazil",
      "Canada",
      "Chile",
      "Czech Republic",
      "Denmark",
      "Finland",
      "France",
      "Germany",
      "Hong Kong",
      "Italy",
      "Japan",
      "Malaysia",
      "Mexico",
      "New Zealand",
      "Norway",
      "Philippines",
      "Poland",
      "Portugal",
      "Republic of Ireland",
      "Singapore",
      "Spain",
      "Sweden",
      "Switzerland",
      "Taiwan",
      "The Netherlands",
      "Turkey",
      "United Kingdom",
      "United States"
    ];

    const availableCountryText = `Available country:\n${availableCountry.join(', ')}`;
    return availableCountryText;
}

async function findRestaurantsByLocation(term, location) {
  let result = null;

  const response = await axios.get(
    `${ROOT_URL}/api/restaurant/find-restaurants-by-location`,
    {
      params: {
        term: term,
        location: location
      },
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (!_.isEmpty(response)) {
    result = response.data.restaurants;
  }

  return result;
}

async function findRestaurantByPhone(phone) {
  let result = null;

  const response = await axios.get(
    `${ROOT_URL}/api/restaurant/find-restaurant-by-phone`,
    {
      params: {
        phone: phone
      },
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (!_.isEmpty(response)) {
    result = response.data.restaurant;
  }

  return result;
}

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const availableCountryText = getAvailableCountry();
  const response = `
    ### Example command ###
/start
Show all example command

/findRestaurantsByPlaces
Find restaurants by places

/findRestaurantByPhone
Find restaurant by phone

${availableCountryText}
  `;

  await bot.sendMessage(chatId, response, {
    "reply_markup": {
      "keyboard": [["/start"], ["/findRestaurantsByPlaces"], ["/findRestaurantByPhone"]]
    }
  });
});

// /findRestaurantsByPlaces
bot.onText(/\/findRestaurantsByPlaces/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please enter your food category:').then(() => {
    answerCallbacks[chatId] = async (answer) => {
      const term = answer.text;

      if (!_.isEmpty(term) && !term.includes('/')) {
        bot.sendMessage(chatId, 'Please enter your location (address, city, place, street name, zip code, country, state, building name, etc...):').then(() => {
          answerCallbacks[chatId] = async (answer) => {
            const location = answer.text;

            await bot.sendMessage(chatId, 'Please wait...');

            try {
              if (!_.isEmpty(term) && !_.isEmpty(location)) {
                const result = await findRestaurantsByLocation(term, location);
                if (!_.isEmpty(result.businesses)) {
                  result.businesses.forEach(async (item, i) => {
                    const name = item.name;
                    const rating = item.rating;
                    const phone = item.display_phone;
                    const locationStr = item.location.display_address.join(', ');
                    const url = item.url;

                    const resultMessage = `
                      <b>Name:</b> ${name}
<b>Rating:</b> ${rating}
<b>Phone:</b> ${phone}
<b>Address:</b> ${locationStr}
<b>Url:</b> <a href="${url}">Open url</a>
                    `;
                    await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
                  });
                } else {
                    const resultMessage = `There are no results. /findRestaurantsByPlaces`;
                    await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
                }
              }
            } catch (e) {
              console.log(`error = ${e.message}`);
              const resultMessage = `Food category or location is not valid. /findRestaurantsByPlaces`;
              await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
            }
          }
        });
      } else {
        const resultMessage = `Invalid food category. /findRestaurantsByPlaces`;
        await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
      }
    }
  });
});

// /findRestaurantByPhone
bot.onText(/\/findRestaurantByPhone/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please enter restaurant phone (with country code):').then(() => {
    answerCallbacks[chatId] = async (answer) => {
      const phone = answer.text.replace(/\s/g, "");

      if (!_.isEmpty(phone) && /^[+\d]+$/.test(phone)) {
        await bot.sendMessage(chatId, 'Please wait...');

        const result = await findRestaurantByPhone(phone);
        if (!_.isEmpty(result.businesses)) {
          const item = result.businesses[0];

          const name = item.name;
          const imageUrl = item.image_url;
          const rating = item.rating;
          const latitude = item.coordinates.latitude;
          const longitude = item.coordinates.longitude;
          const phone = item.display_phone;
          const locationStr = item.location.display_address.join(', ');
          const url = item.url;

          const resultMessage = `
            <b>Name:</b> ${name}
<b>Rating:</b> ${rating}
<b>Phone:</b> ${phone}
<b>Address:</b> ${locationStr}
<b>Url:</b> <a href="${url}">Open url</a>
          `;
          await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
          await bot.sendVenue(chatId, latitude, longitude, name, locationStr);
          await bot.sendPhoto(chatId, imageUrl);
        } else {
          const resultMessage = `There are no result. /findRestaurantByPhone`;
          await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
        }
      } else {
        const resultMessage = `Phone format is wrong. /findRestaurantByPhone`;
        await bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
      }
    }
  });
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  const callback = answerCallbacks[chatId];
  if (callback) {
    delete answerCallbacks[chatId];
    return callback(msg);
  }
});

console.log('lunchPickerBot is running');
