const CommandConstructor = require(`${process.cwd()}/util/CommandConstructor.js`);

module.exports = class Ping extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "ping",
      description: "Test my ping"
    });
    this.setAliases("p", "pingpong");
  }

  async onExecute(message) {
    let start = Date.now();
    let msg = await message.channel.send(message.embed().setDescription("🏓"));

    let ping = Math.round(Date.now()-start-this.client.ws.ping);
    let ws = Math.round(this.client.ws.ping);

    if (message.isSlashCommand) {
      msg.delete();
      message.answerCommand(message.embed()
        .setDescription(`🏓 ${ws}ms\n💙 ${ping}ms`)
      );

    } else {
      msg.edit(message.embed()
        .setDescription(`🏓 ${ws}ms\n💙 ${ping}ms`)
      );
      
    }
  }

}