const CommandConstructor = require(`${process.cwd()}/util/CommandConstructor.js`);

module.exports = class Ping extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "ping"
    });
    this.setAliases("p", "pingpong");
  }

  async onExecute(message) {
    let start = Date.now();
    let msg = await message.channel.send(message.embed().setDescription("🏓"));
    msg.edit(message.embed()
      .setTitle("🏓")
      .setDescription(`🏓 ${Math.round(Date.now()-start-this.client.ws.ping)}ms\n💙 ${Math.round(this.client.ws.ping)}ms`)
    );
  }

}