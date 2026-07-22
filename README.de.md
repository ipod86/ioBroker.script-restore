![Logo](admin/script-restore.svg)

# ioBroker.script-restore

[![NPM version](https://img.shields.io/npm/v/iobroker.script-restore.svg)](https://www.npmjs.com/package/iobroker.script-restore)
[![Downloads](https://img.shields.io/npm/dm/iobroker.script-restore.svg)](https://www.npmjs.com/package/iobroker.script-restore)
![Number of Installations](https://iobroker.live/badges/script-restore-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/script-restore-stable.svg)
[![NPM](https://nodei.co/npm/iobroker.script-restore.png?downloads=true)](https://nodei.co/npm/iobroker.script-restore/)

**Tests:** ![Test and Release](https://github.com/ipod86/ioBroker.script-restore/workflows/Test%20and%20Release/badge.svg)

## script-restore Adapter für ioBroker

Einzelne Skripte aus ioBroker-Backup-Archiven durchsuchen und wiederherstellen — ohne das gesamte Backup einspielen zu müssen.

## Beschreibung

Der script-restore Adapter fügt dem ioBroker-Admin-Interface einen Tab hinzu, über den Backup-Archive geöffnet und alle enthaltenen JavaScript-, TypeScript-, Blockly- und Rules-Skripte durchsucht werden können. Der Quellcode jedes Skripts kann einzeln angezeigt, heruntergeladen oder kopiert werden.

Das Archiv wird vollständig im Browser geparst — beim Durchsuchen werden keine Dateien auf die Festplatte geschrieben.

## Funktionen

- Backup-Archive direkt im ioBroker-Admin-Tab durchsuchen
- Lokale Backup-Dateien aus dem Backup-Verzeichnis laden (Standard: `/opt/iobroker/backups`)
- Archivdateien direkt vom Computer hochladen
- Unterstützte Formate: `.tar.gz`, `.tar`, `.json`, `.jsonl`
- Baumansicht aller Skripte nach Ordner sortiert
- Skripte nach Typ filtern: JS, TypeScript, Blockly, Rules
- Volltextsuche über Skriptnamen, Pfade und Quellcode
- Quellcode anzeigen (JS/TS/Blockly/Rules)
- Quellcode in die Zwischenablage kopieren oder als Datei herunterladen
- **Mehrere Skripte auswählen** per ☐-Checkbox und als ZIP-Archiv herunterladen
- **ZIP-Archive importieren** — aus dem script-restore-Export oder aus dem internen Backup des JS-Adapters (`2026-07-17-scripts.zip`)
- Vollständig browserbasiertes Parsen — kein Server-Roundtrip bei Uploads
- Optionale Quellen: Lokal, FTP, SMB, HTTP, SFTP, WebDAV
- **Skripte direkt in ioBroker laden** mit konfigurierbarem Suffix (Standard: `_rcvr`) — bestehende Skripte werden nie überschrieben

## Konfiguration

| Einstellung | Beschreibung | Standard |
|-------------|--------------|----------|
| Backup-Pfad | Verzeichnis mit ioBroker-Backup-Dateien | `/opt/iobroker/backups` |

## Verwendung

### Lokale Backup-Datei laden

1. Den Tab **Script Restore** im ioBroker-Admin öffnen
2. Auf das Dropdown **Lokale Dateien** klicken
3. Eine Backup-Datei aus der Liste auswählen — die Skripte werden automatisch geladen

### Backup-Datei hochladen

1. Den Tab **Script Restore** im ioBroker-Admin öffnen
2. Auf **Archiv hochladen** klicken und eine Datei vom Computer auswählen
3. Das Archiv wird im Browser geparst und alle Skripte werden angezeigt

### Skripte ansehen und herunterladen

- Ein Skript im Baum anklicken, um den Quellcode anzuzeigen
- **Kopieren**-Schaltfläche nutzen, um den Quellcode in die Zwischenablage zu kopieren
- **Herunterladen**-Schaltfläche nutzen, um das Skript als Datei zu speichern
- ☐ links neben einem Skript anklicken, um es zu markieren — mehrere Skripte markieren und auf **ZIP** klicken, um alle auf einmal herunterzuladen

## Unterstützte Backup-Formate

| Format | Beschreibung |
|--------|--------------|
| `.tar.gz` | Standard-ioBroker-Backup (`iobroker_YYYY-MM-DD-HH-mm_SS_backupiobroker.tar.gz`) |
| `.tar` | Unkomprimiertes Tar-Archiv |
| `.json` | JavaScript-Adapter Skript-Export |
| `.jsonl` | ioBroker-Objekte-Export (JSON Lines) |
| `.zip` (scripts.zip) | script-restore ZIP-Export (enthält `.js`/`.ts`-Dateien) |
| `.zip` (JS-Adapter-Backup) | Internes Backup des JS-Adapters (`JJJJ-MM-TT-scripts.zip`, enthält `.json`-Dateien mit Skript-Metadaten) |

## Changelog

### 0.1.13 (2026-07-22)
* (winnyschuster) fix: Ordner-Einrückung im Skriptbaum für tief verschachtelte Ordner korrigiert
* (ipod86) chore: Entwicklungsabhängigkeiten aktualisiert (@types/tar, @iobroker/testing, @types/node)

### 0.1.12 (2026-07-18)
* (ipod86) fix: 30s Timeout für alle WebDAV-Operationen hinzugefügt
* (ipod86) fix: redundante Variable in handleListLocalFiles entfernt

### 0.1.11 (2026-07-18)
* (ipod86) fix: @types/tar in devDependencies verschoben (W0050, W5060)

### 0.1.10 (2026-07-18)
* (ipod86) fix: Shell-tar-Befehl durch reine Node.js-tar-Bibliothek ersetzt (Windows-Kompatibilität)
* (ipod86) feat: Schaltfläche zum Testen des lokalen Backup-Pfads mit Ergebnis-Feedback
* (ipod86) feat: Schaltfläche für Backup-Pfad-Vorschlag
* (ipod86) fix: jsonConfig sendTo Ergebnisformat-Validierung

### 0.1.9 (2026-07-17)
* (ipod86) feat: Checkbox-Mehrfachauswahl für ZIP-Export — ☐ anklicken zum Markieren, Skript-Klick zeigt nur an
* (ipod86) feat: Import von scripts.zip (unser Adapter-Export) und JS-Adapter-Backup-ZIP (2026-07-17-scripts.zip)
* (ipod86) fix: Spaltenausrichtung der Skriptliste (Checkbox, Symbol, Name) mit Flex-Layout

### 0.1.8 (2026-07-15)
* (ipod86) fix: Objekt-IDs aus Backup-Pfaden bereinigt (ungültige ioBroker-State-IDs verhindern)
* (ipod86) fix: 30s Timeout für HTTP-URL-Download
* (ipod86) fix: JSZip lokal im Admin-Tab eingebunden — keine CDN-Abhängigkeit
* (ipod86) fix: ZIP-Export in allen Browsern repariert (Script-Tag-Laden, DOM-Append vor Click)
* (ipod86) fix: postinstall-Script aus package.json entfernt (E0093)

Ältere Changelogs sind in [CHANGELOG_OLD.md](CHANGELOG_OLD.md) verfügbar.

## Lizenz

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
