const betterSqlite3 = require("better-sqlite3");

module.exports = class Database {
  constructor(name) {
    this.db = betterSqlite3(name);
    this._ensureTable();
    this._prepareStatements();
  }

  _ensureTable() {
    this.db.prepare("CREATE TABLE IF NOT EXISTS `BaseBotData` (`key` TEXT, `value` TEXT)")
      .run();
  }

  _prepareStatements() {
    this._getStatement = this.db.prepare("SELECT * FROM `BaseBotData` WHERE `key` = ?");
    this._insertStatement = this.db.prepare("INSERT INTO `BaseBotData` (`key`, `value`) VALUES (?, ?)");
    this._updateStatement = this.db.prepare("UPDATE `BaseBotData` SET `value` = ? WHERE `key` = ?")
    this._deleteStatement = this.db.prepare("DELETE FROM `BaseBotData` WHERE `key` = ?");
  }

  get(key) {
    let res = this._getStatement.get(key);
    return res ? res.value : undefined;
  }

  set(key, value) {
    if (!this.get(key)) this._insertStatement.run(key, value);
    else this._updateStatement.run(value, key);
  }

  delete(key) {
    this._deleteStatement.run(key);
  }
}