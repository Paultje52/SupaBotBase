const { MessageEmbed } = require("discord.js");
module.exports = class MessageHandler {

  getEvent() {
    return "message";
  }

  async onExecute(message) {
    if (this.main.config.disable && this.main.config.disable.message) return;
    if (message.author.bot) return;
    
    this.addSlashCommandSupportData(message);
    if (this.main.database && this.main.config.database) this.loadSettings(message);

    this.setMessageFunctions(message);
    if (!await this.checkMessageHandles(message)) return;

    let prefix = this.getFullPrefix(message);
    message.prefix = prefix;
    if (!message.content.toLowerCase().startsWith(prefix)) return;

    let {args, command} = this.getMessageAndArgs(message.content, prefix);
    let cmdFile = this.getCommand(command);
    if (!cmdFile) return;

    if (cmdFile.args.length !== 0) {
      let example = this.getCommandExample(cmdFile, prefix);
      let usage = this.parseCommandExample(cmdFile.help.usage, prefix, cmdFile.help.name);
      args = await this.checkValidArgs(cmdFile.args, args, message, example, message.guild, usage);
      if (!args) return;
    }

    if (cmdFile.security && !(await this.checkSecurity(cmdFile, message, args))) return;
    
    
    if (!this.main.errorHandler) return cmdFile.onExecute(message, args);

    if (cmdFile.onExecute.constructor.name === "AsyncFunction") return cmdFile.onExecute(message, args).catch((e) => {
      this.main.errorHandler._onMessageError(e, message, cmdFile);
    });

    try {
      cmdFile.onExecute(message, args);
    } catch(e) {
      this.main.errorHandler._onMessageError(e, message, cmdFile);
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
        message.channel.send(res);
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
      message.channel.send(`Can't run this command. I'm missing the following permissions.\n- ${missing.join("\n- ")}`);
      return false;
    }
    
    missing = this.getMissingPermissions(user, message.member, message.channel);
    if (missing.length > 0) {
      message.channel.send(`Can't run this command. You're missing the following permissions.\n- ${missing.join("\n- ")}`);
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

  async checkValidArgs(cmd, user, message, example, guild, usage, firstArgCheck = true) {
    let parsed = [];

    let curUserArg = user.shift();
    let curArg = cmd.shift();

    if (curUserArg) {
      if (curArg.type === 1 || curArg.type === 2) {
        if (curArg.name.toLowerCase() === curUserArg.toLowerCase()) {
          let res = await this.checkValidArgs(curArg.options, user, message, example, guild, usage, false);
          if (res === false || `${res}`.includes("false")) return false;
          parsed.push(curUserArg.toLowerCase(), ...res);

        } else if (cmd.length !== 0) {
          let res = await this.checkValidArgs(cmd, user, message, example, guild, usage, false);
          if (res === false || `${res}`.includes("false")) return false;
          parsed.push(curUserArg.toLowerCase(), ...res);
        }
      } else {
        if (curArg.type === 3) parsed.push(curUserArg);
        else if (curArg.type === 4) { // Number
          let n = Number(curArg);
          if (!isNaN(n)) parsed.push(n);

        } else if (curArg.type === 5) { // True/false
          if (curArg.toLowerCase().includes("true") || curArg.toLowerCase().includes("yes") || curArg.toLowerCase().includes("on")) parsed.push(true);
          else if (curArg.toLowerCase().includes("false") || curArg.toLowerCase().includes("no") || curArg.toLowerCase().includes("off")) parsed.push(false);

        } else if (curArg.type === 6) { // User
          curUserArg = this.mentionToID(curUserArg);
          if (curUserArg) {
            let user = await guild.members.fetch(curUserArg);
            if (user) parsed.push(user);
          }

        } else if (curArg.type === 7) { // Channel
          curUserArg = this.mentionToID(curUserArg);
          if (curUserArg) {
            let channel = guild.channels.cache.get(curUserArg);
            if (channel) parsed.push(channel);
          }

        } else if (curArg.type === 8) { // Role
          curUserArg = this.mentionToID(curUserArg);
          if (curUserArg) {
            let role = await guild.roles.fetch(curUserArg);
            if (role) parsed.push(role);
          }
        }

        let res = await this.checkValidArgs(cmd, user, message, example, guild, usage);
        if (res === false || `${res}`.includes("false")) return false;
        parsed.push(...res);
      }
    }

    if (parsed.length === 0 && ((firstArgCheck || !curArg.required) && ![1, 2].includes(curArg.type))) return [];
    
    cmd.unshift(curArg);

    if (parsed.length === 0) {
      parsed = false;
      let requiredSubs = [];
      let requiredOthers = [];

      let typeToName = {
        4: "a valid number",
        5: "yes/no",
        6: "a user (mention or ID)",
        7: "a channel (mention or ID)",
        8: "a role (mention or ID)"
      }
      cmd.forEach((a) => {
        if (a.type === 1 || a.type === 2) requiredSubs.push(`**${a.name}**\n> _${a.description}_\n`);
        else if (a.required) requiredOthers.push(`**${a.name}** (needs to be ${typeToName[a.type]})\n> _${a.description}_\n`);
      });
      
      if (requiredSubs.length > 0) requiredSubs = `You have to choose between the following subcommands.\n> ${requiredSubs.join("\n> ")}`;
      else requiredSubs = "";
      if (requiredOthers.length > 0) {
        if (requiredSubs) requiredOthers = `\nOr between the other options.\n> ${requiredOthers.join("\n> ")}`;
        else requiredOthers = `You have to choose between the following options.\n> ${requiredOthers.join("\n> ")}`
      } else requiredOthers = "";

      message.channel.send(message.embed()
        .setTitle("Wrong arguments!")
        .setDescription(`Usage: \`${usage}\`\n\n${requiredSubs}${requiredOthers}`)
        .setFooter(`Example: ${example}`)
      );
    }

    return parsed;
  }

  mentionToID(i) {
    let res = i.split("<@").join("").split(">").join("").split("!").join("").split("&").join("").split("#").join("");
    return isNaN(Number(res)) ? false : res;
  }

  parseCommandExample(string, prefix, name) {
    return string.replace("%PREFIX%", prefix).replace("%CMD%", name)
  }

  getCommandExample(cmdFile, prefix) {
    let example = cmdFile.examples[Math.floor(Math.random()*cmdFile.examples.length)];
    return this.parseCommandExample(example, prefix, cmdFile.help.name);
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

  addSlashCommandSupportData(message) {
    message.isSlashCommand = false;
    message.answerCommand = (content) => {
      return message.channel.send(content);
    }
  }

  getCommand(command) {
    return this.main.commands.get(command) || this.main.aliases.get(command);
  }

  getMessageAndArgs(content, prefix) {
    let args = content.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();
    return {args, command};
  }

  loadSettings(message) {
    message.guild.settings = this.main.database.get(`guild-${message.guild.id}`);
    if (!message.guild.settings) message.guild.settings = this.main.config.database.defaultGuildSettings || {};

    message.author.settings = this.main.database.get(`user-${message.author.id}`);
    if (!message.author.settings) message.author.settings = this.main.config.database.defaultUserSettings || {};
  }

  getFullPrefix(message) {
    if (this.main.config.disable && this.main.config.disable.mentionPrefix) return this.getPrefix(message);
    let prefixMention = new RegExp(`^<@!?${this.client.user.id}> `);
    let match = message.content.match(prefixMention);
    return match ? match[0] : this.getPrefix(message);
  }

  getPrefix(message) {
    if (this.main.database && message.guild.settings.prefix) return message.guild.settings.prefix;
    if (this.main.config.prefix) return this.main.config.prefix;
    return ".";
  }

}