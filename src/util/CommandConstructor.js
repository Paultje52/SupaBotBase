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

  /**
   * @method setRequiredPermissions
   * @param {Object} param0 An object with two parameters, bot and user, each a string array with the required permissions for that target
   */
  setRequiredPermissions({bot = [], user = []} = {}) {
    if (!this.security) this.security = {};
    if (!this.security.requiredPermissions) this.security.requiredPermissions = {};
    this.security.requiredPermissions.bot = bot;
    this.security.requiredPermissions.user = user;
  }

  /**
   * @method setRestriction
   * @param {("user"|"channel"|"guild")} type The type of the restriction
   * @param {("specific"|"database")} valueType Where the restricted value is queried from
   * @param {String|Array<String>} value The value. String if database and array if specific.
   */
  setRestriction(type = "user", valueType = "specific", value = []) {
    if (type !== "user" && type !== "channel" && type !== "guild") throw new Error("Restriction type can only be user, guild or channel!");
    if (valueType !== "specific" && valueType !== "database") throw new Error("The value type can only be \"specific\" or \"database\".");
    if (typeof value !== "string" && typeof value !== "object") throw new Error("The value can only be a string or an array.");
    if (!this.security) this.security = {};
    if (!this.security.restriction) this.security.restriction = {};
    this.security.restriction[type] = [valueType, value];
  }

  setPermissionChecks(...checks) {
    if (!this.security) this.security = {};
    this.security.checks = checks;
  }
}