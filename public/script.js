class ChatApp {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.outputContainer = document.getElementById('outputContainer');
        this.placeholderMessage = document.getElementById('placeholderMessage');

        this.init();
    }

    init() {
        // フォームの送信イベントを設定
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));

        // キーボードイベントを設定
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Shift+Enter: 改行（デフォルト動作を許可）
                    return;
                } else {
                    // Enter: 送信
                    e.preventDefault();
                    this.handleSubmit(e);
                }
            }
        });

        // 初期フォーカス
        this.messageInput.focus();
    }

    async handleSubmit(e) {
        e.preventDefault();

        const message = this.messageInput.value.trim();
        if (!message) return;

        // ユーザーメッセージを表示
        this.addMessage(message, 'user');

        // 入力フィールドをクリア
        this.messageInput.value = '';

        // 入力フィールドを無効化
        this.setInputState(false);

        // タイピングインジケーターを表示
        this.showTypingIndicator();

        // レスポンス時間の計測開始
        const startTime = performance.now();

        try {
            // AIからの応答を取得
            const response = await this.sendMessage(message);

            // レスポンス時間の計測終了
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // タイピングインジケーターを非表示
            this.hideTypingIndicator();

            // AI応答を表示
            this.addMessage(response.message, 'ai');

            // デバッグ情報を出力エリアに表示（レスポンス時間を含む）
            if (response.debug) {
                this.displayDebugInfo(response.debug, responseTime);
            }

        } catch (error) {
            console.error('Error:', error);

            // タイピングインジケーターを非表示
            this.hideTypingIndicator();

            // エラーメッセージを表示
            this.addMessage(
                'すみません、エラーが発生しました。しばらく時間をおいて再試行してください。',
                'ai'
            );
        } finally {
            // 入力フィールドを有効化
            this.setInputState(true);

            // 入力フィールドにフォーカス
            this.messageInput.focus();
        }
    }

    async sendMessage(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        if (sender === 'ai') {
            // AIメッセージはMarkdownとして解析
            messageDiv.innerHTML = marked.parse(content);
        } else {
            // ユーザーメッセージはプレーンテキスト
            messageDiv.innerHTML = this.escapeHtml(content);
        }

        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;

        if (enabled) {
            this.messageInput.placeholder = 'メッセージを入力してください...';
        } else {
            this.messageInput.placeholder = '送信中...';
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    displayDebugInfo(debug, responseTime) {
        // プレースホルダーメッセージを非表示
        if (this.placeholderMessage) {
            this.placeholderMessage.style.display = 'none';
        }

        const timestamp = new Date().toLocaleTimeString();

        const debugHTML = `
            <div class="debug-section">
                <h6 class="text-primary mb-3">
                    <i class="bi bi-stopwatch"></i> レスポンス時間: ${responseTime}ms
                    <small class="text-muted ms-2">(${timestamp})</small>
                </h6>
                
                <div class="mb-4">
                    <h6 class="text-body mb-2">
                        <i class="bi bi-arrow-up-circle"></i> リクエスト
                    </h6>
                    <pre class="json-display"><code class="language-json">${this.escapeHtml(JSON.stringify(debug.request, null, 2))}</code></pre>
                </div>
                
                <div class="mb-4">
                    <h6 class="text-body mb-2">
                        <i class="bi bi-arrow-down-circle"></i> レスポンス
                    </h6>
                    <pre class="json-display"><code class="language-json">${this.escapeHtml(JSON.stringify(debug.response, null, 2))}</code></pre>
                </div>
                
                <hr class="my-4">
            </div>
        `;

        // プレースホルダー以外の既存コンテンツの前に追加
        const existingContent = this.outputContainer.innerHTML.replace(this.placeholderMessage.outerHTML, '');
        this.outputContainer.innerHTML = debugHTML + existingContent;

        // Prism.jsでシンタックスハイライトを適用
        this.highlightCode();

        this.outputContainer.scrollTop = 0;
    }

    highlightCode() {
        // Prism.jsでシンタックスハイライトを適用
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    }

    formatJSON(obj) {
        return this.escapeHtml(JSON.stringify(obj, null, 2));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// DOMが読み込まれたらアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
