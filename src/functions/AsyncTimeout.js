module.exports = class AsyncTimeout {

  getName() {
    return "asyncTimeout";
  }

  async onExecute(time) {
    return new Promise((res) => {
      setTimeout(res, time);
    });
  }

}