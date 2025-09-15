#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ES6モジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数を読み込み
dotenv.config();

// OpenAIクライアントを初期化
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function clearVectorStore() {
    console.log('ベクターストアクリーニングスクリプト');
    console.log('=====================================');

    // 環境変数の確認
    const vectorStoreId = process.env.VECTOR_STORE_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('エラー: OPENAI_API_KEYが設定されていません');
        process.exit(1);
    }

    if (!vectorStoreId) {
        console.error('エラー: VECTOR_STORE_IDが設定されていません');
        process.exit(1);
    }

    console.log(`対象ベクターストア: ${vectorStoreId}`);

    // ベクターストア情報を取得
    try {
        console.log('ベクターストア情報を取得中...');
        const vectorStore = await client.vectorStores.retrieve(vectorStoreId);
        console.log(JSON.stringify(vectorStore, null, 2));
        console.log('');
    } catch (error) {
        console.warn(`警告: ベクターストア情報の取得に失敗: ${error.message}`);
        console.log('');
    }

    try {
        // ベクターストア内の全ファイル一覧を取得（ページネーション対応）
        console.log('ファイル一覧を取得中...');
        const allFiles = await getAllVectorStoreFiles(vectorStoreId);

        if (!allFiles || allFiles.length === 0) {
            console.log('ベクターストア内にファイルはありません');
            return;
        }

        console.log(`発見されたファイル数: ${allFiles.length}`);
        console.log('');

        // 各ファイルの詳細を表示
        console.log('ファイル一覧:');
        allFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. id: ${file.id}`);
            console.log(`     created_at: ${new Date(file.created_at * 1000).toLocaleString('ja-JP')}`);
            console.log(`     status: ${file.status}`);
            console.log(`     usage_bytes: ${file.usage_bytes}`);
            if (file.last_error) {
                console.log(`     エラー: ${file.last_error.message}`);
            }
            console.log('');
        });

        // 確認プロンプト
        console.log('警告: この操作は元に戻せません！');
        console.log(`本当に${allFiles.length}個のファイルを全て削除しますか？`);
        console.log('続行するには "yes" と入力してください:');

        // ユーザー入力を待機
        const confirmation = await getUserInput();

        if (confirmation.toLowerCase() !== 'yes') {
            console.log('操作がキャンセルされました');
            return;
        }

        console.log('');
        console.log('ファイルを削除中...');

        // 削除処理
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            try {
                await client.vectorStores.files.del(vectorStoreId, file.id);
                successCount++;
                console.log(`[${i + 1}/${allFiles.length}] ファイル削除完了: ${file.id}`);
            } catch (error) {
                errorCount++;
                console.error(`[${i + 1}/${allFiles.length}] ファイル削除失敗: ${file.id}`);
                console.error(`   エラー: ${error.message}`);
            }
        }

        console.log('');
        console.log('削除結果:');
        console.log(`   成功: ${successCount}個`);
        console.log(`   失敗: ${errorCount}個`);
        console.log(`   合計: ${allFiles.length}個`);

        if (errorCount === 0) {
            console.log('');
            console.log('全てのファイルが正常に削除されました！');
        } else {
            console.log('');
            console.log('一部のファイルの削除に失敗しました');
        }

    } catch (error) {
        console.error('エラーが発生しました:', error.message);

        if (error.status === 401) {
            console.error('   原因: OpenAI APIキーが無効です');
        } else if (error.status === 404) {
            console.error('   原因: 指定されたベクターストアが見つかりません');
        } else if (error.status === 403) {
            console.error('   原因: アクセス権限がありません');
        }

        process.exit(1);
    }
}

// 全ファイルを取得する関数（ページネーション対応）
async function getAllVectorStoreFiles(vectorStoreId) {
    let allFiles = [];
    let hasMore = true;
    let after = null;

    console.log('   ページネーション処理中...');

    while (hasMore) {
        try {
            const params = {
                limit: 100 // 最大値を設定
            };

            if (after) {
                params.after = after;
            }

            const response = await client.vectorStores.files.list(vectorStoreId, params);

            if (response.data && response.data.length > 0) {
                allFiles = allFiles.concat(response.data);
                console.log(`   取得済み: ${allFiles.length}個のファイル...`);

                // 次のページがあるかチェック
                hasMore = response.has_more || false;
                after = response.last_id || null;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error(`   ページネーション中にエラー: ${error.message}`);
            break;
        }
    }

    console.log(`   取得完了: 合計 ${allFiles.length}個のファイル`);
    return allFiles;
}

// ユーザー入力を取得する関数
function getUserInput() {
    return new Promise((resolve) => {
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', (data) => {
            resolve(data.trim());
        });
    });
}

// スクリプト実行
clearVectorStore()
    .then(() => {
        console.log('');
        console.log('スクリプト実行完了');
        process.exit(0);
    })
    .catch((error) => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
