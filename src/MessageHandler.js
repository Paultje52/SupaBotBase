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
      message._argAnswerSent = false;
      args = await this.checkValidArgs(cmdFile.args, args, message, example, message.guild, usage);
      if (!args) return;
    }

    if (cmdFile.security && !(await this.checkSecurity(cmdFile, message, args))) return;
    
    
    if (!this.main.errorHandler) return cmdFile.onExecute(message, args);

    if (cmdFile.onExecute.constructor.name === "AsyncFunction") return cmdFile.onExecute(message, args).catch((e) => {
      this.main.errorHandler._onMessageError(e, message, cmdFile);
    });

    this.client.emit("commandExecute", cmdFile, message);

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
      message.channel.send(this.main.config.messages.botNoPermissions
        .replace("{0}", `\n- ${missing.join("\n- ")}`) );
      return false;
    }
    
    missing = this.getMissingPermissions(user, message.member, message.channel);
    if (missing.length > 0) {
      message.channel.send(this.main.config.messages.userNoPermissions
        .replace("{0}", `\n- ${missing.join("\n- ")}`));
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

  async checkValidArgs(cmdArgs, user, message, example, guild, usage, onlyFirst = false) {
    let parsed = [];

    let curUserArg = user.shift();
    if (!cmdArgs[0]) return [];

    let failed = false;

    if (curUserArg) {

      let res = false;
      for (let i of cmdArgs) {

        if (![1, 2].includes(i.type) || i.name.toLowerCase() !== curUserArg.toLowerCase()) continue;
        parsed.push(i.name.toLowerCase());

        let index = cmdArgs.indexOf(i);
        cmdArgs.splice(index, 1);
        if (![1, 2].includes(i.options[0].type)) onlyFirst = true;
        res = await this.checkValidArgs(i.options, user, message, example, guild, usage, onlyFirst);
        cmdArgs.splice(index, 0, i);
        if (!res) return false;

        break;

      }

      if (res) parsed.push(...res);
      else if (![1, 2].includes(cmdArgs[0].type)) {
        let arg = cmdArgs.shift();

        if (arg.type === 3) parsed.push(curUserArg);
        else if (arg.type === 4) {
          let n = Number(curUserArg);
          if (isNaN(n)) failed = true;
          else parsed.push(n);

        } else if (arg.type === 5) {
          let out = undefined;
          if (curUserArg === "true" || curUserArg === "on" || curUserArg === "yes") out = true;
          else if (curUserArg === "false" || curUserArg === "off" || curUserArg === "no") out = false;

          if (out === undefined) failed = true;
          else parsed.push(out);

        } else {
          let toFetch = curUserArg;
          if (isNaN(Number(toFetch))) {
            if (!toFetch.startsWith("<") || !toFetch.endsWith(">")) failed = true;
            else toFetch = toFetch.split("<").join("").split(">").join("").split("@").join("").split("&").join("").split("#").join("").split("!").join("");
          }

          let out = false;
          if (!failed && arg.type === 6) out = await message.guild.members.fetch(toFetch).catch(_e => {/* Nothing */});
          else if (!failed && arg.type === 7) out = message.guild.channels.cache.get(toFetch);
          else if (!failed && arg.type === 8) out = message.guild.roles.cache.get(toFetch);
          
          if (!out) failed = true;
          else parsed.push(out);

        }

        if (cmdArgs[0]) {
          let res = await this.checkValidArgs(cmdArgs, user, message, example, guild, usage);
          if (!res) {
            cmdArgs.unshift(arg);
            return false;
          };
          parsed.push(...res);
        }

        cmdArgs.unshift(arg);

      }
      


    } else if (([1, 2].includes(cmdArgs[0].type) || cmdArgs[0].required)) failed = true;
    
    if (failed) {

      let requiredSubs = [];
      let requiredOthers = [];

      let typeToName = this.main.config.messages.types;
      cmdArgs.forEach((a) => {
        if (a.type === 1 || a.type === 2) requiredSubs.push(`**${a.name}**\n> _${a.description}_\n`);
        else requiredOthers.push(`**${a.name}** (${this.main.config.messages.needsToBe.replace("{0}", typeToName[a.type])})\n> _${a.description}_\n`);
      });
      if (onlyFirst) requiredOthers = [requiredOthers[0]];
      
      if (requiredSubs.length > 0) requiredSubs = this.main.config.messages.chooseBetweenSubcommands + `\n> ${requiredSubs.join("\n> ")}`;
      else requiredSubs = "";
      if (requiredOthers.length > 0) {
        if (requiredSubs) requiredOthers = `\n${this.main.config.messages.orOtherOptions}\n> ${requiredOthers.join("\n> ")}`;
        else requiredOthers = `${this.main.config.messages.chooseBetweenOptions}\n> ${requiredOthers.join("\n> ")}`
      } else requiredOthers = "";

      message.channel.send(message.embed()
        .setTitle(this.main.config.messages.wrongArguments)
        .setDescription(`${this.main.config.messages.usage}: \`${usage}\`\n\n${requiredSubs}${requiredOthers}`)
        .setFooter(`${this.main.config.messages.example}: ${example}`)
      );

      return false;

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