$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Engine = Join-Path $Root 'local-engine'
Set-Location $Engine

Write-Host '=== Dima AI Studio — LOCAL AI ENGINE ===' -ForegroundColor Cyan
Write-Host 'Це self-hosted режим: без fal.ai, без OpenAI, без Replicate, без платних API.' -ForegroundColor Green

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'Python 3.11/3.12 не знайдено. Встанови Python з python.org і повтори цей файл.'
}

if (-not (Test-Path '.venv')) {
  python -m venv .venv
}
$Py = Join-Path $Engine '.venv\Scripts\python.exe'
& $Py -m pip install --upgrade pip

# PyTorch with CUDA. If your NVIDIA driver uses a different supported CUDA wheel,
# the official PyTorch selector can be used instead.
& $Py -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
& $Py -m pip install -r requirements.txt

if (-not (Test-Path 'Wan2.1')) {
  git clone https://github.com/Wan-Video/Wan2.1.git
}
& $Py -m pip install -r 'Wan2.1\requirements.txt'

if (-not (Test-Path 'Wan2.1-T2V-1.3B')) {
  & $Py -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='Wan-AI/Wan2.1-T2V-1.3B', local_dir='Wan2.1-T2V-1.3B')"
}

Write-Host ''
Write-Host 'ГОТОВО. Локальний AI-двигун встановлено.' -ForegroundColor Green
Write-Host 'Тепер запусти ..\START-DIMA-AI-STUDIO.bat' -ForegroundColor Yellow
