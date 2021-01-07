module.exports = class ReadyMessage {

  getEvent() {
    return "ready";
  }

  onExecute() {
    let client = this.main.client;
    console.log(`\x1b[32m\x1b[1m Bot ${client.user.username} (${client.user.id}) online!\x1b[0m\n${client.channels.cache.size} channels and ${client.guilds.cache.size} guilds!`);
  }

}