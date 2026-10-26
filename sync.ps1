#requires -Version 5.1
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
& (Join-Path $SCRIPT_DIR "setup.ps1") -Sync
