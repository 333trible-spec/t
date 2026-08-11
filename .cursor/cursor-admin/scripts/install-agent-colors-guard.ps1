# DEPRECATED / DISABLED — do NOT rewrite Desktop or Start Menu shortcuts.
# User rule (2026-07-28): never point Cursor.lnk away from Cursor.exe.
# Colors: reapply-agent-chat-colors.ps1 + sessionStart hook only.
$ErrorActionPreference = 'Stop'

Write-Host 'REFUSED: install-agent-colors-guard.ps1 is disabled.'
Write-Host 'It used to rewire Cursor.lnk -> start-cursor.cmd; that broke launches after reinstall.'
Write-Host 'Use only: reapply-agent-chat-colors.ps1 (patches workbench.html, leaves shortcuts alone).'
Write-Host 'Emergency restore to Cursor.exe: restore-cursor-shortcuts.ps1 (only if a shortcut is already broken).'
exit 1
