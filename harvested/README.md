# Harvested BLAZE-XMD plugins

The source archive `BLAZE-XMD-main(12).zip` contains **100 legacy plugin modules** under `plugins/`, grouped into Audio-Edit, Conversion, Download, Fun, General, Group, Logo, Mods, Other, Search, Settings, Sticker, and legacy menu folders.

The complete source is preserved under `harvested/plugins/`, with its supporting registration/runtime files under `harvested/devblaze/` and `harvested/legacy-lib/`. A machine-readable command inventory is available at `harvested/blaze-xmd-plugin-manifest.json`.

These modules use the legacy `blazetz({ nomCom, alias, ... }, callback)` registration contract, while Aura-XMD uses `module.exports = { command, run }`. They are therefore preserved and inventoried but are not blindly executed by Aura's stable loader. This prevents one incompatible, obfuscated, hard-coded, or dependency-heavy legacy module from taking down the connected bot.

The behavior most relevant to the current Aura-XMD build has already been implemented natively: group status posting, group moderation, channel posting and schedules, status reactions, view-once/media retrieval, downloads, menu/help, media watermarking, and BLAZE TECH branding. Additional harvested commands can be ported individually after their dependency and permission behavior is reviewed.
