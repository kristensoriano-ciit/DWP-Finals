[CmdletBinding()]
param(
    [switch]$Performance,
    [switch]$ValidateGuardsOnly
)

$ErrorActionPreference = "Stop"
$approvedServer = "(localdb)\DwpFinals"
$approvedDatabase = "DwpFinalsE2E"
$apiUrl = "https://localhost:7047"
$frontendUrl = "http://localhost:4173"
$frontendRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $frontendRoot
$apiRoot = Join-Path $repositoryRoot "dotnet-backend\dotnet-backend"
$apiProject = Join-Path $repositoryRoot "dotnet-backend\dotnet-backend\dotnet-backend.csproj"
$apiDll = Join-Path $repositoryRoot "dotnet-backend\dotnet-backend\bin\Release\net8.0\dotnet-backend.dll"
$provisionerProject = Join-Path $repositoryRoot "dotnet-backend\dotnet-backend.E2E\dotnet-backend.E2E.csproj"
$provisionerDll = Join-Path $repositoryRoot "dotnet-backend\dotnet-backend.E2E\bin\Release\net8.0\dotnet-backend.E2E.dll"
$viteScript = Join-Path $frontendRoot "node_modules\vite\bin\vite.js"
$logDirectory = Join-Path $frontendRoot "test-results\server-logs"
$serverProcesses = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

function Require-EnvironmentValue([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "$Name must be configured."
    }
    return $value
}

function Assert-ResetGuards {
    if ((Require-EnvironmentValue "E2E_ALLOW_DATABASE_RESET") -cne "YES") {
        throw "E2E_ALLOW_DATABASE_RESET must be exactly YES."
    }

    $connectionString = Require-EnvironmentValue "E2E_CONNECTION_STRING"
    try {
        $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder $connectionString
    }
    catch {
        throw "E2E_CONNECTION_STRING is not valid."
    }

    if ($builder.DataSource -cne $approvedServer) {
        throw "Database server must be exactly $approvedServer."
    }
    if ($builder.InitialCatalog -cne $approvedDatabase) {
        throw "Database name must be exactly $approvedDatabase."
    }
}

function Invoke-Checked([string]$FilePath, [string[]]$ArgumentList) {
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

function Invoke-CheckedInDirectory([string]$WorkingDirectory, [string]$FilePath, [string[]]$ArgumentList) {
    Push-Location $WorkingDirectory
    try {
        Invoke-Checked $FilePath $ArgumentList
    }
    finally {
        Pop-Location
    }
}

function Set-ApiEnvironment([bool]$EnableAdminSeed) {
    $env:ASPNETCORE_ENVIRONMENT = "Development"
    $env:ASPNETCORE_URLS = $apiUrl
    $env:ConnectionStrings__DefaultConnection = Require-EnvironmentValue "E2E_CONNECTION_STRING"
    $env:Jwt__Key = Require-EnvironmentValue "E2E_JWT_KEY"
    $env:Jwt__Issuer = "DwpFinals.E2E"
    $env:Jwt__Audience = "DwpFinals.E2E.Client"
    $env:Jwt__AccessTokenMinutes = "60"
    $env:RateLimiting__Login__PermitLimit = "100"
    $env:Cors__AllowedOrigins__0 = $frontendUrl
    $env:AdminSeed__Enabled = $EnableAdminSeed.ToString().ToLowerInvariant()
    if ($EnableAdminSeed) {
        $env:AdminSeed__Email = "e2e-admin@example.com"
        $env:AdminSeed__DisplayName = "E2E Admin"
        $env:AdminSeed__Password = Require-EnvironmentValue "E2E_PASSWORD"
    }
    else {
        Remove-Item Env:AdminSeed__Email -ErrorAction SilentlyContinue
        Remove-Item Env:AdminSeed__DisplayName -ErrorAction SilentlyContinue
        Remove-Item Env:AdminSeed__Password -ErrorAction SilentlyContinue
    }
}

function Reset-EmptyDatabase {
    Assert-ResetGuards
    $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder (Require-EnvironmentValue "E2E_CONNECTION_STRING")
    $builder["Initial Catalog"] = "master"
    $connection = New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
    try {
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandText = "IF DB_ID(N'$approvedDatabase') IS NOT NULL BEGIN ALTER DATABASE [$approvedDatabase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$approvedDatabase]; END"
        [void]$command.ExecuteNonQuery()
    }
    finally {
        $connection.Dispose()
    }

    Set-ApiEnvironment $true
    Invoke-CheckedInDirectory $apiRoot "dotnet" @("tool", "run", "dotnet-ef", "database", "update", "--project", $apiProject, "--configuration", "Release", "--no-build")
}

function Reset-DeterministicDatabase {
    Assert-ResetGuards
    Invoke-Checked "dotnet" @($provisionerDll)
}

function Start-Server([string]$FilePath, [string[]]$ArgumentList, [string]$Name) {
    if (-not (Test-Path -LiteralPath $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory | Out-Null
    }
    $stdout = Join-Path $logDirectory "$Name.stdout.log"
    $stderr = Join-Path $logDirectory "$Name.stderr.log"
    $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $frontendRoot -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $serverProcesses.Add($process)
    return $process
}

function Wait-Ready([string]$Url, [System.Diagnostics.Process]$Process, [int]$TimeoutSeconds = 60) {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($Process.HasExited) {
            throw "Server exited before becoming ready. See ignored server logs."
        }
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $status = & curl.exe --insecure --silent --output NUL --write-out "%{http_code}" $Url 2>$null
        $ErrorActionPreference = $previousErrorActionPreference
        if ($status -match "^\d{3}$" -and [int]$status -lt 500) { return }
        Start-Sleep -Milliseconds 250
    }
    throw "Server readiness timed out for $Url."
}

function Stop-Servers {
    foreach ($process in $serverProcesses) {
        if (-not $process.HasExited) {
            $previousErrorActionPreference = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null
            $ErrorActionPreference = $previousErrorActionPreference
        }
        $process.Dispose()
    }
    $serverProcesses.Clear()
}

function Start-TestServers([bool]$EnableAdminSeed) {
    Set-ApiEnvironment $EnableAdminSeed
    $api = Start-Server "dotnet" @($apiDll) "api"
    $frontend = Start-Server "node" @($viteScript, "preview", "--host", "localhost", "--port", "4173", "--strictPort") "frontend"
    Wait-Ready "$apiUrl/api/games?page=1&pageSize=1" $api
    Wait-Ready $frontendUrl $frontend
}

function Invoke-Playwright([string[]]$Projects) {
    $arguments = [System.Collections.Generic.List[string]]::new()
    $arguments.Add("playwright")
    $arguments.Add("test")
    foreach ($project in $Projects) { $arguments.Add("--project=$project") }
    Invoke-Checked "npx.cmd" $arguments.ToArray()
}

Assert-ResetGuards
if ((Require-EnvironmentValue "E2E_JWT_KEY").Length -lt 32) {
    throw "E2E_JWT_KEY must contain at least 32 characters."
}
[void](Require-EnvironmentValue "E2E_PASSWORD")

if ($ValidateGuardsOnly) {
    Write-Output "E2E reset guards accepted the approved isolated database."
    exit 0
}

try {
    Invoke-CheckedInDirectory $apiRoot "dotnet" @("tool", "restore")
    Invoke-Checked "dotnet" @("build", $apiProject, "--configuration", "Release")
    Invoke-Checked "dotnet" @("build", $provisionerProject, "--configuration", "Release")
    $env:VITE_API_BASE_URL = $apiUrl
    Invoke-Checked "npm.cmd" @("run", "build")

    if (-not $Performance) {
        Reset-EmptyDatabase
        Start-TestServers $true
        Invoke-Playwright @("clean-setup")
        Stop-Servers
    }

    Reset-DeterministicDatabase
    Start-TestServers $false
    if ($Performance) {
        Invoke-Playwright @("performance")
    }
    else {
        Invoke-Playwright @("visitor", "account", "author", "admin-games", "admin-users", "accessibility-public", "accessibility-authenticated")
    }
}
finally {
    Stop-Servers
}
