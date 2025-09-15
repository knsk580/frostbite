@echo off
echo ========================================
echo    ベクターストアクリーニングツール
echo ========================================
echo.

REM Node.jsがインストールされているかチェック
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: Node.js がインストールされていません
    echo    Node.js をインストールしてから再度実行してください
    pause
    exit /b 1
)

REM .envファイルの存在確認
if not exist ".env" (
    echo エラー: .envファイルが見つかりません
    echo    プロジェクトルートで実行してください
    pause
    exit /b 1
)

REM JavaScriptスクリプトの存在確認
if not exist "clear-vector-store.js" (
    echo エラー: clear-vector-store.js が見つかりません
    pause
    exit /b 1
)

echo ベクターストアクリーニングスクリプトを実行中...
echo.

REM Node.jsスクリプトを実行
node clear-vector-store.js

echo.
echo 何かキーを押すと終了します...
pause >nul
