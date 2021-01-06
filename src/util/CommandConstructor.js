module.exports = class CommandConstructor {
  constructor() {
    this.setHelp({name: "???"});
    this.setArgs();
    this.setAliases();
    this.setSlashCommandsEnabled(true);
    this.setSlashCommandType("shown");
    this.setExamples();
  }

  /**
   * @interface HelpInterface
   * @property {string} name The name of the command
   * @property {string} [description] The description of the command
   * @property {string} [usage] The usage of the command, use %PREFIX% for prefix and %CMD% for command (or possible alias)
   * @property {string} [category] The category of the command, for sorting
   */

  /**
   * @method setHelp
   * @param {HelpInterface} 
   */
  setHelp({
    name,
    description = "No description provided",
    usage = "%PREFIX%%CMD%",
    category = "Unknown"
  } = {}) {
    this.help = {name, description, usage, category};
  }

  /**
   * @method setArgs
   * @param  {...ArgumentInterface} args The arguments
   */
  setArgs(...args) {
    this.args = args;
  }

  /**
   * @method setExamples
   * @param  {...String} examples The examples, use %PREFIX% for the prefix
   */
  setExamples(...examples) {
    if (examples.length === 0) examples = ["%PREFIX%%CMD%"];
    this.examples = examples;
  }

  /**
   * @method setAliases
   * @param  {...string} aliases The aliases
   */
  setAliases(...aliases) {
    if (!aliases) aliases = [];
    this.aliases = aliases;
  }

  /**
   * @method setSlashCommandsEnabled
   * @param {Boolean} value If slash command support is enabled for this command
   */
  setSlashCommandsEnabled(value) {
    this.slashCommands = value;
  }

  /**
   * @method setSlashCommandType
   * @param {("hidden"|"shown")} type Hide or show the response to a slash command
   */
  setSlashCommandType(type = "shown") {
    this.slashCommandType = type;
  }

  // TODO: Test stuff
}