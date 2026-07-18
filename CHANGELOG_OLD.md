# Older Changelog

### 0.1.3 (2026-05-24)
* (ipod86) fix language flash: skip socket override when language already detected from admin frame
* (ipod86) replace all hardcoded status strings with translated t() calls
* (ipod86) add codeHint translation key in all 11 languages

### 0.1.2 (2026-05-24)
* (ipod86) add full i18n to tab UI: all strings translated into de/en/fr/es/it/nl/pl/pt/ru/uk/zh-cn

### 0.1.1 (2026-05-13)
* (ipod86) allow overwriting existing scripts during restore (confirmation dialog with path display)
* (ipod86) allow empty suffix to restore script under its original name
* (ipod86) prompt to start script immediately after successful restore

### 0.1.0 (2026-05-13)
* (ipod86) drop Node.js 20 support (EOL 2026-04-30), require >= 22
* (ipod86) fix: move @iobroker/types to production dependencies to fix CI integration test
* (ipod86) add .npmrc with legacy-peer-deps to resolve peer dependency conflicts
* (ipod86) update dependencies: webdav, basic-ftp, typescript, @types/node, @iobroker/eslint-config

### 0.0.1 (2026-04-06)
* (ipod86) initial release
## 0.1.6 (2026-06-27)
* (ipod86) fix: upgrade typescript to ^6.0.3 with explicit mocha types for TypeScript 6 compatibility (W0083)

## 0.1.5 (2026-06-06)
* (ipod86) fix: update @alcalzone/release-script to ^5.2.1 (E0036)
* (ipod86) fix: add missing placeholder i18n keys to all 11 language files (W5612)
* (ipod86) fix: migrate i18n to short format, add npm provenance signing (S5601, S2008)
* (ipod86) fix: upgrade to @tsconfig/node22, pin @types/node to ^22 (W0086, W0090, W0066)
* (ipod86) fix: reorganize dependencies — types/eslint/prettier to devDependencies (W5060, W0078, E3031)
* (ipod86) fix: resolve adapter checker warnings W0069, W8917, S6022
* (ipod86) chore: bump ioBroker/testing-action-check from v1 to v2, keep deploy action at v1 (W3017)
* (ipod86) chore: bump typescript-eslint and @types/node

## 0.1.4 (2026-05-24)
* (ipod86) add syntax highlighting for JS/TS, Blockly (XML) and Rules (JSON) — pure JS, no external deps
* (ipod86) fix language detection: read ioBroker system language via adapter (system.config) instead of browser/DOM
* (ipod86) translate all remaining loader texts (reading file/archive, extracting, loading URL)

## 0.1.2 (2026-05-24)
* (ipod86) add full i18n to tab UI: all strings translated into de/en/fr/es/it/nl/pl/pt/ru/uk/zh-cn

## 0.1.1 (2026-05-24)
* (ipod86) allow overwriting existing scripts during restore (confirmation dialog with path display)
* (ipod86) allow empty suffix to restore script under its original name
* (ipod86) prompt to start script immediately after successful restore

## 0.0.12 (2026-04-30)
* (ipod86) add common.singleton to prevent multiple instances
* (ipod86) complete i18n translations for all supported languages (fr, es, it, nl, pl, pt, ru, uk, zh-cn)

## 0.0.11 (2026-04-13)
* (ipod86) add type filter (JS/TS/Blockly/Rules) in script sidebar
* (ipod86) add direct restore into ioBroker with suffix input and confirm modal
* (ipod86) remove obsolete admin/words.js and .prettierignore

## 0.0.10 (2026-04-08)
* (ipod86) fix jsonConfig responsive sizes lg/xl for backupPath (E5509)
* (ipod86) trim news entries to 7 (W1032)
* (ipod86) add Dependabot npm cooldown of 7 days (W8915)

## 0.0.9 (2026-04-08)
* (ipod86) fix jsonConfig: add responsive size attributes (E5507)
* (ipod86) add i18n translation files (W5022)
* (ipod86) remove outdated index_m.html and style.css (W5047)
* (ipod86) remove invalid copyToField attribute (W5512)

## 0.0.8 (2026-04-08)
* (ipod86) migrate settings UI to jsonConfig (admin 5+) — fixes S5022
* (ipod86) fix: use `node:fs` instead of `fs` — fixes S5043
* (ipod86) update Dependabot schedule from monthly to weekly — fixes S8906
* (ipod86) rename automerge workflow to automerge-dependabot.yml — fixes S8911

## 0.0.7 (2026-04-08)
* (ipod86) fix HTTP URL loading without protocol prefix (auto-prepend https://)
* (ipod86) remove localStorage persistence for last loaded backup

## 0.0.6 (2026-04-08)
* (ipod86) add HTTP, SFTP and WebDAV as optional backup sources
* (ipod86) multi-select scripts with Ctrl+click and download as ZIP
* (ipod86) remember last loaded backup in browser (localStorage)
* (ipod86) auto-detect local backup path from backitup adapter

## 0.0.5 (2026-04-08)
* (ipod86) add FTP and SMB as optional backup sources with connection test button
* (ipod86) make local backup source optional (enable/disable in settings)
* (ipod86) add SMB version info (SMB2 only) in settings

## 0.0.4 (2026-04-06)
* (ipod86) improve dark theme detection: live switching via MutationObserver and storage events

## 0.0.3 (2026-04-06)
* (ipod86) add dark theme support for admin tab UI

## 0.0.1 (2026-04-06)
* (ipod86) initial release
