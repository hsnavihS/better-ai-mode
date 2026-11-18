param(
  [Parameter(Mandatory = $true)][string]$ExtensionId,
  [string]$InstallPath = $PSScriptRoot
)
$resolved = (Resolve-Path -LiteralPath $InstallPath).Path
$hostName = 'com.better_ai_mode.auth'
$manifestPath = Join-Path $resolved 'native-host-manifest.json'
$commandPath = Join-Path $resolved 'host.cmd'
if ($ExtensionId -notmatch '^[a-p]{32}$') { throw 'ExtensionId must be the 32-character Chrome extension ID.' }
if (-not (Test-Path -LiteralPath $commandPath)) { throw "Missing host launcher: $commandPath" }
$manifest = @{ name = $hostName; description = 'Better AI Mode local ChatGPT sign-in companion'; path = $commandPath; type = 'stdio'; allowed_origins = @("chrome-extension://$ExtensionId/") } | ConvertTo-Json
[System.IO.File]::WriteAllText($manifestPath, $manifest, (New-Object System.Text.UTF8Encoding($false)))
$registryPath = "HKCU:\SOFTWARE\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Path $registryPath -Force | Out-Null
Set-ItemProperty -Path $registryPath -Name '(Default)' -Value $manifestPath
Write-Host "Registered $hostName for chrome-extension://$ExtensionId/"
