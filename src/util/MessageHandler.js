module.exports = class MessageHandler {

  getEvent() {
    return "message";
  }

  async onExecute(message) {
    if (this.main.config.disable && this.main.config.disable.message) return;
    if (message.author.bot) return;

    if (this.main.database && this.main.config.database) this.loadSettings(message);
    this.setMessageFunctions(message);
    if (!await this.checkMessageHandles(message)) return;

    let prefix = this.getFullPrefix(message);
    if (!message.content.toLowerCase().startsWith(prefix)) return;

    let {args, command} = this.getMessageAndArgs(message.content, prefix);
    let cmdFile = this.getCommand(command);
    if (!cmdFile) return;

    // TODO: Check security

    this.addSlashCommandSupportData(message);
    cmdFile.onExecute(message, args);
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