const BaseBot = require("./util/BaseBot");

(async () => {
  console.log(`\x1b[32m\x1b[1mLoading bot Bot...\x1b[0m`);

  // Create a new bot instance
  let bot = new BaseBot({
    dir: __dirname
  });
  // Load everything
  await bot.loadAll();
  // Start the bot
  console.log("Starting bot...");
  await bot.start();

  // Log that the bot is logged in!
  console.log("\x1b[2mBot logged in, waiting for ready signal...\x1b[0m");

})();