const fetch = require("node-fetch");
const EventEmitter = require("events");
const { User, Message, MessageEmbed } = require("discord.js");

/**
 * @class
 * @name ButtonHandler
 * @description The class to create button menus!
 */
class ButtonHandler extends EventEmitter {

  /**
   * @constructor
   * @param {supaBotBase} supaBotBase SupaBotBase
   */
  constructor(supaBotBase) {
    super();
    this.supaBotBase = supaBotBase;
  }

  /**
   * @method setRows
   * @description Set the button rows
   * @param {...Button} rows The button rows
   * @returns {ButtonHandler} Itself for chaining
   */
  setRows(...rows) {
    this.rows = rows;
    return this;
  }

  /**
   * @method restrictTo
   * @description Restrict the button clicking to a discord.js user
   * @param {User} user Discord user
   * @returns {ButtonHandler} Itself for chaining
   */
  restrictTo(user) {
    this.user = user;
    return this;
  }

  /**
   * @method setMessage
   * @description Set the content of the message
   * @param {String} message The message content
   * @returns {ButtonHandler} Itself for chaining
   */
  setMessage(message) {
    this.content = message;
    return this
  }

  /**
   * @method setEmbed
   * @description Set an embed for the message
   * @param {MessageEmbed} embed The message content
   * @returns {ButtonHandler} Itself for chaining
   */
  setEmbed(embed) {
    this.embed = embed;
    return this
  }
  
  /**
   * @method send
   * @description Send the message!
   * @param {Message} message The discord.js message
   * @returns {ButtonHandler} Itself for chaining
   */
  async send(message) {
    let rows = this.rows.map((r) => r._parse());

    let body = {
      components: rows
    };
    if (this.content) body.content = this.content;
    if (this.embed) body.embed = this.embed.toJSON();

    let res;
    if (message.isSlashCommand) res = await this._editSlashCommandResponse(message, body)
    else res = await this._sendMessage(message, body);

    let result = await res.json();    
    this.id = result.id;
    this.channelId = message.channel.id;

    this.supaBotBase.client.on("raw", (packet) => {
      if (packet.t !== "INTERACTION_CREATE" || packet.d.type !== 3 || packet.d.message.id !== this.id) return;
      if (this.user && packet.d.member.user.id !== this.user.id) return;

      fetch(`https://discord.com/api/interactions/${packet.d.id}/${packet.d.token}/callback`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${this.supaBotBase.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: 6,
          data: {
            content: ""
          }
        })
      }).then(() => {


        this._emitClick(packet.d.data.custom_id);

      });


    });

    return this;
  }

  /**
   * @method _editSlashCommandResponse
   * @private
   * @description Edit the slash command response
   * @param {Message} message The discord.js message
   * @param {Object} body The body to send
   * @returns {Any} The node-fetch result
   */
  async _editSlashCommandResponse(message, body) {    
    if (body.embed) body.embeds = [body.embed];   
    if (message.command && message.command.slashCommandType === "hidden") body.flags = 64;

    return await fetch(`https://discord.com/api/webhooks/${message._slashCommandData.clientId}/${message._slashCommandData.token}/messages/@original`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * @method _sendMessage
   * @private
   * @description Send the message
   * @param {Message} message The discord.js message
   * @param {Object} body The body to send
   * @returns {Any} The node-fetch result
   */
  async _sendMessage(message, body) {
    return await fetch(`https://discord.com/api/channels/${message.channel.id}/messages`, {
      method: "POST",
      
      headers: {
        Authorization: `Bot ${this.supaBotBase.token}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    });
  }

  /**
   * @method _emitClick
   * @private
   * @description Emit the click event and prepare the actions
   * @param {String} id The button click ID
   * @returns {void} Nothing
   */
  _emitClick(id) {
    this.emit("click", id, {
      update: () => {
        let rows = this.rows.map((r) => r._parse());
        let body = {
          components: rows
        };
        if (this.content) body.content = this.content;
        if (this.embed) body.embed = this.embed.toJSON();

        fetch(`https://discord.com/api/channels/${this.channelId}/messages/${this.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${this.supaBotBase.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      },

      delete: () => {
        
        fetch(`https://discord.com/api/channels/${this.channelId}/messages/${this.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${this.supaBotBase.token}`,
            "Content-Type": "application/json"
          }
        });
      }

    });
  }

}

/**
 * @name Button
 * @class
 * @description A row for buttons
 */
class Button {

  /**
   * @method setText
   * @description Set the text for a button
   * @param {String} text The button text
   * @returns {Button} Itself for chaining
   */
  setText(text) {
    this.label = text;
    return this;
  }

  /**
   * @method setText
   * @description Set the text for a button
   * @param {String} text The button text
   * @returns {Button} Itself for chaining
   */
  setId(id) {
    this.id = id;
    return this;
  }

  /**
   * @method setColor
   * @description Set the color for a button
   * @param {Number} color The button color (Use SupaBotBase#ButtonHandler#colors)
   * @returns {Button} Itself for chaining
   */
  setColor(color) {
    this.style = color;
    return this;
  }

  /**
   * @method setLink
   * @description Add a link button
   * @param {String} text The URL
   * @returns {Button} Itself for chaining
   */
  setLink(url) {
    this.style = 5;
    this.url = url;
    return this;
  }

  /**
   * @method setDisabled
   * @description Set if the button should be disabled
   * @param {Boolean} disabled Value
   * @returns {Button} Itself for chaining
   */
  setDisabled(disabled) {
    this.disabled = disabled;
    return this;
  }

  /**
   * @method setEmoji
   * @description Add an emoji to a button
   * @param {String} emoji The emoji
   * @returns {Button} Itself for chaining
   */
  setEmoji(emoji) {
    this.emoji = emoji;
    return this;
  }

  /**
   * @method _parse
   * @description Used to parse the button to something discord likes
   * @returns {Object} An object
   */
  _parse() {
    let o = {
      type: 2,
      label: this.label,
      custom_id: this.id,
      style: this.style || 1,
      disabled: this.disabled || false,
      emoji: this.emoji
    };

    if (this.style === 5) o.url = url;

    return o;
  }

}

/**
 * @name ButtonRow
 * @class
 * @description A row for buttons
 */
class ButtonRow {

  /**
   * @constructor
   * @description Add buttons to a row
   * @param {...Button} buttons 
   */
  constructor(...buttons) {
    this.buttons = buttons;
  }

  /**
   * @method _parse
   * @description Used to parse the button to something discord likes
   * @returns {Object} An object
   */
  _parse() {
    return {
      type: 1,
      components: this.buttons.map((b) => b._parse())
    }
  }

}

module.exports = exports = ButtonHandler;

exports.ButtonRow = ButtonRow;
exports.Button = Button;

exports.colors = {
  blue: 1,
  grey: 2,
  green: 3,
  red: 4
};