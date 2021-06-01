class CommandArgument {
  
  /**
   * Create a instance
   * @param {number} type The command type (use SupaBotBase.CommandArgument.types.*)
   */
  constructor(type) {
    this.type = type;
  }

  /**
   * @method setName
   * @description Sets the argument name
   * @param {String} name The command argument name
   * @returns {CommandArgument} Returns itself for chaining
   */
  setName(name) {
    this.name = name;
    return this;
  }

  /**
   * @method setDescription
   * @description Sets the argument description
   * @param {String} description The command argument description
   * @returns {CommandArgument} Returns itself for chaining
   */
  setDescription(description) {
    this.description = description;
    return this;
  }
  
  /**
   * @method setRequired
   * @description Set if the argument is required (Not needed by groups)
   * @param {Boolean} required If the argument is required
   * @returns {CommandArgument} Returns itself for chaining
   */
  setRequired(required) {
    this.required = required;
    return this;
  }

  /**
   * @method setOptions
   * @description Add command options
   * @param {CommandArgument|CommandArgumentChoice} argument An options
   * @returns {CommandArgument} Returns itself for chaining
   */
  setOptions(...options) {
    if (typeof options !== "object" || 
        !(options instanceof Array)) throw new Error("Command Argument option isn't valid!");

    this.options = options;

    if (this.name && this.description) this._isComplete();

    return this;
  }

  /**
   * @private
   * @method _isGroup
   * @description If the argument is a group
   * @returns {Boolean} The result
   */
  _isGroup() {
    return [1, 2].includes(this.type);
  }

  /**
   * @private
   * @method _isComplete
   * @description If the argument is complete
   * @returns {Boolean} The result
   */
  _isComplete() {
    if (typeof this.type !== "number" || !this.name || !this.description) return false;
    if (typeof this.required !== "boolean") delete this.required;
    else if (!this.required) delete this.required;

    if (this._isGroup()) {
      if (typeof this.options !== "object") return false;
      if (this.options.map((o) => o._isComplete()).filter((c) => !c).length !== 0) return false;
    }

    return true;
  }

  /**
   * @method _parse
   * @description Parse the argument to something the Discord API likes
   * @returns {Object} The result
   */
  _parse() {
    if (!this._isComplete()) throw new Error("Command argument isn't valid!");

    let o = {
      type: this.type,
      name: this.name,
      description: this.description
    };

    if (this._isGroup()) o.options = this.options.map((o) => o._parse());
    else o.required = this.required;

    return o;
  }

}

class CommandArgumentChoice {

  /**
   * @method setName
   * @description Sets the argument choice name
   * @param {String} name The command argument choice name (What the user sees)
   * @returns {CommandArgumentChoice} Returns itself for chaining
   */
  setName(name) {
    this.name = name;
    return this;
  }

  /**
   * @method setValue
   * @description Sets the argument choice value
   * @param {String} value The command argument choice value (What's send to the code)
   * @returns {CommandArgumentChoice} Returns itself for chaining
   */
  setValue(value) {
    this.value = value;
    return this;
  }

  /**
   * @private
   * @method _isComplete
   * @description If the argument choice is complete
   * @returns {Boolean} The result
   */
  _isComplete() {
    if (!this.name) return false;
    if (!this.value) this.value = this.name;
    return true;
  }

  /**
   * @method _parse
   * @description Parse the argument choice to something the Discord API likes
   * @returns {Object} The result
   */
  _parse() {
    return {
      name: this.name,
      value: this.value
    }
  }

}

module.exports = exports = CommandArgument;
exports.CommandArgumentChoice = CommandArgumentChoice;

exports.types = {
  subCommand: 1,
  subCommandGroup: 2,
  string: 3,
  integer: 4,
  boolean: 5,
  user: 6,
  channel: 7,
  role: 8
}