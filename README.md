![Logo](admin/script-restore.svg)
# ioBroker.script-restore

[![NPM version](https://img.shields.io/npm/v/iobroker.script-restore.svg)](https://www.npmjs.com/package/iobroker.script-restore)
[![Downloads](https://img.shields.io/npm/dm/iobroker.script-restore.svg)](https://www.npmjs.com/package/iobroker.script-restore)
![Number of Installations](https://iobroker.live/badges/script-restore-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/script-restore-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.script-restore.png?downloads=true)](https://nodei.co/npm/iobroker.script-restore/)

**Tests:** ![Test and Release](https://github.com/ipod86/ioBroker.script-restore/workflows/Test%20and%20Release/badge.svg)

## script-restore adapter for ioBroker

Browse and recover individual scripts from ioBroker backup archives — without restoring the entire backup.

## Description

The script-restore adapter adds a tab to the ioBroker admin interface that lets you open backup archives and browse all contained JavaScript, TypeScript, Blockly and Rules scripts. You can view the source code of each script and download or copy it individually.

The archive is parsed entirely in the browser — no files are written to disk during browsing.

**Note:** This adapter does not automatically restore scripts into ioBroker. It only allows you to view and download them so you can manually re-import them via the JavaScript adapter.

## Features

- Browse backup archives directly from the ioBroker admin tab
- Load local backup files from the backup directory (default: `/opt/iobroker/backups`)
- Upload archive files directly from your computer
- Supported formats: `.tar.gz`, `.tar`, `.json`, `.jsonl`
- Tree view of all scripts organized by folder
- Search across all script names
- View source code (JS/TS/Blockly/Rules)
- Copy source code to clipboard or download as file
- Fully browser-based parsing — no server roundtrip for uploads

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Backup path | Directory where ioBroker backup files are stored | `/opt/iobroker/backups` |

## Usage

### Loading a local backup file

1. Open the **Script Restore** tab in ioBroker admin
2. Click the **Local files** dropdown
3. Select a backup file from the list — scripts are loaded automatically

### Uploading a backup file

1. Open the **Script Restore** tab in ioBroker admin
2. Click **Upload archive** and select a file from your computer
3. The archive is parsed in the browser and all scripts are displayed

### Viewing and downloading scripts

- Click a script in the tree to view its source code
- Use the **Copy** button to copy the source to the clipboard
- Use the **Download** button to save the script as a file

## Supported backup formats

| Format | Description |
|--------|-------------|
| `.tar.gz` | Standard ioBroker backup (`iobroker_YYYY-MM-DD-HH-mm_SS_backupiobroker.tar.gz`) |
| `.tar` | Uncompressed tar archive |
| `.json` | JavaScript adapter script export |
| `.jsonl` | ioBroker objects export (JSON lines) |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.0.5 (2026-04-08)
* (ipod86) add FTP and SMB as optional backup sources with connection test button
* (ipod86) make local backup source optional (enable/disable in settings)
* (ipod86) add SMB version info (SMB2 only) in settings

### 0.0.4 (2026-04-06)
* (ipod86) improve dark theme detection: live switching via MutationObserver and storage events

### 0.0.3 (2026-04-06)
* (ipod86) add dark theme support for admin tab UI

### 0.0.1 (2026-04-06)
* (ipod86) initial release

## License
MIT License

Copyright (c) 2026 ipod86 <david@graef.email>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
