const { MessageEmbed } = require("discord.js");
const {CommandConstructor, ButtonHandler} = require("../../");
const {ButtonHandler: {ButtonRow, Button, colors}} = require("../../");

try {
  require("mathjs");
} catch(e) {
  throw new Error("Please install mathjs for this example!")
}
const { evaluate } = require("mathjs");

module.exports = class Calculator extends CommandConstructor {

  constructor() {
    super();

    this.setHelp({
      name: "calculator",
      description: "A calculator in discord!"
    });
  }

  async onExecute(message) {

    new ButtonHandler(this.main)
      .setRows(
        new ButtonRow(
          new Button().setText("7").setId("7"),
          new Button().setText("8").setId("8"),
          new Button().setText("9").setId("9"),
          new Button().setColor(colors.grey).setText("X").setId("*")
        ),
        new ButtonRow(
          new Button().setText("4").setId("4"),
          new Button().setText("5").setId("5"),
          new Button().setText("6").setId("6"),
          new Button().setColor(colors.grey).setText("÷").setId("/")
        ),
        new ButtonRow(
          new Button().setText("1").setId("1"),
          new Button().setText("2").setId("2"),
          new Button().setText("3").setId("3"),
          new Button().setColor(colors.grey).setText("+").setId("+")
        ),
        new ButtonRow(
          new Button().setColor(colors.red).setText("⇽").setId("backspace"),
          new Button().setText("0").setId("0"),
          new Button().setColor(colors.grey).setText("-").setId("-"),
          new Button().setColor(colors.green).setText("=").setId("calculate")
        )
      )

      .restrictTo(message.author)
      .setEmbed(new MessageEmbed()
        .setTitle("Calculator")
        .setDescription("```css\n ```")
        .setColor("#2F3136")
      )

      .send(message)
      
      .then((handler) => {
        let soFar = "";
        let needToEraseNext = false;

        handler.on("click", (id, messageActions) => {
          if (needToEraseNext) soFar = "";

          if (id === "backspace") {
            if (soFar.length !== 0) soFar = soFar.substr(0, soFar.length-1);
          } else if (id === "calculate") {
            needToEraseNext = true;
            soFar += " = " + evaluate(soFar);
          } else soFar += id;

          handler.setEmbed(new MessageEmbed()
            .setTitle("Calculator")
            .setDescription(`\`\`\`css\n${soFar || " "}\`\`\``)
            .setColor("#2F3136")
          );
          messageActions.update();
          
        });
      });

  }

}