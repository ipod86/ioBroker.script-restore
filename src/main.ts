/*
 * ioBroker Script Restore Adapter
 * Restore ioBroker scripts from backup archives
 * Copyright (c) 2024 ipod86 <david@graef.email>
 * MIT License
 */

import type { Dirent } from "node:fs";
import * as utils from "@iobroker/adapter-core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as ftp from "basic-ftp";
import { Writable } from "node:stream";
import * as https from "node:https";
import * as http from "node:http";
import SftpClient from "ssh2-sftp-client";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SMB2 = require("@marsaud/smb2");

const execAsync = promisify(exec);

interface ScriptEntry {
	name: string;
	path: string;
	type: string;
	source: string;
}

class ScriptRestore extends utils.Adapter {
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "script-restore",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	private onReady(): void {
		this.log.info(`Script Restore ready. Backup path: ${this.config.backupPath || "/opt/iobroker/backups"}`);
	}

	private onUnload(callback: () => void): void {
		callback();
	}

	private async onMessage(obj: ioBroker.Message): Promise<void> {
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
				case "getSourceConfig":
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
						},
						obj.callback,
					);
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
				default:
					this.sendTo(obj.from, obj.command, { error: "Unknown command" }, obj.callback);
			}
		} catch (e) {
			this.log.error(`Error handling ${obj.command}: ${(e as Error).message}`);
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	// ─── Local ───────────────────────────────────────────────────────────────

	private async handleListLocalFiles(obj: ioBroker.Message): Promise<void> {
		if (this.config.localEnabled === false) {
			this.sendTo(obj.from, obj.command, { error: "Local source not enabled" }, obj.callback);
			return;
		}
		const backupPath = this.config.backupPath || "/opt/iobroker/backups";
		try {
			const rawEntries = await fs.readdir(backupPath, { withFileTypes: true, encoding: "utf8" });
			const entries = rawEntries as unknown as Dirent[];
			const files = entries
				.filter(e => {
					const n = String(e.name);
					return (
						e.isFile() &&
						(n.startsWith("iobroker") || n.startsWith("javascript")) &&
						(n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"))
					);
				})
				.map(e => String(e.name))
				.sort()
				.reverse();
			this.sendTo(obj.from, obj.command, { files, path: backupPath }, obj.callback);
		} catch (e) {
			this.sendTo(
				obj.from,
				obj.command,
				{ error: `Verzeichnis nicht lesbar: ${(e as Error).message}` },
				obj.callback,
			);
		}
	}

	private async handleParseLocalFile(obj: ioBroker.Message): Promise<void> {
		if (this.config.localEnabled === false) {
			this.sendTo(obj.from, obj.command, { error: "Local source not enabled" }, obj.callback);
			return;
		}
		const backupPath = this.config.backupPath || "/opt/iobroker/backups";
		const msg = obj.message as { filename: string };
		const filename = path.basename(msg.filename);
		const filepath = path.join(backupPath, filename);
		try {
			const buf = await fs.readFile(filepath);
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	private async handleParseUploadedFile(obj: ioBroker.Message): Promise<void> {
		const msg = obj.message as { name: string; data: string };
		try {
			const buf = Buffer.from(msg.data, "base64");
			const scripts = await this.parseBuffer(buf, msg.name);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	// ─── Tests ───────────────────────────────────────────────────────────────

	private async handleTestFtp(obj: ioBroker.Message): Promise<void> {
		const client = new ftp.Client();
		client.ftp.verbose = false;
		try {
			await client.access({
				host: this.config.ftpHost,
				port: this.config.ftpPort || 21,
				user: this.config.ftpUser || "anonymous",
				password: this.config.ftpPassword || "",
				secure: this.config.ftpSecure || false,
			});
			const list = await client.list(this.config.ftpPath || "/");
			const count = list.filter(i => i.type === ftp.FileType.File).length;
			this.sendTo(
				obj.from,
				obj.command,
				`✓ Verbunden! ${count} Datei(en) in: ${this.config.ftpPath || "/"}`,
				obj.callback,
			);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			client.close();
		}
	}

	private async handleTestSmb(obj: ioBroker.Message): Promise<void> {
		const smb = new SMB2({
			share: `\\\\${this.config.smbHost}\\${this.config.smbShare}`,
			username: this.config.smbUser || "",
			password: this.config.smbPassword || "",
			domain: this.config.smbDomain || "",
		});
		try {
			const files = await this.smbReaddir(smb, this.config.smbPath || "");
			this.sendTo(
				obj.from,
				obj.command,
				`✓ Verbunden! ${files.length} Einträge in: \\\\${this.config.smbHost}\\${this.config.smbShare}${this.config.smbPath ? `\\${this.config.smbPath}` : ""}`,
				obj.callback,
			);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			smb.disconnect();
		}
	}

	// ─── FTP ─────────────────────────────────────────────────────────────────

	private createFtpClient(): ftp.Client {
		const client = new ftp.Client();
		client.ftp.verbose = false;
		return client;
	}

	private async ftpConnect(client: ftp.Client): Promise<void> {
		await client.access({
			host: this.config.ftpHost,
			port: this.config.ftpPort || 21,
			user: this.config.ftpUser || "anonymous",
			password: this.config.ftpPassword || "",
			secure: this.config.ftpSecure || false,
		});
	}

	private async handleListFtpFiles(obj: ioBroker.Message): Promise<void> {
		if (!this.config.ftpEnabled) {
			this.sendTo(obj.from, obj.command, { error: "FTP not enabled" }, obj.callback);
			return;
		}
		const client = this.createFtpClient();
		try {
			await this.ftpConnect(client);
			const remotePath = this.config.ftpPath || "/";
			const list = await client.list(remotePath);
			const files = list
				.filter(item => {
					const n = item.name;
					return (
						item.type === ftp.FileType.File &&
						(n.startsWith("iobroker") || n.startsWith("javascript")) &&
						(n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"))
					);
				})
				.map(item => item.name)
				.sort()
				.reverse();
			this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			client.close();
		}
	}

	private async handleParseFtpFile(obj: ioBroker.Message): Promise<void> {
		if (!this.config.ftpEnabled) {
			this.sendTo(obj.from, obj.command, { error: "FTP not enabled" }, obj.callback);
			return;
		}
		const msg = obj.message as { filename: string };
		const filename = path.basename(msg.filename);
		const remotePath = path.posix.join(this.config.ftpPath || "/", filename);
		const client = this.createFtpClient();
		try {
			await this.ftpConnect(client);
			const chunks: Buffer[] = [];
			const writable = new Writable({
				write(chunk, _enc, cb) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
					cb();
				},
			});
			await client.downloadTo(writable, remotePath);
			const buf = Buffer.concat(chunks);
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			client.close();
		}
	}

	// ─── SMB ─────────────────────────────────────────────────────────────────

	private createSmbClient(): typeof SMB2 {
		return new SMB2({
			share: `\\\\${this.config.smbHost}\\${this.config.smbShare}`,
			username: this.config.smbUser || "",
			password: this.config.smbPassword || "",
			domain: this.config.smbDomain || "",
		});
	}

	private smbReaddir(smb: typeof SMB2, dirPath: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			smb.readdir(dirPath, (err: Error | null, files: string[]) => {
				if (err) {
					reject(err);
				} else {
					resolve(files);
				}
			});
		});
	}

	private smbReadFile(smb: typeof SMB2, filePath: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			smb.readFile(filePath, (err: Error | null, data: Buffer) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}

	private async handleListSmbFiles(obj: ioBroker.Message): Promise<void> {
		if (!this.config.smbEnabled) {
			this.sendTo(obj.from, obj.command, { error: "SMB not enabled" }, obj.callback);
			return;
		}
		const smb = this.createSmbClient();
		try {
			const smbPath = this.config.smbPath || "";
			const entries = await this.smbReaddir(smb, smbPath);
			const files = entries
				.filter(n => {
					return (
						(n.startsWith("iobroker") || n.startsWith("javascript")) &&
						(n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"))
					);
				})
				.sort()
				.reverse();
			this.sendTo(obj.from, obj.command, { files, path: smbPath }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			smb.disconnect();
		}
	}

	private async handleParseSmbFile(obj: ioBroker.Message): Promise<void> {
		if (!this.config.smbEnabled) {
			this.sendTo(obj.from, obj.command, { error: "SMB not enabled" }, obj.callback);
			return;
		}
		const msg = obj.message as { filename: string };
		const filename = path.basename(msg.filename);
		const smbPath = this.config.smbPath || "";
		const filePath = smbPath ? `${smbPath}\\${filename}` : filename;
		const smb = this.createSmbClient();
		try {
			const buf = await this.smbReadFile(smb, filePath);
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			smb.disconnect();
		}
	}

	// ─── Parsing ─────────────────────────────────────────────────────────────

	private async parseBuffer(buf: Buffer, filename: string): Promise<ScriptEntry[]> {
		const name = filename.toLowerCase();
		if (name.endsWith(".tar.gz") || name.endsWith(".tgz") || name.endsWith(".tar")) {
			return this.parseTarArchive(buf, name.endsWith(".tar") && !name.endsWith(".tar.gz"));
		}
		return this.parseJsonContent(buf.toString("utf8"), filename);
	}

	private async parseTarArchive(buf: Buffer, isPlainTar: boolean): Promise<ScriptEntry[]> {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "script-restore-"));
		const tmpFile = path.join(tmpDir, `archive.tar${isPlainTar ? "" : ".gz"}`);
		try {
			await fs.writeFile(tmpFile, buf);

			const extractFlag = isPlainTar ? "-xf" : "-xzf";
			try {
				await execAsync(
					`tar ${extractFlag} "${tmpFile}" -C "${tmpDir}" --wildcards` +
						` "*/objects.jsonl" "*/objects.json" "*/scripts.json" "*/script.json"` +
						` 2>/dev/null`,
				);
			} catch {
				await execAsync(`tar ${extractFlag} "${tmpFile}" -C "${tmpDir}" 2>/dev/null`).catch(() => {});
			}

			const targets = ["objects.jsonl", "objects.json", "scripts.json", "script.json"];
			const found = await this.findFile(tmpDir, targets);
			if (!found) {
				throw new Error(
					"Keine passende Datei im Archiv gefunden (objects.json, objects.jsonl, scripts.json, script.json)",
				);
			}

			const content = await fs.readFile(found, "utf8");
			return this.parseJsonContent(content, path.basename(found));
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
		}
	}

	private async findFile(dir: string, names: string[]): Promise<string | null> {
		const walk = async (d: string): Promise<string | null> => {
			let entries: Dirent[];
			try {
				entries = (await fs.readdir(d, { withFileTypes: true, encoding: "utf8" })) as unknown as Dirent[];
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

	private parseJsonContent(content: string, filename: string): ScriptEntry[] {
		const scripts: ScriptEntry[] = [];
		const trimmed = content.trimStart();

		const isJsonl =
			filename.endsWith(".jsonl") ||
			(trimmed.startsWith("{") && !trimmed.startsWith('{\n  "') && trimmed.includes("\n{"));

		if (isJsonl) {
			for (const line of content.split("\n")) {
				const l = line.trim();
				if (!l) {
					continue;
				}
				try {
					const item = JSON.parse(l) as Record<string, unknown>;
					this.processItem(
						(item._id || item.id) as string,
						(item.value || item.doc || item) as Record<string, unknown>,
						scripts,
					);
				} catch {
					// skip invalid lines
				}
			}
		} else {
			const data = JSON.parse(content) as Record<string, unknown>;
			for (const [k, v] of Object.entries(data)) {
				this.processItem(k, v as Record<string, unknown>, scripts);
			}
		}

		return scripts.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	}

	private processItem(key: string, val: unknown, scripts: ScriptEntry[]): void {
		if (!key || typeof val !== "object" || val === null) {
			return;
		}
		const v = val as Record<string, unknown>;

		if (["channel", "device", "folder", "meta"].includes(v.type as string)) {
			return;
		}
		if (v.type !== "script" && !key.startsWith("script.js.")) {
			return;
		}

		const c = v.common as Record<string, unknown> | undefined;
		if (!c || (c.engineType === undefined && c.source === undefined)) {
			return;
		}

		const rawEngineType = typeof c.engineType === "string" ? c.engineType : "JS";
		const engineType = rawEngineType.toLowerCase();
		let stype: string;
		if (engineType.includes("ts") || engineType.includes("typescript")) {
			stype = "TypeScript";
		} else if (engineType.includes("blockly")) {
			stype = "Blockly";
		} else if (engineType.includes("rules")) {
			stype = "Rules";
		} else {
			stype = "JS";
		}

		let name: string;
		const nameObj = c.name;
		if (typeof nameObj === "object" && nameObj !== null) {
			const n = nameObj as Record<string, string>;
			name = n.de || n.en || Object.values(n)[0] || key.split(".").pop() || key;
		} else {
			name = typeof nameObj === "string" && nameObj ? nameObj : (key.split(".").pop() ?? key);
		}

		const scriptPath = key.startsWith("script.js.") ? key.slice(10) : key;

		scripts.push({
			name,
			path: scriptPath,
			type: stype,
			source: typeof c.source === "string" ? c.source : "",
		});
	}

	// ─── Suggest backup path ─────────────────────────────────────────────────

	private async handleSuggestBackupPath(obj: ioBroker.Message): Promise<void> {
		const candidates = ["/opt/iobroker/backups", "/root/backups"];
		// Check if backupPC or iobroker-backup adapter is configured
		try {
			const backupObj = (await this.getForeignObjectAsync("system.adapter.backitup.0")) as ioBroker.Object | null;
			if (backupObj?.native?.defaultFolder) {
				candidates.unshift(backupObj.native.defaultFolder as string);
			}
		} catch {
			// adapter not installed
		}
		for (const p of candidates) {
			try {
				await fs.access(p);
				this.sendTo(obj.from, obj.command, p, obj.callback);
				return;
			} catch {
				// not accessible
			}
		}
		this.sendTo(obj.from, obj.command, "", obj.callback);
	}

	// ─── HTTP ────────────────────────────────────────────────────────────────

	private downloadUrl(urlRaw: string): Promise<Buffer> {
		const url = urlRaw.startsWith("http://") || urlRaw.startsWith("https://") ? urlRaw : `https://${urlRaw}`;
		return new Promise((resolve, reject) => {
			const mod = url.startsWith("https") ? https : http;
			mod.get(url, res => {
				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}`));
					return;
				}
				const chunks: Buffer[] = [];
				res.on("data", (c: Buffer) => chunks.push(c));
				res.on("end", () => resolve(Buffer.concat(chunks)));
				res.on("error", reject);
			}).on("error", reject);
		});
	}

	private async handleParseHttpUrl(obj: ioBroker.Message): Promise<void> {
		if (!this.config.httpEnabled) {
			this.sendTo(obj.from, obj.command, { error: "HTTP not enabled" }, obj.callback);
			return;
		}
		const msg = obj.message as { url: string };
		const filename = msg.url.split("/").pop() || "backup";
		try {
			const buf = await this.downloadUrl(msg.url);
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	// ─── SFTP ────────────────────────────────────────────────────────────────

	private async handleTestSftp(obj: ioBroker.Message): Promise<void> {
		const sftp = new SftpClient();
		try {
			await sftp.connect({
				host: this.config.sftpHost,
				port: this.config.sftpPort || 22,
				username: this.config.sftpUser,
				password: this.config.sftpPassword,
			});
			const list = await sftp.list(this.config.sftpPath || "/");
			const count = list.filter(i => i.type === "-").length;
			this.sendTo(
				obj.from,
				obj.command,
				`✓ Verbunden! ${count} Datei(en) in: ${this.config.sftpPath || "/"}`,
				obj.callback,
			);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			await sftp.end();
		}
	}

	private async handleListSftpFiles(obj: ioBroker.Message): Promise<void> {
		if (!this.config.sftpEnabled) {
			this.sendTo(obj.from, obj.command, { error: "SFTP not enabled" }, obj.callback);
			return;
		}
		const sftp = new SftpClient();
		try {
			await sftp.connect({
				host: this.config.sftpHost,
				port: this.config.sftpPort || 22,
				username: this.config.sftpUser,
				password: this.config.sftpPassword,
			});
			const remotePath = this.config.sftpPath || "/";
			const list = await sftp.list(remotePath);
			const files = list
				.filter(i => {
					const n = i.name;
					return (
						i.type === "-" &&
						(n.startsWith("iobroker") || n.startsWith("javascript")) &&
						(n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"))
					);
				})
				.map(i => i.name)
				.sort()
				.reverse();
			this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			await sftp.end();
		}
	}

	private async handleParseSftpFile(obj: ioBroker.Message): Promise<void> {
		if (!this.config.sftpEnabled) {
			this.sendTo(obj.from, obj.command, { error: "SFTP not enabled" }, obj.callback);
			return;
		}
		const msg = obj.message as { filename: string };
		const filename = path.basename(msg.filename);
		const remotePath = path.posix.join(this.config.sftpPath || "/", filename);
		const sftp = new SftpClient();
		try {
			await sftp.connect({
				host: this.config.sftpHost,
				port: this.config.sftpPort || 22,
				username: this.config.sftpUser,
				password: this.config.sftpPassword,
			});
			const buf = (await sftp.get(remotePath)) as Buffer;
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		} finally {
			await sftp.end();
		}
	}

	// ─── WebDAV ──────────────────────────────────────────────────────────────

	private async handleTestWebdav(obj: ioBroker.Message): Promise<void> {
		try {
			const { createClient: createWebdavClient } = await import("webdav");
			const client = createWebdavClient(this.config.webdavUrl, {
				username: this.config.webdavUser,
				password: this.config.webdavPassword,
			});
			const list = await client.getDirectoryContents(this.config.webdavPath || "/");
			const arr = Array.isArray(list) ? list : (list as { data: unknown[] }).data;
			this.sendTo(
				obj.from,
				obj.command,
				`✓ Verbunden! ${arr.length} Einträge in: ${this.config.webdavPath || "/"}`,
				obj.callback,
			);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	private async handleListWebdavFiles(obj: ioBroker.Message): Promise<void> {
		if (!this.config.webdavEnabled) {
			this.sendTo(obj.from, obj.command, { error: "WebDAV not enabled" }, obj.callback);
			return;
		}
		try {
			const { createClient: createWebdavClient } = await import("webdav");
			const client = createWebdavClient(this.config.webdavUrl, {
				username: this.config.webdavUser,
				password: this.config.webdavPassword,
			});
			const remotePath = this.config.webdavPath || "/";
			const list = await client.getDirectoryContents(remotePath);
			const arr = Array.isArray(list) ? list : (list as { data: { basename: string; type: string }[] }).data;
			const files = arr
				.filter((i: { basename: string; type: string }) => {
					const n = i.basename;
					return (
						i.type === "file" &&
						(n.startsWith("iobroker") || n.startsWith("javascript")) &&
						(n.endsWith(".tar.gz") || n.endsWith(".tar") || n.endsWith(".json") || n.endsWith(".jsonl"))
					);
				})
				.map((i: { basename: string }) => i.basename)
				.sort()
				.reverse();
			this.sendTo(obj.from, obj.command, { files, path: remotePath }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	private async handleParseWebdavFile(obj: ioBroker.Message): Promise<void> {
		if (!this.config.webdavEnabled) {
			this.sendTo(obj.from, obj.command, { error: "WebDAV not enabled" }, obj.callback);
			return;
		}
		const msg = obj.message as { filename: string };
		const filename = path.basename(msg.filename);
		try {
			const { createClient: createWebdavClient } = await import("webdav");
			const client = createWebdavClient(this.config.webdavUrl, {
				username: this.config.webdavUser,
				password: this.config.webdavPassword,
			});
			const remotePath = (this.config.webdavPath ? `${this.config.webdavPath}/` : "/") + filename;
			const buf = Buffer.from((await client.getFileContents(remotePath)) as ArrayBuffer);
			const scripts = await this.parseBuffer(buf, filename);
			this.sendTo(obj.from, obj.command, { scripts }, obj.callback);
		} catch (e) {
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new ScriptRestore(options);
} else {
	(() => new ScriptRestore())();
}
