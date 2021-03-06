const { CommandConstructor, CommandArgument } = require(`../../`);
const { CommandArgument: {types} } = require("../../");

let permissionList = {
  CREATE_INSTANT_INVITE: "Create invites",
  KICK_MEMBERS: "Kick members",
  BAN_MEMBERS: "Ban members",
  MANAGE_CHANNELS: "Edit channels",
  MANAGE_GUILD: "Edit guild settings",
  ADD_REACTIONS: "Add message reactions",
  VIEW_AUDIT_LOG: "View audit log",
  PRIORITY_SPEAKER: "Priority speaker",
  STREAM: "Go live",
  VIEW_CHANNEL: "View channels",
  SEND_MESSAGES: "Send messages",
  SEND_TTS_MESSAGES: "Send tts messages",
  MANAGE_MESSAGES: "Delete messages",
  EMBED_LINKS: "Link preview",
  ATTACH_FILES: "Send files",
  READ_MESSAGE_HISTORY: "Read message history",
  MENTION_EVERYONE: "Mention everyone",
  USE_EXTERNAL_EMOJIS: "Send external emojis",
  VIEW_GUILD_INSIGHTS: "View guild insights",
  CONNECT: "Join voicechannels",
  SPEAK: "Speak in voicechannels",
  MUTE_MEMBERS: "Mute members",
  DEAFEN_MEMBERS: "Deafen members",
  MOVE_MEMBERS: "Move members",
  USE_VAD: "Use voiceactivity",
  CHANGE_NICKNAME: "Change nickname",
  MANAGE_NICKNAMES: "Change other nicknames",
  MANAGE_ROLES: "Manage roles",
  MANAGE_WEBHOOKS: "Manage webhooks",
  MANAGE_EMOJIS: "Manage emojis"
}

module.exports = class Permissions extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "permission",
      description: "Get the enabled and disabled permissions for a user of a role!",
      usage: "%PREFIX%%CMD% <user/role> <@user/@role> [#channel]"
    });
    this.setAliases("prm", "permission", "getpermission");

    this.setArgs(
      new CommandArgument(types.subCommand)
        .setName("user")
        .setDescription("Get the permissions for a user")
        .setOptions(
          new CommandArgument(types.user)
            .setName("user")
            .setDescription("The target user")
            .setRequired(true),

          new CommandArgument(types.channel)
            .setName("channel")
            .setDescription("A channel to get the permissiosn from")
            .setRequired(false)
        ),
    
      new CommandArgument(types.subCommand)
        .setName("role")
        .setDescription("Get the permissions for a role")
        .setOptions(
          new CommandArgument(types.role)
            .setName("role")
            .setDescription("The target role")
            .setRequired(true),

          new CommandArgument(types.channel)
            .setName("channel")
            .setDescription("A channel to get the permissions from")
            .setRequired(false)
        )
    )
    
    this.setExamples(
      "%PREFIX%permission user @user",
      "%PREFIX%permission user @user #channel",
      "%PREFIX%permission role @role",
      "%PREFIX%permission role @role #channel"
    );

    this.setSlashCommandsEnabled(true);
    this.setSlashCommandType("hidden");
  }

  onExecute(message, args) {

    let permissions = args[1].permissions;
    if (args[2]) permissions = args[1].permissionsIn(args[2]);
    permissions = permissions.serialize();
    
    let allowed = [];
    let denied = [];

    if (permissions["ADMINISTRATOR"]) {
      allowed = ["Everything"];

    } else {
      
      for (let permission in permissions) {
        if (permission === "ADMINISTRATOR") continue;

        if (permissions[permission]) allowed.push(permissionList[permission]);
        else denied.push(permissionList[permission]);
      }

    }

    if (allowed.length === 0) allowed = "";
    else allowed = `+ ${allowed.join("\n+ ")}`;
    if (denied.length === 0) denied = "";
    else denied = `- ${denied.join("\n- ")}`;

    message.answerCommand(`Permission list for ${args[1]} ${args[2] ? `In ${args[2]}` : ""} \`\`\`diff\n${allowed && denied ? `${allowed}\n\n${denied}` : allowed || denied}\`\`\``);

  }

}