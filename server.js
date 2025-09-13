import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// ES6モジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数を読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAIクライアントを初期化
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// メインページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// チャットAPIエンドポイント
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'メッセージが必要です。' });
        }

        const vectorStoreId = process.env.VECTOR_STORE_ID;

        if (!vectorStoreId) {
            return res.status(500).json({ error: 'Vector Store IDが設定されていません。' });
        }

        // OpenAI Responses APIリクエスト
        const requestPayload = {
            model: "gpt-4o-mini",
            input: [
                { role: "user", content: message },
            ],
            tools: [{
                type: "file_search",
                vector_store_ids: [vectorStoreId]
            }],
            max_output_tokens: 10000
        };

        console.log('OpenAI Request:', JSON.stringify(requestPayload, null, 2));

        const response = await client.responses.create(requestPayload);

        console.log('OpenAI Response:', JSON.stringify(response, null, 2));

        res.json({
            message: response.output_text || 'すみません、回答を生成できませんでした。',
            debug: {
                request: requestPayload,
                response: response
            }
        });

    } catch (error) {
        console.error('OpenAI API Error:', error);

        let errorMessage = 'サーバーエラーが発生しました。';

        if (error.status === 401) {
            errorMessage = 'OpenAI APIキーが無効です。';
        } else if (error.status === 429) {
            errorMessage = 'APIの使用量制限に達しました。しばらく待ってから再試行してください。';
        } else if (error.status === 404) {
            errorMessage = 'Vector Storeが見つかりません。';
        }

        res.status(500).json({ error: errorMessage });
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log('✨ AI チャットアプリケーション準備完了！');

    // 環境変数の確認
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  OPENAI_API_KEYが設定されていません。');
    }
    if (!process.env.VECTOR_STORE_ID) {
        console.warn('⚠️  VECTOR_STORE_IDが設定されていません。');
    }
});

export default app;
