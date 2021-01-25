const CommandConstructor = require(`../../src/SupaBotBase`).CommandConstructor;

module.exports = class Ping extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "clearerror",
      description: "Test my ping"
    });

    this.setSlashCommandsEnabled(true);
    this.setSlashCommandType("hidden");
  }

  async onExecute() {

    console.log(this.main.errorHandler.getErrorList());
    // this.main.errorHandler.clearErrors();

  }

}