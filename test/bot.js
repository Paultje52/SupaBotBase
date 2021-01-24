const SupaBotBase = require("../");
const { MessageEmbed } = require("discord.js");

(async () => {
  console.log(`\x1b[32m\x1b[1mLoading bot Bot...\x1b[0m`);

  // Create a new bot instance
  let bot = new SupaBotBase({
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
    return new MessageEmbed().setFooter("©SupaBotBase").setColor("#2f3136");
  });
  // Add message handler
  bot.addMessageHandler((message) => {
    // console.log(1);
    // Return false > Stop message handling.
  });

  bot.setPermissionCheck("test", (_message, _args) => {
    return "Nope!";
  });

  // Activate error handler
  bot.activateErrorHandler();

  // Start the bot
  console.log("Starting bot...");
  await bot.start();

  // Log that the bot is logged in!
  console.log("\x1b[2mBot logged in, waiting for ready signal...\x1b[0m");
  bot.registerSlashCommands("429883132636954624");
  // bot.removeSlashCommands("testGuildID");

})();