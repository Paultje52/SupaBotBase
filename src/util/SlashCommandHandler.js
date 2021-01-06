const { Message } = require("discord.js");
const fetch = require("node-fetch");

module.exports = class MessageHandler {

  getEvent() {
    return "raw";
  }

  async onExecute(packet) {
    if (packet.t !== "INTERACTION_CREATE" || packet.d.type !== 2) return;
    if (packet.d.version !== 1) return console.log("Can't handle slash command: Version isn't 1!");

    let channel = await this.getChannel(packet.d.channel_id);
    if (!channel) return;

    let cmd = this.getCommand(packet.d.data.name);
    if (!cmd) return;

    this.sendAcknowledgeRequest(packet.d.id, packet.d.token, cmd.slashCommandType);

    let message = new Message(this.client, {
      id: packet.d.data.id,
      author: packet.d.member.user,
      tts: false
    }, channel);
    this.addSlashCommandSupportData(message, this.client.user.id, packet.d.token, packet.d.id);
    this.loadSettings(message);
    
    message.prefix = this.getPrefix(message);

    this.setMessageFunctions(message);
    if (!await this.checkMessageHandles(message)) return;
    
    let args = [];
    if (packet.d.data.options) args = await this.fixOptions(packet.d.data.options, cmd.args, message.guild);

    cmd.onExecute(message, args);
  }

  async fixOptions(options, commandArgs, guild) {
    let args = [];

    if (options.length === 1) options = options[0];
    else {
      for (let i in options) {
        let value = await this.getProperValue(commandArgs[i].type, options[i].value, guild);
        args.push(value);
      }
      return args;
    }    

    for (let possibleArg of commandArgs) {
      if (options.name !== possibleArg.name) continue;

      if ([1, 2].includes(possibleArg.type)) {
        // Subcommand
        args.push(possibleArg.name, 
          ...(await this.fixOptions(options.options, possibleArg.options, guild))
        );

      } else {
        let value = await this.getProperValue(possibleArg.type, options.value, guild);
        args.push(value);
      }
    }

    return args;

  }

  async getProperValue(type, value, guild) {
    if ([3, 4, 5].includes(type)) return value;
    if (type === 6) return await guild.members.fetch(value);
    if (type === 7) return guild.channels.cache.get(value);
    if (type === 8) return await guild.roles.fetch(value);
  }

  async checkMessageHandles(message) {
    for (let handler of this.main._messageHandlers) {
      let res = await handler(message);
      if (typeof res === "boolean" && !res) return false;
    }
    return true;
  }

  setMessageFunctions(message) {
    for (let name in this.main._messageFunctions) {
      message[name] = this.main._messageFunctions[name];
    }
  }

  loadSettings(message) {
    message.guild.settings = this.main.database.get(`guild-${message.guild.id}`);
    if (!message.guild.settings) message.guild.settings = this.main.config.database.defaultGuildSettings || {};

    message.author.settings = this.main.database.get(`user-${message.author.id}`);
    if (!message.author.settings) message.author.settings = this.main.config.database.defaultUserSettings || {};
  }

  addSlashCommandSupportData(message, clientId, token, interactionId) {
    message.isSlashCommand = true;
    if (this.hiddenMessageType) {

      message.answerCommand = async (content) => {
        await fetch(`https://discord.com/api/interactions/${interactionId}/${token}/callback`, {
          method: "POST",
          body: JSON.stringify({
            type: 3,
            data: {
              content: content,
              flags: 1 << 6
            }
          }),
          headers: {
            "Content-Type": "application/json"
          }
        });
      }

    } else {

      message.answerCommand = async (content) => {
        let res = await fetch(`https://discord.com/api/webhooks/${clientId}/${token}/messages/@original`, {
          method: "POST",
          body: JSON.stringify({
            content: content
          }),
          headers: {
            "Content-Type": "application/json"
          }
        });
        console.log(await res.json());
        return {
          edit: message.answerCommand,
          delete: () => {
            console.log("Need to delete the message!");
          }
        }
      }

    }

  }

  getCommand(command) {
    return this.main.commands.get(command) || this.main.aliases.get(command);
  }

  async getGuild(id) {
    return this.client.guilds.cache.get(id) || await this.client.guilds.fetch(id);
  }
  async getChannel(id) {
    return this.client.channels.cache.get(id) || await this.client.channels.fetch(id);
  }

  sendAcknowledgeRequest(id, token, type) {
    if (type === "shown") {
      fetch(`https://discord.com/api/interactions/${id}/${token}/callback`, {

        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: 4,
          data: {
            content: ""
          }
        }),
        method: "POST"
      });

    } else this.hiddenMessageType = true;

  }

  getPrefix(message) {
    if (this.main.database && message.guild.settings.prefix) return message.guild.settings.prefix;
    if (this.main.config.prefix) return this.main.config.prefix;
    return ".";
  }

}