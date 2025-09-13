import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function runRAG() {
    const vectorStoreId = process.env.VECTOR_STORE_ID;

    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            { role: "user", content: "このベクトルストアを使って要約してください。" },
        ],
        tools: [{ type: "file_search" }],
        metadata: {
            vector_store_ids: [vectorStoreId],
        },
    });

    console.log(response.output_text);
}

runRAG();
