module.exports = {
  disable: {
    message: false,
    slash: false,
    mentionPrefix: false
  },
  prefix: ".",

  database: {
    defaultGuildSettings: {
      prefix: "."
    },
    defaultUserSettings: {}
  },

  messages: {
    errorWithDatabase: "**Error**\nAn error occurred while trying to run \`{0}\`.\nThis error has been reported with ID **#{1}**",
    errorWithoutDatabase: "An error occurred while trying to run this command. The error has been reported!",

    botNoPermissions: "Can't run this command. I'm missing the following permissions. {0}",
    userNoPermissions: "Can't run this command. You're missing the following permissions. {0}",

    wrongArguments: "Wrong arguments!",
    usage: "Usage",
    example: "Example",
    types: {
      4: "a valid number",
      5: "yes/no",
      6: "a user (Mention or ID)",
      7: "a channel (Mention or ID)",
      8: "a role (Mention or ID)"
    },
    needsToBe: "Needs to be {0}",

    chooseBetweenSubcommands: "You have to choose between the following subcommands.",
    orOtherOptions: "Or between the other options.",
    chooseBetweenOptions: "You have to choose between the following options."
  }
};