/**
 * Auto Sync & Alerts
 * ระบบ Sync อัตโนมัติและแจ้งเตือน
 */

const AutoSync = {
    intervalId: null,
    INTERVAL_MS: 5 * 60 * 1000, // 5 นาที
    LOW_FUEL_THRESHOLD: 0.2, // 20%

    // เริ่ม Auto Sync
    start() {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            this.performSync();
        }, this.INTERVAL_MS);

        console.log('AutoSync started (every 5 minutes)');
    },

    // หยุด Auto Sync
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('AutoSync stopped');
        }
    },

    // ทำ Sync
    async performSync() {
        if (GoogleSheets.isConfigured()) {
            console.log('AutoSync: Syncing data...');
            await GoogleSheets.syncToSheets();
            this.checkLowFuel();
        }
    },

    // ตรวจสอบน้ำมันใกล้หมด
    checkLowFuel() {
        const inventory = DataManager.getInventory();
        const alertedKey = 'fuel_low_alerted';
        const alerted = JSON.parse(localStorage.getItem(alertedKey) || '{}');
        const now = new Date().toDateString();

        ['diesel', 'benzin95', 'benzin91'].forEach(fuelType => {
            const fuel = inventory[fuelType];
            const percent = fuel.current / fuel.capacity;

            if (percent <= this.LOW_FUEL_THRESHOLD) {
                // แจ้งเตือนวันละครั้งต่อประเภท
                if (alerted[fuelType] !== now) {
                    this.showLowFuelAlert(fuelType, fuel.current, fuel.capacity);
                    alerted[fuelType] = now;
                    localStorage.setItem(alertedKey, JSON.stringify(alerted));

                    // ส่งแจ้งเตือน LINE
                    if (LineNotify.isConfigured()) {
                        LineNotify.notifyLowFuel(fuelType, fuel.current, fuel.capacity);
                    }
                }
            }
        });
    },

    // แสดงการแจ้งเตือน
    showLowFuelAlert(fuelType, current, capacity) {
        const percent = Math.round((current / capacity) * 100);
        const name = Utils.getFuelTypeName(fuelType);

        Utils.showToast(`⚠️ ${name} ใกล้หมด! (${percent}%)`, 'warning', 5000);

        // แสดง browser notification ถ้าได้รับอนุญาต
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ น้ำมันใกล้หมด!', {
                body: `${name} คงเหลือ ${Utils.formatNumber(current)} ลิตร (${percent}%)`,
                icon: '🛢️'
            });
        }
    },

    // ขออนุญาต Browser Notification
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
};

// Start on load
document.addEventListener('DOMContentLoaded', () => {
    AutoSync.start();
    AutoSync.requestNotificationPermission();
    // Check on load
    setTimeout(() => AutoSync.checkLowFuel(), 2000);
});

window.AutoSync = AutoSync;
