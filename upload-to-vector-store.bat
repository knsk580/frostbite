@echo off
echo ========================================
echo      ファイルアップロードツール
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
if not exist "upload-to-vector-store.js" (
    echo エラー: upload-to-vector-store.js が見つかりません
    pause
    exit /b 1
)

REM upload_filesフォルダの存在確認
if not exist "upload_files" (
    echo エラー: upload_filesフォルダが見つかりません
    echo    upload_filesフォルダを作成してファイルを配置してください
    pause
    exit /b 1
)

echo ファイルアップロードスクリプトを実行中...
echo.

REM Node.jsスクリプトを実行
node upload-to-vector-store.js

echo.
echo 何かキーを押すと終了します...
pause >nul
