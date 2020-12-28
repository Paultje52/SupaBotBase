module.exports = class CommandConstructor {
  constructor() {
    this.setHelp({name: "???"});
    this.setArgs();
    this.setAliases();
  }

  setHelp({
    name,
    description = "No description provided",
    usage = "%PREFIX%%CMD%",
    category = "Unknown"
  } = {}) {
    this.help = {name, description, usage, category, examples: this.help ? this.help.examples ? this.help.examples : [] : []};
  }

  setArgs({
    args = [{name: "name", test: () => true}],
    examples = ["%PREFIX%%CMD%"]
  } = {}) {
    if (typeof examples !== "object") examples = [examples];
    this.help.examples = examples;
    this.argsTest = args
  }

  setAliases(...aliases) {
    if (!aliases) aliases = [];
    this.aliases = aliases;
  }

  // TODO: Test stuff
}