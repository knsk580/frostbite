#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6モジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数を読み込み
dotenv.config();

// OpenAIクライアントを初期化
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const UPLOAD_FOLDER = 'upload_files';

async function uploadFilesToVectorStore() {
    console.log('ファイルアップロードスクリプト');
    console.log('=====================================');

    // 環境変数の確認
    const vectorStoreId = process.env.VECTOR_STORE_ID;
    const apiKey = process.env.OPENAI_API_KEY;
    const maxChunkSizeTokens = process.env.MAX_CHUNK_SIZE_TOKENS;
    const chunkOverlapTokens = process.env.CHUNK_OVERLAP_TOKENS;

    if (!apiKey) {
        console.error('エラー: OPENAI_API_KEYが設定されていません');
        process.exit(1);
    }

    if (!vectorStoreId) {
        console.error('エラー: VECTOR_STORE_IDが設定されていません');
        process.exit(1);
    }

    console.log(`対象ベクターストア: ${vectorStoreId}`);

    // チャンク設定の表示
    if (maxChunkSizeTokens || chunkOverlapTokens) {
        console.log('チャンク設定:');
        if (maxChunkSizeTokens) {
            console.log(`   最大チャンクサイズ: ${maxChunkSizeTokens} tokens`);
        }
        if (chunkOverlapTokens) {
            console.log(`   チャンク重複: ${chunkOverlapTokens} tokens`);
        }
    } else {
        console.log('チャンク設定: 自動 (auto)');
    }

    // upload_filesフォルダの存在確認
    const uploadFolderPath = path.join(__dirname, UPLOAD_FOLDER);
    if (!fs.existsSync(uploadFolderPath)) {
        console.error(`エラー: ${UPLOAD_FOLDER}フォルダが見つかりません`);
        console.error(`   ${uploadFolderPath} を作成してファイルを配置してください`);
        process.exit(1);
    }

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
        // アップロード対象ファイルを取得
        console.log(`${UPLOAD_FOLDER}フォルダ内のファイルを取得中...`);
        const files = await getFilesToUpload(uploadFolderPath);

        if (files.length === 0) {
            console.log(`${UPLOAD_FOLDER}フォルダ内にファイルがありません`);
            return;
        }

        console.log(`発見されたファイル数: ${files.length}`);
        console.log('');

        // ファイル一覧を表示
        console.log('アップロード対象ファイル:');
        files.forEach((file, index) => {
            const stats = fs.statSync(file.fullPath);
            console.log(`  ${index + 1}. ${file.name}`);
            console.log(`     パス: ${file.fullPath}`);
            console.log(`     サイズ: ${stats.size} bytes`);
            console.log('');
        });

        // 確認プロンプト
        console.log('警告: この操作はOpenAI APIの使用量に影響します！');
        console.log(`本当に${files.length}個のファイルをアップロードしますか？`);
        console.log('続行するには "yes" と入力してください:');

        // ユーザー入力を待機
        const confirmation = await getUserInput();

        if (confirmation.toLowerCase() !== 'yes') {
            console.log('操作がキャンセルされました');
            return;
        }

        console.log('');
        console.log('ファイルのアップロード処理を開始...');

        // 各ファイルを処理
        let successCount = 0;
        let errorCount = 0;
        const uploadedFileIds = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                console.log(`[${i + 1}/${files.length}] ${file.name} をアップロード中...`);

                // ステップ1: OpenAI Files APIにアップロード
                const uploadedFile = await client.files.create({
                    file: fs.createReadStream(file.fullPath),
                    purpose: 'assistants'
                });

                console.log(`   ファイルアップロード完了: ${uploadedFile.id}`);

                // ステップ2: ベクターストアにファイルを追加
                const createParams = {
                    file_id: uploadedFile.id
                };

                // チャンク戦略を設定
                if (maxChunkSizeTokens || chunkOverlapTokens) {
                    createParams.chunking_strategy = {
                        type: 'static',
                        static: {}
                    };

                    if (maxChunkSizeTokens) {
                        createParams.chunking_strategy.static.max_chunk_size_tokens = parseInt(maxChunkSizeTokens);
                    }

                    if (chunkOverlapTokens) {
                        createParams.chunking_strategy.static.chunk_overlap_tokens = parseInt(chunkOverlapTokens);
                    }

                    console.log(`   チャンク戦略を適用: max=${maxChunkSizeTokens || 'デフォルト'}, overlap=${chunkOverlapTokens || 'デフォルト'}`);
                }

                const vectorStoreFile = await client.vectorStores.files.create(
                    vectorStoreId,
                    createParams
                );

                console.log(`   ベクターストアに追加完了: ${vectorStoreFile.id}`);
                console.log(`   ステータス: ${vectorStoreFile.status}`);

                uploadedFileIds.push({
                    fileName: file.name,
                    fileId: uploadedFile.id,
                    vectorStoreFileId: vectorStoreFile.id,
                    status: vectorStoreFile.status
                });

                successCount++;
                console.log(`   [${i + 1}/${files.length}] 完了: ${file.name}`);

            } catch (error) {
                errorCount++;
                console.error(`   [${i + 1}/${files.length}] 失敗: ${file.name}`);
                console.error(`   エラー: ${error.message}`);

                // 部分的なアップロード失敗時の情報を記録
                if (error.message.includes('file_id')) {
                    console.error('   (ファイルはアップロード済みの可能性があります)');
                }
            }

            console.log('');
        }

        // 結果表示
        console.log('アップロード結果:');
        console.log(`   成功: ${successCount}個`);
        console.log(`   失敗: ${errorCount}個`);
        console.log(`   合計: ${files.length}個`);
        console.log('');

        if (uploadedFileIds.length > 0) {
            console.log('アップロード済みファイル詳細:');
            uploadedFileIds.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.fileName}`);
                console.log(`     File ID: ${file.fileId}`);
                console.log(`     Vector Store File ID: ${file.vectorStoreFileId}`);
                console.log(`     ステータス: ${file.status}`);
                console.log('');
            });
        }

        if (errorCount === 0) {
            console.log('全てのファイルが正常にアップロードされました！');
        } else {
            console.log('一部のファイルのアップロードに失敗しました');
        }

    } catch (error) {
        console.error('エラーが発生しました:', error.message);

        if (error.status === 401) {
            console.error('   原因: OpenAI APIキーが無効です');
        } else if (error.status === 404) {
            console.error('   原因: 指定されたベクターストアが見つかりません');
        } else if (error.status === 403) {
            console.error('   原因: アクセス権限がありません');
        } else if (error.status === 413) {
            console.error('   原因: ファイルサイズが大きすぎます (最大512MB)');
        }

        process.exit(1);
    }
}

// upload_filesフォルダ内のファイルを取得
async function getFilesToUpload(folderPath) {
    const files = [];

    try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const fullPath = path.join(folderPath, entry.name);
                const stats = fs.statSync(fullPath);

                // ファイルサイズチェック (512MB制限)
                if (stats.size > 512 * 1024 * 1024) {
                    console.warn(`警告: ${entry.name} は512MBを超えています。スキップします。`);
                    continue;
                }

                // 隠しファイルや一時ファイルをスキップ
                if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) {
                    continue;
                }

                files.push({
                    name: entry.name,
                    fullPath: fullPath
                });
            }
        }
    } catch (error) {
        console.error(`フォルダの読み込みエラー: ${error.message}`);
        throw error;
    }

    return files;
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
uploadFilesToVectorStore()
    .then(() => {
        console.log('');
        console.log('スクリプト実行完了');
        process.exit(0);
    })
    .catch((error) => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
