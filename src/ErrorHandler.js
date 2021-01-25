const { Message } = require("discord.js");
const randomString = require("random-string");

module.exports = class ErrorHandler {

  constructor(database, client) {
    this.database = database;
    this.client = client;

    if (database) {
      this._getErrorList = this.database.db.prepare("SELECT key FROM `SupaBotBaseData` WHERE `key` LIKE 'error-________'");
      this._getError = (errorId) => this.database.get(`error-${errorId}`);
      this._deleteError = (errorId) => this.database.delete(`error-${errorId}`);
    }
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
          security: cmd.security
        }
      });
      message.answerCommand(`**Error**\nAn error occurred while trying to run \`${cmd.help.name}\`.\nThis error has been reported with ID **#${id}**`);

    } else message.answerCommand(`An error occurred while trying to run this command. The error has been reported!`);

  }

  _generateErrorID() {
    let id = randomString({length: 8});
    if (this.database.get(id)) return this._generateErrorID();
    return id;
  }

  getErrorList() {
    if (!this.database) return [];
    return this._getErrorList.all().map((e) => e.key.split("error-")[1]);
  }

  async getError(id) {
    if (!this.database) return false;

    let error = this._getError(id);
    if (!error) return false;

    let message = new Message(this.client, error.message, 
      await this.client.channels.fetch(error.channelId)
    );

    return {
      message,
      error: error.error,
      cmd: error.cmd
    }
  }

  removeError(id) {
    if (!this.database) return false;
    this._deleteError(id);
    return true;
  }

  clearErrors() {
    let errors = this.getErrorList();
    for (let error of errors) {
      this.removeError(error);
    }
    return errors.length;
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