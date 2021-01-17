const CommandConstructor = require(`../../`).CommandConstructor;

module.exports = class Ping extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "ping",
      description: "Test my ping"
    });
    this.setAliases("p", "pingpong");

    this.setSlashCommandsEnabled(true);
    this.setSlashCommandType("hidden");
  }

  async onExecute(message) {
    throw new Error("Test!");
    if (message.isSlashCommand) {
      if (this.last) message.answerCommand(`**Last ping**\n🏓 ${this.last.ping}ms\n💙 ${this.last.ws}ms`)
      else message.answerCommand(`Pong! Use \`${message.prefix}ping\` to calculate my ping!`);
      return;
    }

    let start = Date.now();
    let msg = await message.channel.send(message.embed().setDescription("🏓"));

    let ping = Math.round(Date.now()-start-this.client.ws.ping);
    let ws = Math.round(this.client.ws.ping);

    msg.edit(message.embed()
      .setDescription(`🏓 ${ping}ms\n💙 ${ws}ms`)
    );

    this.last = {
      ping,
      ws
    };
  }

}