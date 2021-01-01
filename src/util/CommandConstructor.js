module.exports = class CommandConstructor {
  constructor() {
    this.setHelp({name: "???"});
    this.setArgs();
    this.setAliases();
    this.setSlashCommandsEnabled(true);
    this.setSlashCommandType("shown");
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
    this.help = {name, description, usage, category, examples: this.help ? this.help.examples ? this.help.examples : [] : []};
  }

  setArgs({
    args = [
      /*
        {
          name: "NAME",
          description: "DESCRIPTION",
          type: 0,
          required: true
        }
      */
    ],
    examples = ["%PREFIX%%CMD%"]
  } = {}) {
    if (typeof examples !== "object") examples = [examples];
    this.help.examples = examples;
    this.argsTest = args
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