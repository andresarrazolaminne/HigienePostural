# Ejecuta la suite de aislamiento multi-empresa (pytest).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

pip install -r requirements-dev.txt -q
python -m pytest -v @args
exit $LASTEXITCODE
