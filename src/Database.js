const betterSqlite3 = require("better-sqlite3");

module.exports = class Database {
  constructor(name) {
    this.db = betterSqlite3(name);
    this._ensureTable();
    this._prepareStatements();
  }

  _ensureTable() {
    this.db.prepare("CREATE TABLE IF NOT EXISTS `SupaBotBaseData` (`key` TEXT, `value` TEXT)")
      .run();
  }

  _prepareStatements() {
    this._getStatement = this.db.prepare("SELECT * FROM `SupaBotBaseData` WHERE `key` = ?");
    this._insertStatement = this.db.prepare("INSERT INTO `SupaBotBaseData` (`key`, `value`) VALUES (?, ?)");
    this._updateStatement = this.db.prepare("UPDATE `SupaBotBaseData` SET `value` = ? WHERE `key` = ?")
    this._deleteStatement = this.db.prepare("DELETE FROM `SupaBotBaseData` WHERE `key` = ?");
  }

  get(key) {
    let res = this._getStatement.get(key);
    return res ? JSON.parse(res.value) : undefined;
  }

  set(key, value) {
    if (!this.get(key)) this._insertStatement.run(key, JSON.stringify(value));
    else this._updateStatement.run(JSON.stringify(value), key);
  }

  delete(key) {
    this._deleteStatement.run(key);
  }
}