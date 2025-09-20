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
        const { message, previousResponseId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'メッセージが必要です。' });
        }

        const vectorStoreId = process.env.VECTOR_STORE_ID;

        if (!vectorStoreId) {
            return res.status(500).json({ error: 'Vector Store IDが設定されていません。' });
        }

        // file_searchツールの設定
        const fileSearchTool = {
            type: "file_search",
            vector_store_ids: [vectorStoreId]
        };

        // max_num_resultsが環境変数で設定されている場合は追加
        if (process.env.FILE_SEARCH_MAX_NUM_RESULTS) {
            try {
                const maxNumResults = parseInt(process.env.FILE_SEARCH_MAX_NUM_RESULTS);
                if (maxNumResults >= 1 && maxNumResults <= 50) {
                    fileSearchTool.max_num_results = maxNumResults;
                } else {
                    console.warn('FILE_SEARCH_MAX_NUM_RESULTS環境変数は1以上50以下の整数で設定してください。');
                }
            } catch (error) {
                console.warn('FILE_SEARCH_MAX_NUM_RESULTS環境変数の解析に失敗しました:', error.message);
            }
        }

        // ranking_optionsのscore_thresholdが環境変数で設定されている場合は追加
        if (process.env.FILE_SEARCH_SCORE_THRESHOLD) {
            try {
                const scoreThreshold = parseFloat(process.env.FILE_SEARCH_SCORE_THRESHOLD);
                if (scoreThreshold >= 0 && scoreThreshold <= 1) {
                    fileSearchTool.ranking_options = {
                        score_threshold: scoreThreshold
                    };
                } else {
                    console.warn('FILE_SEARCH_SCORE_THRESHOLD環境変数は0以上1以下の数値で設定してください。');
                }
            } catch (error) {
                console.warn('FILE_SEARCH_SCORE_THRESHOLD環境変数の解析に失敗しました:', error.message);
            }
        }

        // OpenAI Responses APIリクエスト
        const requestPayload = {
            model: process.env.MODEL || "gpt-4o-mini",
            input: [
                { role: "user", content: message },
            ],
            tools: [fileSearchTool],
            max_output_tokens: 10000
        };

        // instructionsが環境変数で設定されている場合は追加
        if (process.env.INSTRUCTIONS) {
            requestPayload.instructions = process.env.INSTRUCTIONS;
        }

        // includeが環境変数で設定されている場合は追加
        if (process.env.INCLUDE) {
            try {
                // カンマ区切りの文字列を配列に変換
                requestPayload.include = process.env.INCLUDE.split(',').map(item => item.trim());
            } catch (error) {
                console.warn('INCLUDE環境変数の解析に失敗しました:', error.message);
            }
        }

        // temperatureが環境変数で設定されている場合は追加
        if (process.env.TEMPERATURE) {
            try {
                const temperature = parseFloat(process.env.TEMPERATURE);
                if (temperature >= 0 && temperature <= 2) {
                    requestPayload.temperature = temperature;
                } else {
                    console.warn('TEMPERATURE環境変数は0から2の間で設定してください。');
                }
            } catch (error) {
                console.warn('TEMPERATURE環境変数の解析に失敗しました:', error.message);
            }
        }

        // tool_choiceが環境変数で設定されている場合は追加
        if (process.env.TOOL_CHOICE) {
            const validChoices = ['auto', 'none', 'required'];
            if (validChoices.includes(process.env.TOOL_CHOICE)) {
                requestPayload.tool_choice = process.env.TOOL_CHOICE;
            } else {
                console.warn('TOOL_CHOICE環境変数は auto, none, required のいずれかを設定してください。');
            }
        }

        // previous_response_idが提供されている場合は追加
        if (previousResponseId) {
            requestPayload.previous_response_id = previousResponseId;
        }

        console.log('OpenAI Request:', JSON.stringify(requestPayload, null, 2));

        const response = await client.responses.create(requestPayload);

        console.log('OpenAI Response:', JSON.stringify(response, null, 2));

        res.json({
            message: response.output_text || 'すみません、回答を生成できませんでした。',
            responseId: response.id,
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
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log('AI チャットアプリケーション準備完了！');

    // 環境変数の確認
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEYが設定されていません。');
    }
    if (!process.env.VECTOR_STORE_ID) {
        console.warn('VECTOR_STORE_IDが設定されていません。');
    }
    if (process.env.INSTRUCTIONS) {
        console.log('カスタムinstructionsが設定されています。');
    }
    if (process.env.INCLUDE) {
        console.log(`include設定: ${process.env.INCLUDE}`);
    }
    if (process.env.TEMPERATURE) {
        console.log(`temperature設定: ${process.env.TEMPERATURE}`);
    }
    if (process.env.TOOL_CHOICE) {
        console.log(`tool_choice設定: ${process.env.TOOL_CHOICE}`);
    }
    if (process.env.FILE_SEARCH_MAX_NUM_RESULTS) {
        console.log(`file_search max_num_results設定: ${process.env.FILE_SEARCH_MAX_NUM_RESULTS}`);
    }
    if (process.env.FILE_SEARCH_SCORE_THRESHOLD) {
        console.log(`file_search score_threshold設定: ${process.env.FILE_SEARCH_SCORE_THRESHOLD}`);
    }
    console.log(`使用モデル: ${process.env.MODEL || "gpt-4o-mini"}`);
    console.log(`include設定: ${process.env.INCLUDE || "デフォルト"}`);
    console.log(`temperature設定: ${process.env.TEMPERATURE || "デフォルト"}`);
    console.log(`tool_choice設定: ${process.env.TOOL_CHOICE || "auto"}`);
    console.log(`file_search max_num_results設定: ${process.env.FILE_SEARCH_MAX_NUM_RESULTS || "デフォルト"}`);
    console.log(`file_search score_threshold設定: ${process.env.FILE_SEARCH_SCORE_THRESHOLD || "デフォルト"}`);
});

export default app;
