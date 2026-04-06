"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var fs = __toESM(require("fs/promises"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var import_child_process = require("child_process");
var import_util = require("util");
const execAsync = (0, import_util.promisify)(import_child_process.exec);
class ScriptRestore extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "script-restore"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  onReady() {
    const cfg = this.config;
    this.log.info(`Script Restore ready. Backup path: ${cfg.backupPath || "/opt/iobroker/backups"}`);
  }
  onUnload(callback) {
    callback();
  }
  async onMessage(obj) {
    if (!obj.callback) {
      return;
    }
    try {
      switch (obj.command) {
        case "listLocalFiles":
          await this.handleListLocalFiles(obj);
          break;
        case "parseLocalFile":
          await this.handleParseLocalFile(obj);
          break;
        case "parseUploadedFile":
          await this.handleParseUploadedFile(obj);
          break;
        default:
          this.sendTo(obj.from, obj.command, { error: "Unknown command" }, obj.callback);
      }
    } catch (e) {
      this.log.error(`Error handling ${obj.command}: ${e.message}`);
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async handleListLocalFiles(obj) {
    const cfg = this.config;
    const backupPath = cfg.backupPath || "/opt/iobroker/backups";
    try {
      const rawEntries = await fs.readdir(backupPath, { withFileTypes: true, encoding: "utf8" });
      const entries = rawEntries;
      const files = entries.filter(
        (e) => e.isFile() && (String(e.name).endsWith(".tar.gz") || String(e.name).endsWith(".tar") || String(e.name).endsWith(".json") || String(e.name).endsWith(".jsonl"))
      ).map((e) => String(e.name)).sort().reverse();
      this.sendTo(obj.from, obj.command, { files, path: backupPath }, obj.callback);
    } catch (e) {
      this.sendTo(
        obj.from,
        obj.command,
        { error: `Verzeichnis nicht lesbar: ${e.message}` },
        obj.callback
      );
    }
  }
  async handleParseLocalFile(obj) {
    const cfg = this.config;
    const backupPath = cfg.backupPath || "/opt/iobroker/backups";
    const msg = obj.message;
    const filename = path.basename(msg.filename);
    const filepath = path.join(backupPath, filename);
    try {
      const buf = await fs.readFile(filepath);
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async handleParseUploadedFile(obj) {
    const msg = obj.message;
    try {
      const buf = Buffer.from(msg.data, "base64");
      const scripts = await this.parseBuffer(buf, msg.name);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async parseBuffer(buf, filename) {
    const name = filename.toLowerCase();
    if (name.endsWith(".tar.gz") || name.endsWith(".tgz") || name.endsWith(".tar")) {
      return this.parseTarArchive(buf, name.endsWith(".tar") && !name.endsWith(".tar.gz"));
    }
    return this.parseJsonContent(buf.toString("utf8"), filename);
  }
  async parseTarArchive(buf, isPlainTar) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "script-restore-"));
    const tmpFile = path.join(tmpDir, `archive.tar${isPlainTar ? "" : ".gz"}`);
    try {
      await fs.writeFile(tmpFile, buf);
      const extractFlag = isPlainTar ? "-xf" : "-xzf";
      try {
        await execAsync(
          `tar ${extractFlag} "${tmpFile}" -C "${tmpDir}" --wildcards "*/objects.jsonl" "*/objects.json" "*/scripts.json" "*/script.json" 2>/dev/null`
        );
      } catch {
        await execAsync(`tar ${extractFlag} "${tmpFile}" -C "${tmpDir}" 2>/dev/null`).catch(() => {
        });
      }
      const targets = ["objects.jsonl", "objects.json", "scripts.json", "script.json"];
      const found = await this.findFile(tmpDir, targets);
      if (!found) {
        throw new Error(
          "Keine passende Datei im Archiv gefunden (objects.json, objects.jsonl, scripts.json, script.json)"
        );
      }
      const content = await fs.readFile(found, "utf8");
      return this.parseJsonContent(content, path.basename(found));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {
      });
    }
  }
  async findFile(dir, names) {
    const walk = async (d) => {
      let entries;
      try {
        entries = await fs.readdir(d, {
          withFileTypes: true,
          encoding: "utf8"
        });
      } catch {
        return null;
      }
      for (const e of entries) {
        const p = path.join(d, String(e.name));
        if (e.isDirectory()) {
          const found = await walk(p);
          if (found) {
            return found;
          }
        } else if (names.includes(String(e.name))) {
          return p;
        }
      }
      return null;
    };
    return walk(dir);
  }
  parseJsonContent(content, filename) {
    const scripts = [];
    const trimmed = content.trimStart();
    const isJsonl = filename.endsWith(".jsonl") || trimmed.startsWith("{") && !trimmed.startsWith('{\n  "') && trimmed.includes("\n{");
    if (isJsonl) {
      for (const line of content.split("\n")) {
        const l = line.trim();
        if (!l) {
          continue;
        }
        try {
          const item = JSON.parse(l);
          this.processItem(
            item._id || item.id,
            item.value || item.doc || item,
            scripts
          );
        } catch {
        }
      }
    } else {
      const data = JSON.parse(content);
      for (const [k, v] of Object.entries(data)) {
        this.processItem(k, v, scripts);
      }
    }
    return scripts.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }
  processItem(key, val, scripts) {
    var _a;
    if (!key || typeof val !== "object" || val === null) {
      return;
    }
    const v = val;
    if (["channel", "device", "folder", "meta"].includes(v.type)) {
      return;
    }
    if (v.type !== "script" && !key.startsWith("script.js.")) {
      return;
    }
    const c = v.common;
    if (!c || c.engineType === void 0 && c.source === void 0) {
      return;
    }
    const rawEngineType = typeof c.engineType === "string" ? c.engineType : "JS";
    const engineType = rawEngineType.toLowerCase();
    let stype;
    if (engineType.includes("ts") || engineType.includes("typescript")) {
      stype = "TypeScript";
    } else if (engineType.includes("blockly")) {
      stype = "Blockly";
    } else if (engineType.includes("rules")) {
      stype = "Rules";
    } else {
      stype = "JS";
    }
    let name;
    const nameObj = c.name;
    if (typeof nameObj === "object" && nameObj !== null) {
      const n = nameObj;
      name = n.de || n.en || Object.values(n)[0] || key.split(".").pop() || key;
    } else {
      name = typeof nameObj === "string" && nameObj ? nameObj : (_a = key.split(".").pop()) != null ? _a : key;
    }
    const scriptPath = key.startsWith("script.js.") ? key.slice(10) : key;
    scripts.push({
      name,
      path: scriptPath,
      type: stype,
      source: typeof c.source === "string" ? c.source : ""
    });
  }
}
if (require.main !== module) {
  module.exports = (options) => new ScriptRestore(options);
} else {
  (() => new ScriptRestore())();
}
//# sourceMappingURL=main.js.map
