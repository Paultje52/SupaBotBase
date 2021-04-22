const { existsSync, readFileSync, promises: {access, readdir } } = require("fs");
const { resolve, join } = require("path");
const { Client } = require("discord.js");
const Database = require("./Database.js");
const SlashRegister = require("./SlashRegister.js");
const ErrorHandler = require("./ErrorHandler.js");

/**
 * Interface for the SupaBotBase Options
 * @interface Options
 * 
 * @property {string} [dir] The current dir. If not provided, it will be the process dir.
 * @property {string} [token] The bot token. If not provided,  will grab the token from "token.txt" in the main dir.
 * @property {object} [clientOptions] The discord.js options for the bot client.
 */

/**
 * @name 
 * @class
 * The main SupaBotBase Class
 */
class SupaBotBase {
  /**
   * Create a  instance
   * @param {Options} options The options for the base
   */
  constructor({dir = process.cwd(), token = "", clientOptions = {}} = {}) {
    this.client = new Client(clientOptions);

    this.events = new Map();
    this.commands = new Map();
    this.aliases = new Map();

    this._dir = dir;
    this._messageFunctions = {};
    this._messageHandlers = [];
    this.config = {};
    this.permissionChecks = {};

    this.loadToken(token);
  }

  /**
   * @method activateErrorHandler
   * @description Activates the error handler
   * @returns {Undefined}
   */
  activateErrorHandler() {
    this.errorHandler = new ErrorHandler(this);
  }

  /**
   * @method translateRawMessageEvents
   * @description Automaticly calls "messageReactionAdd" and "messageReactionRemove" when the message isn't cached. It also parses the raw data!
   * @returns {undefined}
   */
  translateRawMessageEvents() {
    // Make sure it only activates once
    if (this.translateRawMessageEventsActive) return;
    this.translateRawMessageEventsActive = true;

    // Listen!
    this.client.on("raw", async (packet) => {
      if (["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"].includes(packet.t)) {

        let channel = await this.client.channels.fetch(packet.d.channel_id);
        if (channel.messages.cache.has(packet.d.message_id)) return;

        let message = await channel.messages.fetch(packet.d.message_id);
        let emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        let user = await this.client.users.fetch(packet.d.user_id);
        
        let reaction = message.reactions.cache.get(emoji);
        if (reaction) reaction.users.cache.set(packet.d.user_id, user);
                
        this.client.emit(packet.t === "MESSAGE_REACTION_ADD" ? "messageReactionAdd" : "messageReactionRemove", reaction || {message, emoji}, user);

      }
    });

  }

  /**
   * @method loadToken
   * @description Loads the bot token
   * @returns {undefined}
   * @param {string} [token] The bot token. If not provided,  will grab the token from "token.txt" in the main dir.
   * @private
   */
  loadToken(token = false) {
    if (!token) {
      if (existsSync(join(this._dir, "token.txt"))) return this.token = readFileSync(join(this._dir, "token.txt")).toString("utf8");

      console.log("\x1b[1m\x1b[31mPlease provide a token in the bot startup object or create a file named \"token.txt\" in your main directory and paste your token there!\x1b[0m");
      process.exit(0);

    } else this.token = token;
  }

  /**
   * @method setConfig
   * @description Sets the config of the bot
   * @returns {undefined}
   * @param {string|object} fileOrConfig The bot config. Set as a string when it's a relative dir or an object if it's the options itself
   */
  setConfig(fileOrConfig) {
    if (typeof fileOrConfig === "object") this.config = {...fileOrConfig};
    else this.config = require(join(this._dir, fileOrConfig));

    if (!this.config.messages) this.config.messages = {};
    if (!this.config.messages.errorWithDatabase) this.config.messages.errorWithDatabase = "**Error**\nAn error occurred while trying to run \`{0}\`.\nThis error has been reported with ID **#{1}**";
    if (!this.config.messages.errorWithoutDatabase) this.config.messages.errorWithoutDatabase = "An error occurred while trying to run this command. The error has been reported!";
    if (!this.config.messages.botNoPermissions) this.config.messages.botNoPermissions = "Can't run this command. I'm missing the following permissions. {0}";
    if (!this.config.messages.userNoPermissions) this.config.messages.userNoPermissions = "Can't run this command. You're missing the following permissions. {0}";
    if (!this.config.messages.wrongArguments) this.config.messages.wrongArguments = "Wrong arguments!";
    if (!this.config.messages.usage) this.config.messages.usage = "Usage";
    if (!this.config.messages.example) this.config.messages.example = "Example";
    if (!this.config.messages.types) this.config.messages.types = {};
    if (!this.config.messages.types[4]) this.config.messages.types[4] = "a valid number";
    if (!this.config.messages.types[5]) this.config.messages.types[5] = "yes/no";
    if (!this.config.messages.types[6]) this.config.messages.types[6] = "a user (Mention or ID)";
    if (!this.config.messages.types[7]) this.config.messages.types[7] = "a channel (Mention or ID)";
    if (!this.config.messages.types[8]) this.config.messages.types[8] = "a role (Mention or ID)";
    if (!this.config.messages.needsToBe) this.config.messages.needsToBe = "Needs to be {0}";
    if (!this.config.messages.chooseBetweenSubcommands) this.config.messages.chooseBetweenSubcommands = "You have to choose between the following subcommands.";
    if (!this.config.messages.orOtherOptions) this.config.messages.orOtherOptions = "Or between the other options.";
    if (!this.config.messages.chooseBetweenOptions) this.config.messages.chooseBetweenOptions = "You have to choose between the following options.";
  }

  /**
   * @method loadAll
   * @description Loads the functions, events and commands
   * @returns {undefined}
   * @async
   */
  async loadAll() {
    await this.loadFunctions();
    await this.loadEvents();
    await this.loadCommands();
  }

  /**
   * @method loadFunctions
   * @description Loads the functions
   * @returns {undefined}
   * @param {string} [path] The name of the functions folder
   * @async
   */
  async loadFunctions(path = "functions") {
    let functions = await this.getFiles(path);
    for (let file of functions) {
      await this.loadFunction(file);
    }
    console.log(`\x1b[33m\x1b[1m${functions.length}\x1b[0m\x1b[33m functions loaded! \x1b[0m`);
  }

  /**
   * @method loadFunction
   * @description Loads a specific function with a file path
   * @returns {undefined}
   * @param {string} file The file of the function file
   * @async
   */
  async loadFunction(file) {
    // Try/catch block for errors
    try {
      // Delete the require cache of the command
      delete require.cache[require.resolve(file)];

      let f = new (require(file)); // Require the function file and construct the class
      let name = await f.getName(); // Get the name of the class
      f.main = this; // Set "main" to the main class instance
      f.client = this.client; // Set "client" to the discord.js client
      if (f.beforeLoad) await f.beforeLoad(); // Execute beforeLoad function if there is one.
      // Bind the function to the main class
      this[name] = (...args) => {
        return f.onExecute(...args);
      };

    } catch(e) {
      // Log error
      console.log(`\x1b[31m> Error while loading function ${file}!\n${e.message}\x1b[0m`);
    }
  }

  /**
   * @method loadEvents
   * @description Loads the events
   * @returns {undefined}
   * @param {string} [path] The name of the events folder
   * @async
   */
  async loadEvents(path = "events") {
    let events = await this.getFiles(path);
    for (let event of events) {
      await this.loadEvent(event);
    }
    console.log(`\x1b[34m\x1b[1m${this.events.size}\x1b[0m\x1b[34m events loaded! \x1b[0m`);
  }

  /**
   * @method loadFunction
   * @description Loads a specific event with a file path
   * @returns {undefined}
   * @param {string} event The file of the event class
   * @async
   */
  async loadEvent(event) {
    // Try/catch block for errors
    try {
      // Delete the require cache of the command
      delete require.cache[require.resolve(event)];

      let e = new (require(event)); // Require the event file and construct the class
      let name = await e.getEvent(); // Get the name of the event
      e.main = this; // Sets "main" to the main class instance
      e.client = this.client; // Set "client" to the discord.js client
      if (e.beforeLoad) await e.beforeLoad(); // Execute beforeLoad function if there is one.
      // The function for the event
      let f = (...args) => {
        e.onExecute(...args);
      };
      // Register the listener on discord.js's client
      this.client.on(name, f);
      // Adds the event to the events map
      this.events.set(event, {
        instance: e,
        function: f
      });

    } catch(e) {
      // Log error
      console.log(`\x1b[31m> Error while loading event ${event}!\n${e.message}\x1b[0m`);
    }
  }
  
  /**
   * @method loadCommands
   * @description Loads the commands
   * @returns {undefined}
   * @param {string} [path] The name of the commands folder
   * @async
   */
  async loadCommands(path = "commands") {
    let commands = await this.getFiles(path);
    for (let cmd of commands) {
      this.loadCommand(cmd);
    }
    console.log(`\x1b[35m\x1b[1m${this.commands.size}\x1b[0m\x1b[35m commands and \x1b[35m\x1b[1m${this.aliases.size}\x1b[0m\x1b[35m aliases loaded! \x1b[0m`);
  }


  /**
   * @method loadFunction
   * @description Loads a specific command with a file path
   * @returns {undefined}
   * @param {string} file The file of the command class
   * @async
   */
  loadCommand(file) {
    // Try/catch block for errors
    try {
      // Delete the require cache of the command
      delete require.cache[require.resolve(file)];
      // Require command file and construct the class
      let cmd = new (require(file));
      // Set the file path to the command
      cmd._file = file;
      // Set the client and bot instance on the command
      cmd.client = this.client;
      cmd.main = this;
      // Save the command to the commands map
      this.commands.set(cmd.help.name, cmd);
      // If the command has any aliases, load them.
      cmd.aliases.forEach((alias) => {
        if (this.aliases.get(alias)) return console.log(`\x1b[31m> Warning for loading command ${cmd} (${file})!\nThe alias ${alias} is already been used for command ${this.aliases.get(alias).help.name} (${this.aliases.get(alias)._file})\x1b[0m`)
        this.aliases.set(alias, cmd);
      });
    } catch(e) {
      // Log error
      console.log(`\x1b[31m> Error while loading command ${file}!\n${e.message}\n${e.stack.split("\n")[1]}\x1b[0m`);
    }
  }

  /**
   * @method getFiles
   * @description Gets the files of a folder, including files in subdirectories. 
   * @async
   * @param {string} folder The path to the folder
   * @returns {Array[String]} An array with the paths of the files
   */
  getFiles(folder) {
    return new Promise((res) => {
      access(`${this._dir}/${folder}`, "a").then(async () => {
        res(await this.loadFiles(`${this._dir}/${folder}`));
      }).catch((e) => {
        console.log(e);
        res([]);
      });
    });
  }

  /**
   * @method loadFiles
   * @async
   * @description Gets the files of a folder, including files in subdirectories
   * @returns {Array[String]} An array with the paths of the files 
   * @param {string} dir The path to the folder
   * @private
   */
  async loadFiles(dir) {
    const dirents = await readdir(dir, {
      withFileTypes: true
    });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = resolve(dir, dirent.name);
      return dirent.isDirectory() ? this.loadFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
  }

  /**
   * @method mountMessageHandler
   * @private
   * @description Mounts the message handler
   */
  mountMessageHandler() {
    this.loadEvent(join(__dirname, "MessageHandler.js"));
  }

  /**
   * @method mountSlashCommandHandler
   * @private
   * @description Mounts the slash command handler
   */
  mountSlashCommandHandler() {
    if (this.config && this.config.disable && this.config.disable.slash) return;
    this.loadEvent(join(__dirname, "SlashCommandHandler.js"));
  }

  /**
   * @method createDatabase
   * @description Creates a database for the bot
   * @param {String} [name] The name of the database
   * @returns {Promise} Promise is resolved when the database is created and loaded!
   */
  createDatabase(name = "database.sqlite") {
    this.database = new Database(name);
  }

  /**
   * @method addMessageFunction
   * @description Add a function to the message object
   * @param {String} name The name of the function (message.<name>)
   * @param {Function} func The function to execute
   * @returns {undefined}
   */
  addMessageFunction(name, func) {
    this._messageFunctions[name] = func;
  }

  /**
   * @method addMessageHandler
   * @description Execute code in the main message handler
   * @param {Function} func The function to execute. If the function returns false, the bot won't handle the message 
   * @returns {undefined}
   */
  addMessageHandler(func) {
    this._messageHandlers.push(func);
  }

  /**
   * @method start
   * @description Starts the bot
   * @async
   * @returns The return value of discord.js' client#login method.
   */
  async start() {
    // Mount the onmessage event
    this.mountMessageHandler();
    // Mount the slash command event listener
    this.mountSlashCommandHandler();
    // Start the discord.js client!
    return this.client.login(this.token);
  }

  /**
   * @method removeSlashCommands
   * @async
   * @returns {Number} The number of slash commands removed
   * @description Unregisters slash commands
   * @param {String|Undefined} testGuild The testguild ID, if in development
   */
  async removeSlashCommands(testGuild = false) {
    let slashCommands = new SlashRegister(this.commands, this);
    let registered = await slashCommands.getCurrentCommand(testGuild);
    await slashCommands.unregister(registered, testGuild);
    return registered.length || 0;
  }

  /**
   * @method registerSlashCommands
   * @async
   * @returns {undefined}
   * @description Checks the bot commands and registered slash commands. New commands will be registered, changed values of commands will be changed and commands no longer in the code will be deleted. When in development, add your testguild ID as the parameter to instantly see the changes!
   * @param {String|Undefined} testGuild A testguild ID
   */
  async registerSlashCommands(testGuild = false) {
    console.log(`\x1b[36m==[Checking slash commands]==\x1b[0m`);

    let slashCommands = new SlashRegister(this.commands, this);

    let { notRegistered, needChanging, canBeDeleted } = slashCommands.compareCommands(
      await slashCommands.getCurrentCommand(testGuild),
      slashCommands.getBotCommands()
    );

    await Promise.all([
      slashCommands.registerNewCommands(notRegistered, testGuild),
      slashCommands.changeCommands(needChanging, testGuild),
      slashCommands.deleteCommands(canBeDeleted, testGuild)
    ]);

    slashCommands.onQueueClear(() => {
      console.log(`\x1b[36m==[${notRegistered.length} new commands registered, ${needChanging.length} commands changed and ${canBeDeleted.length} commands deleted]==\x1b[0m`);
    });

  }

  /**
   * 
   * @method setPermissionCheck
   * @async
   * @returns {undefined}
   * @param {String} name The function name
   * @param {Function} func The function, with two parameters: message and args
   */
  setPermissionCheck(name, func) {
    this.permissionChecks[name] = func;
  }
}

module.exports = exports = SupaBotBase;
exports.CommandConstructor = require("./CommandConstructor.js");
exports.version = require("../package.json").version;