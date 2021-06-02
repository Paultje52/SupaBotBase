# SupaBotBase
An easy-to-use Discord.js Bot base with messages and interactions support.<br>
Todo for **`v1.2.0`**.
- [x] Rewrite the args system for commands
- [x] Add button support
- [x] Fix button support for slash commands
- [ ] Add slash command permissions
- [ ] Add documentation

### **Discord.js**
SupaBotBase is based off discord.js `v12`. That version doesn't support slash commands and message buttons (yet). As soon as discord.js `v13` is out **for production** or the interactions support is there for `v12`, SupaBotBase makes their own API calls.


## Documentation
Look at the [GitHub repository wiki](https://github.com/Paultje52/SupaBotBase/wiki) for the documentation.

## Example
**bot.js**
```js
// Require the SupaBotBase package
const SupaBotBase = require("SupaBotBase");
// Construct the bot
let bot = new SupaBotBase({
  dir: __dirname
});
// Load the commands in the "commands" directory
bot.loadCommands("commands").then(async () => {
  // Start the bot and wait until it's started
  await bot.start();
  // Automaticly register slash commands
  bot.registerSlashCommands();
});
```
**token.txt**
```
YOUR BOT TOKEN
```
**commands/ping.js**
```js
const CommandConstructor = require("SupaBotBase").CommandConstructor;

module.exports = class Ping extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "ping",
      description: "Test my ping"
    });
    this.setSlashCommandType("hidden");
  }

  async onExecute(message) {
    message.answerCommand(`**Ping**\n💙 ${Math.round(this.client.ws.ping)}`);
  }

}
```

## Licence
This project uses the MIT licence. It would be great if you want to put a link to the SupaBotBase somewhere in your bot, but it isn't required. Here is a copy of the licence, but it's also found in [LICENSE](LICENSE).
```
Copyright 2021 Paultje52

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```