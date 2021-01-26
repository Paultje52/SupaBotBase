const { Message, MessageEmbed } = require("discord.js");
const randomString = require("random-string");

module.exports = class ErrorHandler {

  constructor(main) {
    this.database = main.database;
    this.client = main.client;
    this.main = main;

    if (this.database) {
      this._getErrorList = this.database.db.prepare("SELECT key FROM `SupaBotBaseData` WHERE `key` LIKE 'error-________'");
      this._getError = (errorId) => this.database.get(`error-${errorId}`);
      this._deleteError = (errorId) => this.database.delete(`error-${errorId}`);
    }
    
    this._mountProcessErrors();
  }

  async _onMessageError(error, message, cmd) {
    let errorMessage = `\n\n\x1b[1m[\x1b[31mERROR\x1b[0m\x1b[1m]\x1b[0m SupaBotBase encountered an error while running command \x1b[1m${cmd.help.name}\x1b[0m!\nFile: ${cmd._file}\n\x1b[32mMessage data.\x1b[0m\n- Guild: ${message.guild.name} (${message.guild.id})\n- Channel: ${message.channel.name} (${message.channel.id})\n- Author: ${message.author.tag} (${message.author.id})\n- Message link: ${message.url}\n========[ Content start ]========\n${message.content}\n========[  Content end  ]========\n\n========[ Error Message ]========\n${error.stack}`;
    console.error(errorMessage);

    if (this.errorCallback) {
      let res = await this.errorCallback(error, message, cmd, errorMessage);
      if (typeof res === "boolean" && !res) return;
    }

    if (this.database) {

      let id = this._generateErrorID();
      this.database.set(`error-${id}`, {
        message,
        channelId: message.channel.id,
        isMessageError: true,
        error: {
          stack: error.stack,
          message: error.message,
          name: error.name
        },
        cmd: {
          help: cmd.help,
          args: cmd.args,
          examples: cmd.examples,
          aliases: cmd.aliases,
          slashCommands: cmd.slashCommands,
          slashCommandType: cmd.slashCommandType,
          security: cmd.security,
          _file: cmd._file
        }
      });
      message.answerCommand(`**Error**\nAn error occurred while trying to run \`${cmd.help.name}\`.\nThis error has been reported with ID **#${id}**`);

      this._sendErrorMessage(message, error, cmd, id);
      return;

    } 
    
    message.answerCommand(`An error occurred while trying to run this command. The error has been reported!`);
    this._sendErrorMessage(message, error, cmd, "No_DB");

  }

  async _sendErrorMessage(message, error, cmd, errorId) {
    if (!this.logChannel) return;

    let msg = await this.logChannel.send(new MessageEmbed());
    if (this.database) msg.react("📧");
    this._updateErrorMessage(message, error, cmd, errorId, false, msg);

    if (this.errorMessages) {
      this.errorMessages[msg.id] = {
        error: errorId,
        channel: msg.channel.id,
        invite: false
      };
      this.database.set("error-messages", this.errorMessages);
    }

  }
  
  async _onOtherError(error, type) {
    
    console.error(type, error);
    let id = "";

    if (this.database) {
      id = this._generateErrorID();
      this.database.set(`error-${id}`, {
        error,
        type,
        time: Date.now()
      });
      id = ` #${id}`;
    }

    if (!this.logChannel) return;
    let msg = await this.logChannel.send(new MessageEmbed());
    this._updateOtherErrorMessage(type, error, id, msg);

    this.errorMessages[msg.id] = {
      error: id.split(" #").join(""),
      channel: msg.channel.id
    }
    this.database.set("error-messages", this.errorMessages);
  }

  _updateOtherErrorMessage(type, error, errorId, msg) {
    let embed = new MessageEmbed()
      .setTitle(`Error${errorId}`)
      .setColor("#8b0000")
      .setDescription(`**Type**: \`${type}\`${(error instanceof Error) ? "" : "\n> _Error isn't an object, location can't be traced!_"}\n\`\`\`${(error.stack || error).toString().substr(0, 1000-6)}\`\`\``)
      .setTimestamp()

    msg.edit(embed);
  }

  _updateErrorMessage(message, error, cmd, errorId, invite, toUpdate) {
    let embed = new MessageEmbed()
      .setTitle(`Error #${errorId}`)
      .setColor("#ff0000")
      .setAuthor(`${message.author.tag} (${message.author.id})`, message.author.avatarURL(), message.url)
      .setTimestamp(message.createdTimestamp)
      .setDescription(`Guild: ${message.guild.name} (${message.guild.id})\nChannel: <#${message.channel.id}> (${message.channel.name}, ${message.channel.id})\nAuthor: <@${message.author.id}> (${message.author.tag}, ${message.author.id})\nMessage link: [click](${message.url})`)
      .addField("**Message**", `\`\`\`${message.content.substr(0, 1000-6)}\`\`\``)
      .addField("**Error**", `\`\`\`${error.stack.toString().substr(0, 1000-6)}\`\`\``)
      .addField("**Command**", `Name: **${cmd.help.name}**\nTriggerType: **${message.isSlashCommand ? `Slash (${cmd.slashCommandType})` : "Message"}**\nFile: \`${cmd._file}\``)
      
    if (invite) embed.description += `\nInvite: ${invite}`;
    else if (this.database) embed.setFooter(`Click 📧 to generate invite link`);

    toUpdate.edit(embed);
  }

  _generateErrorID() {
    let id = randomString({length: 8});
    if (this.database.get(id) || id === "messages") return this._generateErrorID();
    return id;
  }

  getErrorList() {
    if (!this.database) return [];
    return this._getErrorList.all().map((e) => e.key.split("error-")[1]).filter((id) => id !== "messages");
  }

  async getError(id) {
    if (!this.database) return false;

    let error = this._getError(id);
    if (!error) return false;

    if (error.isMessageError) {

      let message = new Message(this.client, error.message, 
        await this.client.channels.fetch(error.channelId)
      );
      Object.defineProperty(message, "author", {
        value: await this.client.users.fetch(error.message.authorID),
        writable: false 
      });
      Object.defineProperty(message, "member", {
        value: await message.guild.members.fetch(message.author.id),
        writable: false 
      });

      return {
        message,
        error: error.error,
        cmd: error.cmd
      }

    } 
    
    return error;
  }

  async removeError(id, deleteMessage = true) {
    if (!this.database || id === "messages") return false;
    this._deleteError(id);

    if (this.errorMessages && deleteMessage) {
      let e = false;
      for (let i in this.errorMessages) {
        if (this.errorMessages[i].error === id) e = i;
      }
      if (e === false) return true;

      let channel = await this.client.channels.fetch(this.errorMessages[e].channel);
      if (!channel) return true;
      let msg = await channel.messages.fetch(e);
      if (!msg) return true;

      msg.delete().catch((_) => {});
      delete this.errorMessages[e];
      this.database.set("error-messages", this.errorMessages);

    }

    return true;
  }

  async clearErrors() {
    let errors = this.getErrorList();
    for (let error of errors) {
      await this.removeError(error);
    }
    return errors.length;
  }

  _mountReactionListener() {
    this.main.translateRawMessageEvents();
    this.client.on("messageReactionAdd", async (reaction, user) => {
      if (user.bot || reaction.emoji.name !== "📧" || !this.errorMessages || !this.errorMessages[reaction.message.id] || this.errorMessages[reaction.message.id].invite) return;
      let error = await this.getError(this.errorMessages[reaction.message.id].error);
      reaction.message.edit(new MessageEmbed());
      reaction.message.reactions.removeAll();

      let invite = await error.message.channel.createInvite({
        maxAge: 0,
        reason: "SupaBaseBot | Error resolving"
      });
      this.errorMessages[reaction.message.id].invite = invite.url;
      this.database.set("error-messages", this.errorMessages);

      this._updateErrorMessage(error.message, error.error, error.cmd, this.errorMessages[reaction.message.id].error, invite.url, reaction.message);

    });
  }

  _mountErrorMessageDeletionListener() {
    this.client.on("messageDelete", (message) => {
      if (!message.author.bot || !this.errorMessages || !this.errorMessages[message.id]) return;
      this.removeError(this.errorMessages[message.id].error, false);
      delete this.errorMessages[message.id];
    });
  }

  _mountProcessErrors() {
    process.on("uncaughtException", (e) => {
      this._onOtherError(e, "uncaughtException");
    });
    process.on("unhandledRejection", (e) => {
      this._onOtherError(e, "unhandledRejection");
    });
  }

  setLogChannel(id) {
    if (this.database) this.errorMessages = this.database.get(`error-messages`) || {};

    console.log("ErrorHandler: Setting log channel when bot is ready...");

    this.client.on("ready", async () => {
      this.logChannel = await this.client.channels.fetch(id);
      if (this.logChannel) {
        console.log(`ErrorHandler: Bot logging errors in channel ${this.logChannel.name} (${this.logChannel.id}), in guild ${this.logChannel.guild.name}.`);
        this._mountReactionListener();
        this._mountErrorMessageDeletionListener();
      } else console.log(`ErrorHandler: Couldn't find a channel with the id ${id}!`);
    });
  }

  /**
   * @method onError
   * @description Set a function to call when an error occurred. Return false to stop the default error message to be send.
   * @returns {undefined}
   * @param {Function} f The function to call when an error occurred
   */
  onError(f = () => {}) {
    this.errorCallback = f;
  }
}