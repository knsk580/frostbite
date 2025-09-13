# AI チャットアプリケーション

OpenAI Responses APIとVector Storeを使用したシンプルなAIチャットアプリケーションです。

## 機能

- Bootstrap5を使用したモダンでレスポンシブなUI
- OpenAI Responses APIによるAIチャット機能
- Vector Store内のドキュメントを検索して回答
- リアルタイムなチャット体験
- タイピングインジケーター

## セットアップ

### 1. 依存関係のインストール

```powershell
npm install
```

### 2. 環境変数の設定

`env.example` ファイルを `.env` にコピーして、必要な値を設定してください：

```powershell
Copy-Item env.example .env
```

`.env` ファイルを編集して以下の値を設定：

```
OPENAI_API_KEY=your_openai_api_key_here
VECTOR_STORE_ID=your_vector_store_id_here
PORT=3000
```

### 3. サーバーの起動

```powershell
npm start
```

ブラウザで http://localhost:3000 にアクセスしてください。

## ファイル構成

```
frostbite/
├── package.json          # 依存関係とスクリプト
├── server.js             # Express.js サーバー
├── env.example           # 環境変数のサンプル
├── README.md             # このファイル
├── sample.js             # 元のサンプルファイル
└── public/
    ├── index.html        # メインHTMLファイル
    └── script.js         # フロントエンドJavaScript
```

## 技術仕様

- **フロントエンド**: HTML5, CSS3, Bootstrap5, JavaScript (ES6+)
- **バックエンド**: Node.js, Express.js
- **AI API**: OpenAI Responses API
- **検索**: Vector Store (file_search)

## 使用方法

1. アプリケーションを起動後、ブラウザでアクセス
2. チャット入力欄にメッセージを入力
3. AIがVector Store内のドキュメントを検索して回答
4. リアルタイムでチャットを楽しむ

## 注意事項

- OpenAI APIキーが必要です
- Vector Storeが事前に作成され、ファイルがアップロード済みである必要があります
- インターネット接続が必要です（Bootstrap CDN使用）
