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

async function getCategories() {
  let result = null;

  const response = await axios.get(
    `${ROOT_URL}/api/category/get-categories`,
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
    result = response.data.categories;
  }

  return result;
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

async function findRestaurantsByLatLong(term) {
  let result = null;

  const response = await axios.get(
    `${ROOT_URL}/api/restaurant/find-restaurants-by-lat-long`,
    {
      params: {
        term: term,
        latitude: 0,
        longitude: 0,
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
bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;

  const response = `
    ### Example command ###
/start
Show all example command

/findRestaurantsByPlaces
Find restaurants by places

/findRestaurantsByCurrentLocation
Find restaurants by current location

/findRestaurantByPhone
Find restaurant by phone
  `;

  bot.sendMessage(chatId, response, {
    "reply_markup": {
      "keyboard": [["/start"], ["/findRestaurantsByPlaces", "/findRestaurantsByCurrentLocation"], ["/findRestaurantByPhone"]]
    }
  });
});

// /findRestaurantsByPlaces
bot.onText(/\/findRestaurantsByPlaces/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please enter your food category:').then(() => {
    answerCallbacks[chatId] = (answer) => {
      const term = answer.text;

      bot.sendMessage(chatId, 'Please enter your location (address, city, place, street name, zip code, country, state, building name, etc...):').then(() => {
        answerCallbacks[chatId] = async (answer) => {
          const location = answer.text;

          bot.sendMessage(chatId, 'waiting...');

          if (!_.isEmpty(term) && !_.isEmpty(location)) {
            const result = await findRestaurantsByLocation(term, location);
            if (!_.isEmpty(result.businesses)) {
              result.businesses.forEach((item, i) => {
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
<b>Url:</b> <a href="${url}">Open in yelp</a>
                `;
                bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
              });
            } else {
                const resultMessage = `There are no results`;
                bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
            }
          }
        }
      });
    }
  });
});

// /findRestaurantsByCurrentLocation
bot.onText(/\/findRestaurantsByCurrentLocation/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please enter your food category:').then(() => {
    answerCallbacks[chatId] = (answer) => {
      const term = answer.text;

    }
  });
});

// /findRestaurantByPhone
bot.onText(/\/findRestaurantByPhone/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please enter restaurant phone (with country code and no space):').then(() => {
    answerCallbacks[chatId] = async (answer) => {
      const phone = answer.text.replace(/\s/g, "");

      bot.sendMessage(chatId, 'waiting...');

      if (!_.isEmpty(phone)) {
        const result = await findRestaurantByPhone(phone);
        if (!_.isEmpty(result.businesses)) {
          const item = result.businesses[0];

          const name = item.name;
          const imageUrl = item.image_url;
          const rating = item.rating;
          const latitude = item.coordinates.latitude;
          const longitude = item.coordinates.longitude;
          const locationStr = item.location.display_address.join(', ');
          const phone = item.display_phone;

          const resultMessage = `
            <b>Name:</b> ${name}
<b>Rating:</b> ${rating}
<b>Phone:</b> ${phone}
<b>Address:</b> ${locationStr}
          `;
          bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
          bot.sendVenue(chatId, latitude, longitude, name, locationStr);
          bot.sendPhoto(chatId, imageUrl);
        } else {
          const resultMessage = `There are no result`;
          bot.sendMessage(chatId, resultMessage, {parse_mode : "HTML"});
        }
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

bot.on('location', (msg) => {
  const latitude = msg.location.latitude;
  const longitude = msg.location.longitude;
  console.log("latitude = ", latitude);
  console.log("longitude = ", longitude);
});

console.log('lunchPickerBot is running');
