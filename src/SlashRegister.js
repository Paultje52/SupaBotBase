const fetch = require("node-fetch");

module.exports = class SlashRegister {
  constructor(commands, SupaBotBase) {
    if (!SupaBotBase.client) throw new Error("Client isn't ready yet, please wait!");
    this.main = SupaBotBase;
    this.commands = commands;

    this.queues = {
      create: [],
      delete: [],
      change: []
    };

    this.createQueue();
  }

  createQueue() {
    setInterval(async () => {
      if (this.queues.create.length > 0) {
        let createTask = this.queues.create.shift();
        await createTask();
      }
      
      if (this.queues.delete.length > 0) {
        let createTask = this.queues.delete.shift();
        await createTask();
      }
      
      if (this.queues.change.length > 0) {
        let createTask = this.queues.change.shift();
        await createTask();
      }
    }, 10);
  }
  
  onQueueClear(f) {
    let i = setInterval(() => {
      if (this.queues.create.length === 0 && this.queues.delete.length === 0 && this.queues.change.length === 0) {
        clearInterval(i);
        f();
      }
    }, 10);
  }

  async getCurrentCommand(guild) {
    this.guild = guild;

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
        description: command.help.description,
        slashCommands: command.slashCommands,
        args: command.args
      });
    });
    return parsed;
  }

  async unregister(commands, guild) {
    for (let cmd of commands) {
      if (!cmd.id) continue;
      let res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands/${cmd.id}`, {
        headers: {
          Authorization: `Bot ${this.main.token}`,
          "Content-Type": "application/json"
        },
        method: "DELETE"
      });
      console.log(await res.text());
    }
  }

  compareCommands(registered, bot) {
    let notRegistered = [];
    let needChanging = [];
    let canBeDeleted = [];
    bot.forEach((cmd) => {
      if (!cmd.slashCommands) return;

      let msg = ", the guild doens't exists or the bot isn't invited to the guild!";
      if (this.guild && this.main.client.guilds.cache.get(this.guild)) msg = ` in ${this.main.client.guilds.cache.get(this.guild).name} (${this.guild})!`;

      if (registered.code === 50001) throw new Error(`Can't register slash commands: Bot isn't to register slash commands${msg}`);
      let c = registered.find((c) => c.name.toLowerCase() === cmd.name.toLowerCase());
      if (!c) return notRegistered.push(cmd);

      if (!c.options) c.options = [];
      if (c.description !== cmd.description || (cmd.args.length !== 0 && JSON.stringify(cmd.args) !== JSON.stringify(c.options))) {
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

      this.queues.create.push(async () => {
        
        let res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands`, {
          headers: {
            Authorization: `Bot ${this.main.token}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify({
            name: command.name,
            description: command.description,
            options: command.args
          })
        });
      
        if (res.headers.get("x-ratelimit-remaining")[0] == 0) {
          let timeout = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
          
          await new Promise((res) => {
            setTimeout(res, timeout);
          });
        }

        if (guild) {
          // Development
          res = await res.json();
          if (res.message === "Missing Access") return console.error(`Can't activate command for guild ${guild}, no access!`);
        }

      });

    }
  }

  async changeCommands(commands, guild) {
    for (let command of commands) {
      
      this.queues.change.push(async () => {

        let res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands/${command.id}`, {
          headers: {
            Authorization: `Bot ${this.main.token}`,
            "Content-Type": "application/json"
          },
          method: "PATCH",
          body: JSON.stringify({
            name: command.name,
            description: command.description,
            options: command.args
          })
        });

        if (res.headers.get("x-ratelimit-remaining")[0] == 0) {
          let timeout = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();

          await new Promise((res) => {
            setTimeout(res, timeout);
          });
        }

      });

    }
  }

  async deleteCommands(commands, guild) {
    for (let command of commands) {
      
      this.queues.delete.push(async () => {

        let res = await fetch(`https://discord.com/api/applications/${this.main.client.user.id}/${guild ? `guilds/${guild}/` : ""}commands/${command.id}`, {
          headers: {
            Authorization: `Bot ${this.main.token}`,
            "Content-Type": "application/json"
          },
          method: "DELETE"
        });
        
        if (res.headers.get("x-ratelimit-remaining")[0] == 0) {
          let timeout = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
          
          await new Promise((res) => {
            setTimeout(res, timeout);
          });
        }

      });

    }
  }

}