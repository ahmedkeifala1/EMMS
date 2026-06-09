# BSL EMMS — Database Setup Script
# Run this script as Administrator in PowerShell
# Right-click PowerShell -> "Run as Administrator", then:
#   cd "d:\Projects\Official\EMMS\emms-app"
#   .\setup-db.ps1

$ErrorActionPreference = "Stop"

$PG_BIN   = "C:\Program Files\PostgreSQL\18\bin"
$PG_DATA  = "C:\Program Files\PostgreSQL\18\data"
$PG_HBA   = "$PG_DATA\pg_hba.conf"
$PG_BAK   = "$PG_DATA\pg_hba.conf.bak"
$SERVICE  = "postgresql-x64-18"

# ── Credentials to create ─────────────────────────────────────────────────────
$DB_USER  = "bsl_emms_user"
$DB_PASS  = "BslEmms2026!"
$DB_NAME  = "bsl_emms"

Write-Host "`n=== BSL EMMS Database Setup ===" -ForegroundColor Cyan

# 1. Backup pg_hba.conf and set trust auth
Write-Host "`n[1/5] Patching pg_hba.conf to trust (temporary)..." -ForegroundColor Yellow
Copy-Item $PG_HBA $PG_BAK -Force
$hba = [System.IO.File]::ReadAllText($PG_HBA)
$patched = $hba -replace "scram-sha-256", "trust"
[System.IO.File]::WriteAllText($PG_HBA, $patched)

# 2. Reload PostgreSQL to pick up trust auth
Write-Host "[2/5] Reloading PostgreSQL service..." -ForegroundColor Yellow
Restart-Service $SERVICE -Force
Start-Sleep -Seconds 4
Write-Host "      Service status: $((Get-Service $SERVICE).Status)"

# 3. Create role and database
Write-Host "[3/5] Creating database user and database..." -ForegroundColor Yellow
$env:PGPASSWORD = ""
$psql = "$PG_BIN\psql.exe"

$sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
    RAISE NOTICE 'Created role $DB_USER';
  ELSE
    ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
    RAISE NOTICE 'Updated password for $DB_USER';
  END IF;
END
`$`$;

SELECT 'DROP DATABASE IF EXISTS $DB_NAME' WHERE EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') \gexec
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
"@

$sql | & $psql -U postgres -h localhost -p 5432
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not connect or execute SQL." -ForegroundColor Red
    # Restore before exiting
    Copy-Item $PG_BAK $PG_HBA -Force
    Restart-Service $SERVICE -Force
    exit 1
}

# 4. Restore original pg_hba.conf
Write-Host "[4/5] Restoring original pg_hba.conf..." -ForegroundColor Yellow
Copy-Item $PG_BAK $PG_HBA -Force
Restart-Service $SERVICE -Force
Start-Sleep -Seconds 4
Write-Host "      Service status: $((Get-Service $SERVICE).Status)"

# 5. Test connection with new credentials
Write-Host "[5/5] Testing connection with new credentials..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASS
$test = & $psql -U $DB_USER -h localhost -p 5432 -d $DB_NAME -c "SELECT 'Connection OK' AS status;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Database setup complete!" -ForegroundColor Green
    Write-Host "   User:     $DB_USER" -ForegroundColor Green
    Write-Host "   Password: $DB_PASS" -ForegroundColor Green
    Write-Host "   Database: $DB_NAME" -ForegroundColor Green
    Write-Host "   Port:     5432`n" -ForegroundColor Green
} else {
    Write-Host "`n⚠  Setup ran but test connection failed. Check credentials manually." -ForegroundColor Yellow
    Write-Host $test
}

Write-Host "DATABASE_URL for .env:"
Write-Host "postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}`n" -ForegroundColor Cyan
