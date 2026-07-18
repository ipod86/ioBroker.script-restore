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
var fs = __toESM(require("node:fs/promises"));
var path = __toESM(require("node:path"));
var os = __toESM(require("node:os"));
var tar = __toESM(require("tar"));
var ftp = __toESM(require("basic-ftp"));
var import_node_stream = require("node:stream");
var https = __toESM(require("node:https"));
var http = __toESM(require("node:http"));
var import_ssh2_sftp_client = __toESM(require("ssh2-sftp-client"));
const SMB2 = require("@marsaud/smb2");
function sanitizeId(raw) {
  return raw.replace(/\s/g, "_").replace(/[^a-zA-Z0-9_\-.]/g, "_");
}
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
    this.log.info(`Script Restore ready. Backup path: ${this.config.backupPath || "/opt/iobroker/backups"}`);
  }
  onUnload(callback) {
    callback();
  }
  async onMessage(obj) {
    var _a;
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
        case "getSourceConfig": {
          let language = "en";
          try {
            const sysCfg = await this.getForeignObjectAsync("system.config");
            const lang = (_a = sysCfg == null ? void 0 : sysCfg.common) == null ? void 0 : _a.language;
            if (typeof lang === "string" && lang) {
              language = lang;
            }
          } catch {
          }
          this.sendTo(
            obj.from,
            obj.command,
            {
              localEnabled: this.config.localEnabled !== false,
              ftpEnabled: !!this.config.ftpEnabled,
              smbEnabled: !!this.config.smbEnabled,
              httpEnabled: !!this.config.httpEnabled,
              sftpEnabled: !!this.config.sftpEnabled,
              webdavEnabled: !!this.config.webdavEnabled,
              language
            },
            obj.callback
          );
          break;
        }
        case "testLocalPath":
          await this.handleTestLocalPath(obj);
          break;
        case "suggestBackupPath":
          await this.handleSuggestBackupPath(obj);
          break;
        case "parseHttpUrl":
          await this.handleParseHttpUrl(obj);
          break;
        case "testSftp":
          await this.handleTestSftp(obj);
          break;
        case "listSftpFiles":
          await this.handleListSftpFiles(obj);
          break;
        case "parseSftpFile":
          await this.handleParseSftpFile(obj);
          break;
        case "testWebdav":
          await this.handleTestWebdav(obj);
          break;
        case "listWebdavFiles":
          await this.handleListWebdavFiles(obj);
          break;
        case "parseWebdavFile":
          await this.handleParseWebdavFile(obj);
          break;
        case "testFtp":
          await this.handleTestFtp(obj);
          break;
        case "testSmb":
          await this.handleTestSmb(obj);
          break;
        case "listFtpFiles":
          await this.handleListFtpFiles(obj);
          break;
        case "parseFtpFile":
          await this.handleParseFtpFile(obj);
          break;
        case "listSmbFiles":
          await this.handleListSmbFiles(obj);
          break;
        case "parseSmbFile":
          await this.handleParseSmbFile(obj);
          break;
        case "restoreScript":
          await this.handleRestoreScript(obj);
          break;
        case "enableScript":
          await this.handleEnableScript(obj);
          break;
        default:
          this.sendTo(obj.from, obj.command, { error: "Unknown command" }, obj.callback);
      }
    } catch (e) {
      this.log.error(`Error handling ${obj.command}: ${e.message}`);
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  // ─── Local ───────────────────────────────────────────────────────────────
  async handleListLocalFiles(obj) {
    if (this.config.localEnabled === false) {
      this.sendTo(obj.from, obj.command, { error: "Local source not enabled" }, obj.callback);
      return;
    }
    const backupPath = this.config.backupPath || "/opt/iobroker/backups";
    try {
      const entries = await fs.readdir(backupPath, { withFileTypes: true, encoding: "utf8" });
      const files = entries.filter((e) => {
        const n = String(e.name);
        return e.isFile() && (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      }).map((e) => String(e.name)).sort().reverse();
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
    if (this.config.localEnabled === false) {
      this.sendTo(obj.from, obj.command, { error: "Local source not enabled" }, obj.callback);
      return;
    }
    const backupPath = this.config.backupPath || "/opt/iobroker/backups";
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
  // ─── Tests ───────────────────────────────────────────────────────────────
  async handleTestFtp(obj) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
      await client.access({
        host: this.config.ftpHost,
        port: this.config.ftpPort || 21,
        user: this.config.ftpUser || "anonymous",
        password: this.config.ftpPassword,
        secure: this.config.ftpSecure || false
      });
      const list = await client.list(this.config.ftpPath || "/");
      const count = list.filter((i) => i.type === ftp.FileType.File).length;
      this.sendTo(
        obj.from,
        obj.command,
        `\u2713 Verbunden! ${count} Datei(en) in: ${this.config.ftpPath || "/"}`,
        obj.callback
      );
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      client.close();
    }
  }
  async handleTestSmb(obj) {
    const smb = new SMB2({
      share: `\\\\${this.config.smbHost}\\${this.config.smbShare}`,
      username: this.config.smbUser || "",
      password: this.config.smbPassword || "",
      domain: this.config.smbDomain || ""
    });
    try {
      const files = await this.smbReaddir(smb, this.config.smbPath || "");
      this.sendTo(
        obj.from,
        obj.command,
        `\u2713 Verbunden! ${files.length} Eintr\xE4ge in: \\\\${this.config.smbHost}\\${this.config.smbShare}${this.config.smbPath ? `\\${this.config.smbPath}` : ""}`,
        obj.callback
      );
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      smb.disconnect();
    }
  }
  // ─── FTP ─────────────────────────────────────────────────────────────────
  createFtpClient() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    return client;
  }
  async ftpConnect(client) {
    await client.access({
      host: this.config.ftpHost,
      port: this.config.ftpPort || 21,
      user: this.config.ftpUser || "anonymous",
      password: this.config.ftpPassword,
      secure: this.config.ftpSecure || false
    });
  }
  async handleListFtpFiles(obj) {
    if (!this.config.ftpEnabled) {
      this.sendTo(obj.from, obj.command, { error: "FTP not enabled" }, obj.callback);
      return;
    }
    const client = this.createFtpClient();
    try {
      await this.ftpConnect(client);
      const remotePath = this.config.ftpPath || "/";
      const list = await client.list(remotePath);
      const files = list.filter((item) => {
        const n = item.name;
        return item.type === ftp.FileType.File && (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      }).map((item) => item.name).sort().reverse();
      this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      client.close();
    }
  }
  async handleParseFtpFile(obj) {
    if (!this.config.ftpEnabled) {
      this.sendTo(obj.from, obj.command, { error: "FTP not enabled" }, obj.callback);
      return;
    }
    const msg = obj.message;
    const filename = path.basename(msg.filename);
    const remotePath = path.posix.join(this.config.ftpPath || "/", filename);
    const client = this.createFtpClient();
    try {
      await this.ftpConnect(client);
      const chunks = [];
      const writable = new import_node_stream.Writable({
        write(chunk, _enc, cb) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          cb();
        }
      });
      await client.downloadTo(writable, remotePath);
      const buf = Buffer.concat(chunks);
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      client.close();
    }
  }
  // ─── SMB ─────────────────────────────────────────────────────────────────
  createSmbClient() {
    return new SMB2({
      share: `\\\\${this.config.smbHost}\\${this.config.smbShare}`,
      username: this.config.smbUser || "",
      password: this.config.smbPassword || "",
      domain: this.config.smbDomain || ""
    });
  }
  smbReaddir(smb, dirPath) {
    return new Promise((resolve, reject) => {
      smb.readdir(dirPath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }
  smbReadFile(smb, filePath) {
    return new Promise((resolve, reject) => {
      smb.readFile(filePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  async handleListSmbFiles(obj) {
    if (!this.config.smbEnabled) {
      this.sendTo(obj.from, obj.command, { error: "SMB not enabled" }, obj.callback);
      return;
    }
    const smb = this.createSmbClient();
    try {
      const smbPath = this.config.smbPath || "";
      const entries = await this.smbReaddir(smb, smbPath);
      const files = entries.filter((n) => {
        return (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      }).sort().reverse();
      this.sendTo(obj.from, obj.command, { files, path: smbPath }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      smb.disconnect();
    }
  }
  async handleParseSmbFile(obj) {
    if (!this.config.smbEnabled) {
      this.sendTo(obj.from, obj.command, { error: "SMB not enabled" }, obj.callback);
      return;
    }
    const msg = obj.message;
    const filename = path.basename(msg.filename);
    const smbPath = this.config.smbPath || "";
    const filePath = smbPath ? `${smbPath}\\${filename}` : filename;
    const smb = this.createSmbClient();
    try {
      const buf = await this.smbReadFile(smb, filePath);
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      smb.disconnect();
    }
  }
  // ─── Parsing ─────────────────────────────────────────────────────────────
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
      const targets = /* @__PURE__ */ new Set(["objects.jsonl", "objects.json", "scripts.json", "script.json"]);
      await tar.x({
        file: tmpFile,
        cwd: tmpDir,
        gzip: !isPlainTar,
        filter: (p) => targets.has(path.basename(p))
      }).catch(async () => {
        await tar.x({ file: tmpFile, cwd: tmpDir, gzip: !isPlainTar }).catch(() => {
        });
      });
      const found = await this.findFile(tmpDir, [...targets]);
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
        entries = await fs.readdir(d, { withFileTypes: true, encoding: "utf8" });
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
          this.processItem(item._id || item.id, item.value || item.doc || item, scripts);
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
  // ─── Suggest backup path ─────────────────────────────────────────────────
  async handleTestLocalPath(obj) {
    var _a, _b, _c;
    const msgs = {
      pathNotFound: {
        en: "\u2717 Path not found",
        de: "\u2717 Pfad nicht gefunden",
        ru: "\u2717 \u041F\u0443\u0442\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
        pt: "\u2717 Caminho n\xE3o encontrado",
        nl: "\u2717 Pad niet gevonden",
        fr: "\u2717 Chemin introuvable",
        it: "\u2717 Percorso non trovato",
        es: "\u2717 Ruta no encontrada",
        pl: "\u2717 \u015Acie\u017Cka nie znaleziona",
        uk: "\u2717 \u0428\u043B\u044F\u0445 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
        "zh-cn": "\u2717 \u8DEF\u5F84\u672A\u627E\u5230"
      },
      noBackups: {
        en: "\u26A0 No backups found in folder",
        de: "\u26A0 Keine Backups im Ordner gefunden",
        ru: "\u26A0 \u0420\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0435 \u043A\u043E\u043F\u0438\u0438 \u0432 \u043F\u0430\u043F\u043A\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B",
        pt: "\u26A0 Nenhum backup encontrado na pasta",
        nl: "\u26A0 Geen back-ups gevonden in map",
        fr: "\u26A0 Aucune sauvegarde trouv\xE9e dans le dossier",
        it: "\u26A0 Nessun backup trovato nella cartella",
        es: "\u26A0 No se encontraron copias de seguridad en la carpeta",
        pl: "\u26A0 Nie znaleziono kopii zapasowych w folderze",
        uk: "\u26A0 \u0423 \u043F\u0430\u043F\u0446\u0456 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0438\u0445 \u043A\u043E\u043F\u0456\u0439 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
        "zh-cn": "\u26A0 \u6587\u4EF6\u5939\u4E2D\u672A\u627E\u5230\u5907\u4EFD"
      },
      backupsFound: {
        en: "\u2713 {n} backup(s) found",
        de: "\u2713 {n} Backup(s) gefunden",
        ru: "\u2713 \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0445 \u043A\u043E\u043F\u0438\u0439: {n}",
        pt: "\u2713 {n} backup(s) encontrado(s)",
        nl: "\u2713 {n} back-up(s) gevonden",
        fr: "\u2713 {n} sauvegarde(s) trouv\xE9e(s)",
        it: "\u2713 {n} backup trovati",
        es: "\u2713 {n} copia(s) de seguridad encontrada(s)",
        pl: "\u2713 Znaleziono {n} kopii zapasowych",
        uk: "\u2713 \u0417\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0438\u0445 \u043A\u043E\u043F\u0456\u0439: {n}",
        "zh-cn": "\u2713 \u627E\u5230 {n} \u4E2A\u5907\u4EFD"
      }
    };
    let lang = "en";
    try {
      const sysConfig = await this.getForeignObjectAsync("system.config");
      lang = (_b = (_a = sysConfig == null ? void 0 : sysConfig.common) == null ? void 0 : _a.language) != null ? _b : "en";
    } catch {
    }
    const t = (key, n) => {
      var _a2, _b2, _c2, _d;
      const m = (_d = (_c2 = (_a2 = msgs[key]) == null ? void 0 : _a2[lang]) != null ? _c2 : (_b2 = msgs[key]) == null ? void 0 : _b2.en) != null ? _d : key;
      return n !== void 0 ? m.replace("{n}", String(n)) : m;
    };
    const backupPath = ((_c = this.config.backupPath) == null ? void 0 : _c.trim()) || "/opt/iobroker/backups";
    this.log.info(`testLocalPath: path="${backupPath}"`);
    try {
      const rawEntries = await fs.readdir(backupPath, { withFileTypes: true, encoding: "utf8" });
      const files = rawEntries.filter((e) => {
        const n = String(e.name);
        return e.isFile() && (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      });
      if (files.length === 0) {
        this.sendTo(obj.from, obj.command, { result: t("noBackups") }, obj.callback);
      } else {
        this.sendTo(obj.from, obj.command, { result: t("backupsFound", files.length) }, obj.callback);
      }
    } catch {
      this.sendTo(obj.from, obj.command, { result: t("pathNotFound") }, obj.callback);
    }
  }
  async handleSuggestBackupPath(obj) {
    var _a;
    const candidates = ["/opt/iobroker/backups", "/root/backups"];
    try {
      const backupObj = await this.getForeignObjectAsync("system.adapter.backitup.0");
      if ((_a = backupObj == null ? void 0 : backupObj.native) == null ? void 0 : _a.defaultFolder) {
        candidates.unshift(backupObj.native.defaultFolder);
      }
    } catch {
    }
    for (const p of candidates) {
      try {
        await fs.access(p);
        this.sendTo(obj.from, obj.command, { result: p }, obj.callback);
        return;
      } catch {
      }
    }
    this.sendTo(obj.from, obj.command, { result: "" }, obj.callback);
  }
  // ─── HTTP ────────────────────────────────────────────────────────────────
  downloadUrl(urlRaw) {
    const url = urlRaw.startsWith("http://") || urlRaw.startsWith("https://") ? urlRaw : `https://${urlRaw}`;
    return new Promise((resolve, reject) => {
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, { timeout: 3e4 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy(new Error("Request timed out"));
      });
    });
  }
  async handleParseHttpUrl(obj) {
    if (!this.config.httpEnabled) {
      this.sendTo(obj.from, obj.command, { error: "HTTP not enabled" }, obj.callback);
      return;
    }
    const msg = obj.message;
    const filename = msg.url.split("/").pop() || "backup";
    try {
      const buf = await this.downloadUrl(msg.url);
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  // ─── SFTP ────────────────────────────────────────────────────────────────
  async handleTestSftp(obj) {
    const sftp = new import_ssh2_sftp_client.default();
    try {
      await sftp.connect({
        host: this.config.sftpHost,
        port: this.config.sftpPort || 22,
        username: this.config.sftpUser,
        password: this.config.sftpPassword
      });
      const list = await sftp.list(this.config.sftpPath || "/");
      const count = list.filter((i) => i.type === "-").length;
      this.sendTo(
        obj.from,
        obj.command,
        `\u2713 Verbunden! ${count} Datei(en) in: ${this.config.sftpPath || "/"}`,
        obj.callback
      );
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      await sftp.end();
    }
  }
  async handleListSftpFiles(obj) {
    if (!this.config.sftpEnabled) {
      this.sendTo(obj.from, obj.command, { error: "SFTP not enabled" }, obj.callback);
      return;
    }
    const sftp = new import_ssh2_sftp_client.default();
    try {
      await sftp.connect({
        host: this.config.sftpHost,
        port: this.config.sftpPort || 22,
        username: this.config.sftpUser,
        password: this.config.sftpPassword
      });
      const remotePath = this.config.sftpPath || "/";
      const list = await sftp.list(remotePath);
      const files = list.filter((i) => {
        const n = i.name;
        return i.type === "-" && (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      }).map((i) => i.name).sort().reverse();
      this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      await sftp.end();
    }
  }
  async handleParseSftpFile(obj) {
    if (!this.config.sftpEnabled) {
      this.sendTo(obj.from, obj.command, { error: "SFTP not enabled" }, obj.callback);
      return;
    }
    const msg = obj.message;
    const filename = path.basename(msg.filename);
    const remotePath = path.posix.join(this.config.sftpPath || "/", filename);
    const sftp = new import_ssh2_sftp_client.default();
    try {
      await sftp.connect({
        host: this.config.sftpHost,
        port: this.config.sftpPort || 22,
        username: this.config.sftpUser,
        password: this.config.sftpPassword
      });
      const buf = await sftp.get(remotePath);
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    } finally {
      await sftp.end();
    }
  }
  // ─── WebDAV ──────────────────────────────────────────────────────────────
  async handleTestWebdav(obj) {
    try {
      const { createClient: createWebdavClient } = await Promise.resolve().then(() => __toESM(require("webdav")));
      const client = createWebdavClient(this.config.webdavUrl, {
        username: this.config.webdavUser,
        password: this.config.webdavPassword
      });
      const list = await client.getDirectoryContents(this.config.webdavPath || "/", {
        signal: AbortSignal.timeout(3e4)
      });
      const arr = Array.isArray(list) ? list : list.data;
      this.sendTo(
        obj.from,
        obj.command,
        `\u2713 Verbunden! ${arr.length} Eintr\xE4ge in: ${this.config.webdavPath || "/"}`,
        obj.callback
      );
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async handleListWebdavFiles(obj) {
    if (!this.config.webdavEnabled) {
      this.sendTo(obj.from, obj.command, { error: "WebDAV not enabled" }, obj.callback);
      return;
    }
    try {
      const { createClient: createWebdavClient } = await Promise.resolve().then(() => __toESM(require("webdav")));
      const client = createWebdavClient(this.config.webdavUrl, {
        username: this.config.webdavUser,
        password: this.config.webdavPassword
      });
      const remotePath = this.config.webdavPath || "/";
      const list = await client.getDirectoryContents(remotePath, { signal: AbortSignal.timeout(3e4) });
      const arr = Array.isArray(list) ? list : list.data;
      const files = arr.filter((i) => {
        const n = i.basename;
        return i.type === "file" && (n.startsWith("iobroker") || n.startsWith("javascript")) && (n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"));
      }).map((i) => i.basename).sort().reverse();
      this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async handleParseWebdavFile(obj) {
    if (!this.config.webdavEnabled) {
      this.sendTo(obj.from, obj.command, { error: "WebDAV not enabled" }, obj.callback);
      return;
    }
    const msg = obj.message;
    const filename = path.basename(msg.filename);
    try {
      const { createClient: createWebdavClient } = await Promise.resolve().then(() => __toESM(require("webdav")));
      const client = createWebdavClient(this.config.webdavUrl, {
        username: this.config.webdavUser,
        password: this.config.webdavPassword
      });
      const remotePath = (this.config.webdavPath ? `${this.config.webdavPath}/` : "/") + filename;
      const buf = Buffer.from(
        await client.getFileContents(remotePath, { signal: AbortSignal.timeout(3e4) })
      );
      const scripts = await this.parseBuffer(buf, filename);
      this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  // ─── Restore to ioBroker ─────────────────────────────────────────────────
  async handleRestoreScript(obj) {
    var _a;
    const msg = obj.message;
    const suffix = (_a = msg.suffix) != null ? _a : "";
    const parts = msg.path.split(".").map((p) => sanitizeId(p));
    parts[parts.length - 1] = parts[parts.length - 1] + suffix;
    const newScriptPath = parts.join(".");
    const newId = `script.js.${newScriptPath}`;
    const newName = msg.name + suffix;
    let existing;
    try {
      existing = await this.getForeignObjectAsync(newId);
    } catch {
      existing = null;
    }
    if (existing && !msg.overwrite) {
      this.sendTo(obj.from, obj.command, { exists: true, id: newId }, obj.callback);
      return;
    }
    const engineTypeMap = {
      TypeScript: "TypeScript/ts",
      Blockly: "Blockly",
      Rules: "Rules",
      JS: "JavaScript/js"
    };
    const engineType = engineTypeMap[msg.type] || "JavaScript/js";
    try {
      await this.ensureScriptFolders(newId);
      await this.setForeignObjectAsync(newId, {
        type: "script",
        common: {
          name: newName,
          engineType,
          engine: "system.adapter.javascript.0",
          source: msg.source || "",
          enabled: false,
          debug: false,
          verbose: false
        },
        native: {}
      });
      this.log.info(`Script restored: ${newId}`);
      this.sendTo(obj.from, obj.command, { success: true, id: newId }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async handleEnableScript(obj) {
    const msg = obj.message;
    try {
      await this.extendForeignObjectAsync(msg.id, { common: { enabled: true } });
      this.log.info(`Script enabled: ${msg.id}`);
      this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
    } catch (e) {
      this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
    }
  }
  async ensureScriptFolders(scriptId) {
    const parts = scriptId.split(".").map((p) => sanitizeId(p));
    for (let i = 2; i < parts.length - 1; i++) {
      const folderId = parts.slice(0, i + 1).join(".");
      try {
        const existing = await this.getForeignObjectAsync(folderId);
        if (!existing) {
          await this.setForeignObjectAsync(folderId, {
            type: "folder",
            common: { name: parts[i] },
            native: {}
          });
        }
      } catch {
      }
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new ScriptRestore(options);
} else {
  (() => new ScriptRestore())();
}
//# sourceMappingURL=main.js.map
