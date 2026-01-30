/**
 * Telegram Bot Notification
 * ระบบแจ้งเตือนผ่าน Telegram
 */

const TelegramNotify = {
    // Telegram Bot Token และ Chat ID (ตั้งค่าในหน้า Settings)
    BOT_TOKEN: '',
    CHAT_ID: '',

    // Load config from storage
    loadConfig() {
        this.BOT_TOKEN = localStorage.getItem('telegramBotToken') || '';
        this.CHAT_ID = localStorage.getItem('telegramChatId') || '';

        // Try IndexedDB
        try {
            const request = indexedDB.open('FuelManagement', 1);
            request.onsuccess = (event) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['config'], 'readonly');
                    const store = transaction.objectStore('config');

                    store.get('telegramBotToken').onsuccess = (e) => {
                        if (e.target.result && e.target.result.value && !this.BOT_TOKEN) {
                            this.BOT_TOKEN = e.target.result.value;
                            localStorage.setItem('telegramBotToken', this.BOT_TOKEN);
                        }
                    };
                    store.get('telegramChatId').onsuccess = (e) => {
                        if (e.target.result && e.target.result.value && !this.CHAT_ID) {
                            this.CHAT_ID = e.target.result.value;
                            localStorage.setItem('telegramChatId', this.CHAT_ID);
                        }
                    };
                } catch (e) { }
            };
        } catch (e) { }

        return { token: this.BOT_TOKEN, chatId: this.CHAT_ID };
    },

    // Save config to storage
    setConfig(botToken, chatId) {
        this.BOT_TOKEN = botToken;
        this.CHAT_ID = chatId;

        localStorage.setItem('telegramBotToken', botToken);
        localStorage.setItem('telegramChatId', chatId);

        // Save to IndexedDB
        try {
            const request = indexedDB.open('FuelManagement', 1);
            request.onsuccess = (event) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['config'], 'readwrite');
                    const store = transaction.objectStore('config');
                    store.put({ key: 'telegramBotToken', value: botToken });
                    store.put({ key: 'telegramChatId', value: chatId });
                } catch (e) { }
            };
        } catch (e) { }

        return true;
    },

    isConfigured() {
        return this.BOT_TOKEN && this.BOT_TOKEN.length > 0 && this.CHAT_ID && this.CHAT_ID.length > 0;
    },

    // ส่งข้อความผ่าน Telegram Bot
    async send(message) {
        if (!this.isConfigured()) {
            console.log('Telegram not configured');
            return { success: false, message: 'ยังไม่ได้ตั้งค่า Telegram' };
        }

        try {
            // ส่งผ่าน Google Apps Script เพื่อหลีก CORS
            if (GoogleSheets.isConfigured()) {
                await fetch(GoogleSheets.WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sendTelegram',
                        botToken: this.BOT_TOKEN,
                        chatId: this.CHAT_ID,
                        message: message
                    })
                });
                return { success: true };
            }
            return { success: false, message: 'ต้องตั้งค่า Google Sheets ก่อน' };
        } catch (error) {
            console.error('Telegram error:', error);
            return { success: false, message: error.message };
        }
    },

    // แจ้งเตือนคำขอใหม่
    async notifyNewRequest(request) {
        const message = `🛢️ *คำขอเบิกน้ำมันใหม่*\n\n` +
            `📋 รหัส: \`${request.id}\`\n` +
            `👤 ผู้เบิก: ${request.requesterName}\n` +
            `⛽ ประเภท: ${Utils.getFuelTypeName(request.fuelType)}\n` +
            `📊 จำนวน: ${request.liters} ลิตร\n` +
            `🚗 ทะเบียน: ${request.vehiclePlate}`;
        return this.send(message);
    },

    // แจ้งเตือนอนุมัติ
    async notifyApproved(request, actualLiters) {
        const message = `✅ *อนุมัติเบิกน้ำมัน*\n\n` +
            `📋 รหัส: \`${request.id}\`\n` +
            `👤 ผู้เบิก: ${request.requesterName}\n` +
            `⛽ ประเภท: ${Utils.getFuelTypeName(request.fuelType)}\n` +
            `📊 จ่ายจริง: ${actualLiters} ลิตร\n` +
            `🚗 ทะเบียน: ${request.vehiclePlate}`;
        return this.send(message);
    },

    // แจ้งเตือนน้ำมันใกล้หมด
    async notifyLowFuel(fuelType, current, capacity) {
        const percent = Math.round((current / capacity) * 100);
        const message = `⚠️ *แจ้งเตือนน้ำมันใกล้หมด!*\n\n` +
            `⛽ ${Utils.getFuelTypeName(fuelType)}\n` +
            `📊 คงเหลือ: ${Utils.formatNumber(current)} ลิตร (${percent}%)\n` +
            `🔴 กรุณาเติมน้ำมันโดยเร็ว`;
        return this.send(message);
    },

    // แจ้งเตือนรับน้ำมันเข้า
    async notifyFuelReceived(fuelType, liters, note) {
        const message = `📥 *รับน้ำมันเข้าคลัง*\n\n` +
            `⛽ ${Utils.getFuelTypeName(fuelType)}\n` +
            `📊 จำนวน: ${Utils.formatNumber(liters)} ลิตร\n` +
            `📝 ${note || '-'}`;
        return this.send(message);
    }
};

// Load on init
TelegramNotify.loadConfig();
window.TelegramNotify = TelegramNotify;

// Alias for backward compatibility
window.LineNotify = TelegramNotify;
