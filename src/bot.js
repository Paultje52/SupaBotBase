const BaseBot = require("./util/BaseBot");
const { MessageEmbed } = require("discord.js");

(async () => {
  console.log(`\x1b[32m\x1b[1mLoading bot Bot...\x1b[0m`);

  // Create a new bot instance
  let bot = new BaseBot({
    dir: __dirname
  });
  // Load everything
  await bot.loadAll();
  // Set config
  bot.setConfig("config.js");
  // Set database
  bot.createDatabase("database.sqlite");
  // Add message function
  bot.addMessageFunction("embed", () => {
    return new MessageEmbed().setFooter("©BaseBot").setColor("#2f3136");
  });
  // Add message handler
  bot.addMessageHandler((message) => {
    console.log(1);
    // Return false > Stop message handling.
  });
  // Start the bot
  console.log("Starting bot...");
  await bot.start();

  // Log that the bot is logged in!
  console.log("\x1b[2mBot logged in, waiting for ready signal...\x1b[0m");

})();