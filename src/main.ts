/*
 * ioBroker Script Restore Adapter
 * Restore ioBroker scripts from backup archives
 * Copyright (c) 2024 ipod86 <david@graef.email>
 * MIT License
 */

import type { Dirent } from "fs";
import * as utils from "@iobroker/adapter-core";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ScriptEntry {
	name: string;
	path: string;
	type: string;
	source: string;
}

interface AdapterConfig {
	backupPath: string;
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
		const cfg = this.config as unknown as AdapterConfig;
		this.log.info(`Script Restore ready. Backup path: ${cfg.backupPath || "/opt/iobroker/backups"}`);
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
				default:
					this.sendTo(obj.from, obj.command, { error: "Unknown command" }, obj.callback);
			}
		} catch (e) {
			this.log.error(`Error handling ${obj.command}: ${(e as Error).message}`);
			this.sendTo(obj.from, obj.command, { error: (e as Error).message }, obj.callback);
		}
	}

	private async handleListLocalFiles(obj: ioBroker.Message): Promise<void> {
		const cfg = this.config as unknown as AdapterConfig;
		const backupPath = cfg.backupPath || "/opt/iobroker/backups";
		try {
			const rawEntries = await fs.readdir(backupPath, { withFileTypes: true, encoding: "utf8" });
			const entries = rawEntries as unknown as Dirent[];
			const files = entries
				.filter(
					e =>
						e.isFile() &&
						(String(e.name).endsWith(".tar.gz") ||
							String(e.name).endsWith(".tar") ||
							String(e.name).endsWith(".json") ||
							String(e.name).endsWith(".jsonl")),
				)
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
		const cfg = this.config as unknown as AdapterConfig;
		const backupPath = cfg.backupPath || "/opt/iobroker/backups";
		const msg = obj.message as { filename: string };
		// Security: only allow simple filenames, no path traversal
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
			// Extract only matching files to avoid extracting entire large archives
			try {
				await execAsync(
					`tar ${extractFlag} "${tmpFile}" -C "${tmpDir}" --wildcards` +
						` "*/objects.jsonl" "*/objects.json" "*/scripts.json" "*/script.json"` +
						` 2>/dev/null`,
				);
			} catch {
				// Try without wildcards filter (some tar versions behave differently)
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
				entries = (await fs.readdir(d, {
					withFileTypes: true,
					encoding: "utf8",
				})) as unknown as Dirent[];
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

		// Detect JSONL format: file ends with .jsonl or starts with single JSON object per line
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
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new ScriptRestore(options);
} else {
	(() => new ScriptRestore())();
}
