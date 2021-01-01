const fetch = require("node-fetch");

module.exports = class SlashRegister {
  constructor(commands, BaseBot) {
    if (!BaseBot.client) throw new Error("Client isn't ready yet, please wait!");
    this.main = BaseBot;
    this.commands = commands;
  }

  async getCurrentCommand(guild) {
    let res;
    if (guild) {
      // Development
      res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/guilds/${guild}/commands`, {
        headers: {
          Authorization: `Bot ${this.main.token}`
        }
      });
    } else {
      // Production
      res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/commands`, {
        headers: {
          Authorization: `Bot ${this.main.token}`
        }
      });
    }

    let json = await res.json();
    return json;
  }

  getBotCommands() {
    let parsed = [];
    this.commands.forEach((command) => {
      if (!command.slashCommands) return;
      parsed.push({
        name: command.help.name,
        description: command.help.description
      });
    });
    return parsed;
  }

  compareCommands(registered, bot) {
    let notRegistered = [];
    let needChanging = [];
    let canBeDeleted = [];
    bot.forEach((cmd) => {
      let c = registered.find((c) => c.name.toLowerCase() === cmd.name.toLowerCase());
      if (!c) return notRegistered.push(cmd);
      if (c.description !== cmd.description) {
        cmd.id = c.id;
        needChanging.push(cmd);
      }
    });
    registered.forEach((r) => {
      let c = bot.find((c) => c.name.toLowerCase() === r.name.toLowerCase());
      if (!c) canBeDeleted.push(r);
    });
    return { notRegistered, needChanging, canBeDeleted };
  }

  async registerNewCommands(commands, guild) {
    for (let command of commands) {

      let res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands`, {
        headers: {
          Authorization: `Bot ${this.main.token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          name: command.name,
          description: command.description
        })
      });

      if (guild) {
        // Development
        res = await res.json();
        if (res.message === "Missing Access") return console.error(`Can't activate command for guild ${guild}, no access!`);
      }

    }
  }

  async changeCommands(commands, guild) {
    for (let command of commands) {

      await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands/${command.id}`, {
        headers: {
          Authorization: `Bot ${this.main.token}`,
          "Content-Type": "application/json"
        },
        method: "PATCH",
        body: JSON.stringify({
          name: command.name,
          description: command.description
        })
      });

    }
  }

  async deleteCommands(commands, guild) {
    for (let command of commands) {

      await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands/${command.id}`, {
        headers: {
          Authorization: `Bot ${this.main.token}`,
          "Content-Type": "application/json"
        },
        method: "DELETE"
      });

    }
  }

}