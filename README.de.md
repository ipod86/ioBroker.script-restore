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
- Vollständig browserbasiertes Parsen — kein Server-Roundtrip bei Uploads
- Mehrere Skripte mit Strg+Klick auswählen und als ZIP herunterladen
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

## Unterstützte Backup-Formate

| Format | Beschreibung |
|--------|--------------|
| `.tar.gz` | Standard-ioBroker-Backup (`iobroker_YYYY-MM-DD-HH-mm_SS_backupiobroker.tar.gz`) |
| `.tar` | Unkomprimiertes Tar-Archiv |
| `.json` | JavaScript-Adapter Skript-Export |
| `.jsonl` | ioBroker-Objekte-Export (JSON Lines) |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (ipod86) Typ-Filter (JS/TS/Blockly/Rules) in der Skript-Sidebar hinzugefügt
* (ipod86) Direktes Laden in ioBroker mit Suffix-Eingabe und Bestätigungs-Modal hinzugefügt
* (ipod86) Veraltete admin/words.js und .prettierignore entfernt

### 0.0.10 (2026-04-08)
* (ipod86) jsonConfig: responsive Größen lg/xl für backupPath korrigiert (E5509)
* (ipod86) News-Einträge auf 7 begrenzt (W1032)
* (ipod86) Dependabot npm cooldown von 7 Tagen hinzugefügt (W8915)

### 0.0.9 (2026-04-08)
* (ipod86) jsonConfig: responsive Größenattribute ergänzt (E5507)
* (ipod86) i18n-Übersetzungsdateien hinzugefügt (W5022)
* (ipod86) veraltete index_m.html und style.css entfernt (W5047)
* (ipod86) ungültiges copyToField-Attribut entfernt (W5512)

### 0.0.8 (2026-04-08)
* (ipod86) Einstellungs-UI zu jsonConfig (admin 5+) migriert — behebt S5022
* (ipod86) `node:fs` statt `fs` verwendet — behebt S5043
* (ipod86) Dependabot-Zeitplan von monatlich auf wöchentlich geändert — behebt S8906
* (ipod86) Automerge-Workflow in automerge-dependabot.yml umbenannt — behebt S8911

### 0.0.7 (2026-04-08)
* (ipod86) HTTP-URL-Laden ohne Protokoll-Präfix korrigiert (https:// wird automatisch ergänzt)
* (ipod86) localStorage-Speicherung des zuletzt geladenen Backups entfernt

### 0.0.6 (2026-04-08)
* (ipod86) HTTP, SFTP und WebDAV als optionale Backup-Quellen hinzugefügt
* (ipod86) Mehrfachauswahl von Skripten mit Strg+Klick und ZIP-Download
* (ipod86) Zuletzt geladenes Backup im Browser merken (localStorage)
* (ipod86) Lokalen Backup-Pfad vom backitup-Adapter automatisch erkennen

### 0.0.5 (2026-04-08)
* (ipod86) FTP und SMB als optionale Backup-Quellen mit Verbindungstest hinzugefügt
* (ipod86) Lokale Backup-Quelle optional gemacht (in Einstellungen aktivierbar)
* (ipod86) SMB-Versionshinweis (nur SMB2) in den Einstellungen ergänzt

### 0.0.4 (2026-04-06)
* (ipod86) Dunkles-Theme-Erkennung verbessert: Live-Umschaltung via MutationObserver und Storage-Events

### 0.0.3 (2026-04-06)
* (ipod86) Dunkles Theme für Admin-Tab-UI hinzugefügt

### 0.0.1 (2026-04-06)
* (ipod86) Erstveröffentlichung

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
