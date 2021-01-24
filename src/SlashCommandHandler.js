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
    Object.defineProperty(message, "member", {
      value: await message.guild.members.fetch(message.author.id),
      writable: false 
    });

    this.addSlashCommandSupportData(message, this.client.user.id, packet.d.token, packet.d.id);
    this.loadSettings(message);
    
    message.prefix = this.getPrefix(message);

    this.setMessageFunctions(message);
    if (!await this.checkMessageHandles(message)) return;
    
    let args = [];
    if (packet.d.data.options) args = await this.fixOptions(packet.d.data.options, cmd.args, message.guild);

    if (cmd.security && !(await this.checkSecurity(cmd, message, args))) return;


    if (!this.main.errorHandler) return cmd.onExecute(message, args);

    if (cmd.onExecute.constructor.name === "AsyncFunction") return cmd.onExecute(message, args).catch((e) => {
      this.main.errorHandler._onMessageError(e, message, cmd);
    });

    try {
      cmd.onExecute(message, args);
    } catch(e) {
      this.main.errorHandler._onMessageError(e, message, cmd);
    }
  }

  async checkSecurity(cmdFile, message, args) {
    if (!cmdFile.security) return true;

    if (cmdFile.security.requiredPermissions && !(await this.checkRequiredPermissions(cmdFile.security.requiredPermissions, message))) return false;
    if (cmdFile.security.restriction && !(this.checkAllRestrictions(cmdFile.security.restriction, message))) return false;
    if (cmdFile.security.checks && !(this.individualChecks(cmdFile.security.checks, message, args))) return false;

    return true;
  }

  individualChecks(checks, message, args) {
    let confirm = true;

    for (let check of checks) {
      if (!this.main.permissionChecks[check]) continue;
      let res = this.main.permissionChecks[check](message, args);
      if (res === false) {
        confirm = false;
        break;
      }
      if (typeof res === "string" || res instanceof MessageEmbed) {
        message.answerCommand(res);
        confirm = false;
        break;
      }
    }

    return confirm;
  }

  checkAllRestrictions(restrictions, message) {
    if (restrictions.user && !this.checkRestriction(restrictions.user, message.author.id)) return false;
    if (restrictions.channel && !this.checkRestriction(restrictions.channel, message.channel.id)) return false;
    if (restrictions.guild && !this.checkRestriction(restrictions.guild, message.guild.id)) return false;
    return true;
  }

  checkRestriction(restriction, id) {
    if (restriction[0] === "specific") {
      if (restriction[1] !== id && !restriction[1].includes(id)) return false;
      return true;
    }

    let data = this.main.database.get(restriction[1]);
    if (data && typeof data === "object" && !data.includes(id)) return false;
    return true;
  }

  async checkRequiredPermissions({bot = [], user = []}, message) {
    let missing = this.getMissingPermissions(bot, await message.guild.members.fetch(this.client.user.id), message.channel);
    if (missing.length > 0) {
      message.answerCommand(`Can't run this command. I'm missing the following permissions.\n- ${missing.join("\n- ")}`);
      return false;
    }

    missing = this.getMissingPermissions(user, message.member, message.channel);
    if (missing.length > 0) {
      message.answerCommand(`Can't run this command. You're missing the following permissions.\n- ${missing.join("\n- ")}`);
      return false;
    }

    return true;
  }

  getMissingPermissions(list, member, channel) {
    let res = [];

    let permissions = member.permissionsIn(channel).serialize();
    list.forEach((perm) => {
      if (!permissions[perm]) res.push(perm);
    });

    return res;
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