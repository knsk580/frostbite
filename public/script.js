class ChatApp {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.init();
    }

    init() {
        // フォームの送信イベントを設定
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));

        // Enterキーでの送信を設定
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit(e);
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

        // 送信ボタンを無効化
        this.setSendButtonState(false);

        // タイピングインジケーターを表示
        this.showTypingIndicator();

        try {
            // AIからの応答を取得
            const response = await this.sendMessage(message);

            // タイピングインジケーターを非表示
            this.hideTypingIndicator();

            // AI応答を表示
            this.addMessage(response.message, 'ai');

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
            // 送信ボタンを有効化
            this.setSendButtonState(true);

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

        if (sender === 'user') {
            messageDiv.innerHTML = `<strong>あなた:</strong> ${this.escapeHtml(content)}`;
        } else {
            messageDiv.innerHTML = `<strong>AI:</strong> ${this.escapeHtml(content)}`;
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

    setSendButtonState(enabled) {
        this.sendButton.disabled = !enabled;
        this.messageInput.disabled = !enabled;

        if (enabled) {
            this.sendButton.innerHTML = '<i class="bi bi-send"></i> 送信';
        } else {
            this.sendButton.innerHTML = '<i class="bi bi-hourglass-split"></i> 送信中...';
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
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
