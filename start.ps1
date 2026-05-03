# 超市货物管理系统一键启动脚本
# 同时启动前端和后端服务

param(
    [switch]$Stop,    # 停止服务
    [switch]$Restart  # 重启服务
)

$ErrorActionPreference = "Stop"

# 颜色定义
function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

# 获取项目路径
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

Write-Color "🛒 超市货物管理系统" "Cyan"
Write-Color "==================" "Cyan"

# 停止服务的函数
function Stop-Services {
    Write-Color "`n🛑 正在停止服务..." "Yellow"

    # 通过端口查找并停止后端服务 (3001)
    $backendConnections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($backendConnections) {
        $backendConnections | ForEach-Object {
            $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and ($process.Name -eq "node" -or $process.Name -eq "Node")) {
                Stop-Process -Id $process.Id -Force
                Write-Color "  ✓ 已停止后端服务 (PID: $($process.Id))" "Green"
            }
        }
    } else {
        Write-Color "  - 后端服务未运行" "Gray"
    }

    # 通过端口查找并停止前端服务 (3000)
    $frontendConnections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($frontendConnections) {
        $frontendConnections | ForEach-Object {
            $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and ($process.Name -eq "node" -or $process.Name -eq "Node")) {
                Stop-Process -Id $process.Id -Force
                Write-Color "  ✓ 已停止前端服务 (PID: $($process.Id))" "Green"
            }
        }
    } else {
        Write-Color "  - 前端服务未运行" "Gray"
    }

    # 等待端口释放
    Start-Sleep -Seconds 2
    Write-Color "`n✅ 所有服务已停止" "Green"
}

# 如果指定了 -Stop 参数，只停止服务
if ($Stop) {
    Stop-Services
    exit 0
}

# 如果指定了 -Restart 参数，先停止再启动
if ($Restart) {
    Stop-Services
    Write-Color "`n🔄 准备重新启动..." "Yellow"
    Start-Sleep -Seconds 2
}

# 检查是否有服务已经在运行
$existingBackend = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$existingFrontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($existingBackend -or $existingFrontend) {
    Write-Color "`n⚠️  检测到服务已在运行" "Yellow"
    if ($existingBackend) { Write-Color "  - 后端服务 (端口 3001)" "Yellow" }
    if ($existingFrontend) { Write-Color "  - 前端服务 (端口 3000)" "Yellow" }
    
    $response = Read-Host "`n是否先停止现有服务再启动? (Y/n)"
    if ($response -ne 'n' -and $response -ne 'N') {
        Stop-Services
    } else {
        Write-Color "`n❌ 取消启动" "Red"
        exit 1
    }
}

Write-Color "`n🚀 正在启动服务..." "Cyan"

# 启动后端服务
Write-Color "`n📦 启动后端服务 (Node.js + Express)..." "Yellow"
Write-Color "  路径: $BackendPath" "Gray"

$backendJob = Start-Job -ScriptBlock {
    param($Path)
    Set-Location $Path
    & "node" "server.js"
} -ArgumentList $BackendPath

# 等待后端启动
Write-Color "  等待后端服务启动..." "Gray"
$backendStarted = $false
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/products" -Method GET -TimeoutSec 2
        $backendStarted = $true
        break
    } catch {
        Write-Color "    尝试 $i/10..." "DarkGray"
    }
}

if ($backendStarted) {
    Write-Color "  ✓ 后端服务启动成功 (http://localhost:3001)" "Green"
} else {
    Write-Color "  ✗ 后端服务启动失败，请检查日志" "Red"
    Receive-Job -Job $backendJob
    Remove-Job -Job $backendJob
    exit 1
}

# 启动前端服务
Write-Color "`n🌐 启动前端服务 (React)..." "Yellow"
Write-Color "  路径: $FrontendPath" "Gray"

# 使用 Start-Process 启动前端，这样不会阻塞
# 使用 cmd.exe /c 来执行 npm，避免 Windows 用记事本打开 npm.cmd
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start" -WorkingDirectory $FrontendPath -WindowStyle Hidden -PassThru

# 等待前端启动
Write-Color "  等待前端服务启动..." "Gray"
$frontendStarted = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $frontendStarted = $true
            break
        }
    } catch {
        if ($i % 5 -eq 0) {
            Write-Color "    尝试 $i/30..." "DarkGray"
        }
    }
}

if ($frontendStarted) {
    Write-Color "  ✓ 前端服务启动成功 (http://localhost:3000)" "Green"
} else {
    Write-Color "  ⚠️ 前端服务可能仍在启动中..." "Yellow"
}

# 显示服务状态
Write-Color "`n==================" "Cyan"
Write-Color "✅ 服务启动完成!" "Green"
Write-Color "==================" "Cyan"
Write-Color "`n访问地址:" "White"
Write-Color "  前端界面: http://localhost:3000" "Cyan"
Write-Color "  后端API:  http://localhost:3001" "Cyan"
Write-Color "`n常用命令:" "White"
Write-Color "  停止服务: .\start.ps1 -Stop" "Gray"
Write-Color "  重启服务: .\start.ps1 -Restart" "Gray"
Write-Color "`n按 Ctrl+C 停止服务`n" "Yellow"

# 等待用户按 Ctrl+C
try {
    while ($true) {
        # 检查后端服务是否仍在运行
        $backendRunning = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Running" }
        if (-not $backendRunning) {
            Write-Color "`n⚠️  后端服务已停止" "Yellow"
            break
        }
        
        # 检查前端服务是否仍在运行
        $frontendRunning = Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
        if (-not $frontendRunning) {
            Write-Color "`n⚠️  前端服务已停止" "Yellow"
            break
        }
        
        Start-Sleep -Seconds 2
    }
} finally {
    # 清理：停止所有服务（通过端口查找，避免Get-Process -Name "node"）
    Write-Color "`n🛑 正在停止服务..." "Yellow"

    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue

    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue

    # 通过端口确保所有服务进程都被停止（安全方式，不会kill所有node进程）
    $ports = @(3000, 3001)
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        $connections | ForEach-Object {
            $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and ($process.Name -eq "node" -or $process.Name -eq "Node")) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }

    Write-Color "✅ 服务已停止" "Green"
}
