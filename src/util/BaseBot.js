const { existsSync, readFileSync, promises: {access, readdir } } = require("fs");
const { resolve, join } = require("path");
const { Client } = require("discord.js");

/**
 * @name BaseBot
 * @class BaseBot
 */
class BaseBot {
  constructor({dir = process.cwd(), token = "", clientOptions = {}} = {}) {
    this.client = new Client(clientOptions);

    this.events = new Map();
    this.commands = new Map();
    this.aliases = new Map();

    this._dir = dir;

    if (token) this.token = token;
    else {
      if (!existsSync(join(this._dir, "token.txt"))) {
        console.log("\x1b[1m\x1b[31mPlease provide a token in the bot startup object or create a file named \"token.txt\" in your main directory and paste your token there!\x1b[0m");
        process.exit(0);
      }
      this.token = readFileSync(join(this._dir, "token.txt")).toString("utf8");
    }
  }

  setConfig(fileOrConfig) {
    if (typeof fileOrConfig === "object") this.config = {...fileOrConfig};
    else this.config = require(join(this._dir, fileOrConfig));
  }

  async loadAll() {
    await this.loadFunctions();
    await this.loadEvents();
    await this.loadCommands();
  }

  async loadFunctions() {
    let functions = await this.getFiles("functions");
    for (let file of functions) {
      await this.loadFunction(file);
    }
    console.log(`\x1b[33m\x1b[1m${functions.length}\x1b[0m\x1b[33m functions loaded! \x1b[0m`);
  }

  async loadFunction(file) {
    // Try/catch block for errors
    try {

      let f = new (require(file)); // Require the function file and construct the class
      let name = await f.getName(); // Get the name of the class
      f.main = this; // Set "main" to the main class instance
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

  async loadEvents() {
    let events = await this.getFiles("events");
    for (let event of events) {
      await this.loadEvent(event);
    }
    console.log(`\x1b[34m\x1b[1m${this.events.size}\x1b[0m\x1b[34m events loaded! \x1b[0m`);
  }

  async loadEvent(event) {
    // Try/catch block for errors
    try {

      let e = new (require(event)); // Require the event file and construct the class
      let name = await e.getEvent(); // Get the name of the event
      e.main = this; // Sets "main" to the main class instance
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
  
  async loadCommands() {
    let commands = await this.getFiles("commands");
    for (let cmd of commands) {
      this.loadCommand(cmd);
    }
    console.log(`\x1b[35m\x1b[1m${this.commands.size}\x1b[0m\x1b[35m commands and \x1b[35m\x1b[1m${this.aliases.size}\x1b[0m\x1b[35m aliases loaded! \x1b[0m`);
  }

  loadCommand(file) {
    // Try/catch block for errors
    try {
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

  getFiles(folder) {
    return new Promise((res) => {
      access(`${process.cwd()}/${folder}`, "a").then(async () => {
        res(await this.loadFiles(`${process.cwd()}/${folder}`));
      }).catch((e) => {
        console.log(e);
        res([]);
      });
    });
  }

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

  async start() {
    // Start the discord.js client!
    return this.client.login(this.token);
  }
}

module.exports = BaseBot;