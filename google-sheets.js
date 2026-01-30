/**
 * Google Sheets Integration for Fuel Management System
 * ระบบเชื่อมต่อ Google Sheets - URL จะถูกเก็บถาวรไม่หาย
 */

const GoogleSheets = {
    // ตั้งค่า Web App URL
    WEB_APP_URL: '',

    // Status
    isConfigured() {
        return this.WEB_APP_URL && this.WEB_APP_URL.length > 0;
    },

    // บันทึก URL แบบถาวร (เก็บหลายที่เพื่อไม่ให้หาย)
    setWebAppUrl(url) {
        this.WEB_APP_URL = url;

        // เก็บใน localStorage
        localStorage.setItem('googleSheetsUrl', url);

        // เก็บใน sessionStorage
        sessionStorage.setItem('googleSheetsUrl', url);

        // เก็บใน DataManager (fuel_google_config)
        const config = {
            webAppUrl: url,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('fuel_google_config', JSON.stringify(config));

        // เก็บใน IndexedDB สำหรับความถาวร
        this.saveToIndexedDB(url);

        return true;
    },

    // โหลด URL จากทุกที่ที่เก็บไว้
    loadConfig() {
        // ลองหาจาก localStorage ก่อน
        let url = localStorage.getItem('googleSheetsUrl');

        // ถ้าไม่มี ลองหาจาก fuel_google_config
        if (!url) {
            const config = localStorage.getItem('fuel_google_config');
            if (config) {
                try {
                    const parsed = JSON.parse(config);
                    url = parsed.webAppUrl;
                } catch (e) { }
            }
        }

        // ถ้าไม่มี ลองหาจาก sessionStorage
        if (!url) {
            url = sessionStorage.getItem('googleSheetsUrl');
        }

        if (url) {
            this.WEB_APP_URL = url;
            // บันทึกกลับไปทุกที่เพื่อให้แน่ใจว่าไม่หาย
            this.setWebAppUrl(url);
        }

        // ลองโหลดจาก IndexedDB
        this.loadFromIndexedDB();
    },

    // เก็บใน IndexedDB (เก็บถาวรที่สุด)
    saveToIndexedDB(url) {
        try {
            const request = indexedDB.open('FuelManagement', 1);

            request.onerror = () => console.log('IndexedDB not available');

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['config'], 'readwrite');
                const store = transaction.objectStore('config');
                store.put({ key: 'googleSheetsUrl', value: url, savedAt: new Date().toISOString() });
            };
        } catch (e) {
            console.log('IndexedDB save error:', e);
        }
    },

    // โหลดจาก IndexedDB
    loadFromIndexedDB() {
        try {
            const request = indexedDB.open('FuelManagement', 1);

            request.onerror = () => { };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['config'], 'readonly');
                    const store = transaction.objectStore('config');
                    const getRequest = store.get('googleSheetsUrl');

                    getRequest.onsuccess = () => {
                        if (getRequest.result && getRequest.result.value) {
                            const url = getRequest.result.value;
                            if (url && !this.WEB_APP_URL) {
                                this.WEB_APP_URL = url;
                                // บันทึกกลับไป localStorage ด้วย
                                localStorage.setItem('googleSheetsUrl', url);
                                localStorage.setItem('fuel_google_config', JSON.stringify({
                                    webAppUrl: url,
                                    savedAt: new Date().toISOString()
                                }));
                            }
                        }
                    };
                } catch (e) { }
            };
        } catch (e) {
            console.log('IndexedDB load error:', e);
        }
    },

    // Sync data to Google Sheets
    async syncToSheets() {
        if (!this.isConfigured()) {
            return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Sheets URL' };
        }

        try {
            const data = DataManager.exportAllData();

            const response = await fetch(this.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync',
                    data: data
                })
            });

            const lastSync = new Date().toISOString();
            localStorage.setItem('lastSync', lastSync);
            sessionStorage.setItem('lastSync', lastSync);

            return { success: true, message: 'Sync สำเร็จ' };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message };
        }
    },

    // Fetch data from Google Sheets
    async fetchFromSheets() {
        if (!this.isConfigured()) {
            return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Sheets URL' };
        }

        try {
            const response = await fetch(this.WEB_APP_URL + '?action=getData');
            const data = await response.json();

            if (data.success) {
                DataManager.importData(data.data);
                return { success: true, message: 'ดึงข้อมูลสำเร็จ' };
            }
            return { success: false, message: data.message || 'ไม่สามารถดึงข้อมูลได้' };
        } catch (error) {
            console.error('Fetch error:', error);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message };
        }
    },

    // Add single request to sheet
    async addRequest(request) {
        if (!this.isConfigured()) return { success: false };

        try {
            await fetch(this.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addRequest',
                    request: request
                })
            });
            return { success: true };
        } catch (error) {
            console.error('Add request error:', error);
            return { success: false };
        }
    },

    // Add transaction to sheet
    async addTransaction(transaction) {
        if (!this.isConfigured()) return { success: false };

        try {
            await fetch(this.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addTransaction',
                    transaction: transaction
                })
            });
            return { success: true };
        } catch (error) {
            console.error('Add transaction error:', error);
            return { success: false };
        }
    },

    // Get last sync time
    getLastSyncTime() {
        const lastSync = localStorage.getItem('lastSync') || sessionStorage.getItem('lastSync');
        if (!lastSync) return 'ยังไม่เคย Sync';
        try {
            return Utils.formatDate(lastSync, true);
        } catch (e) {
            return lastSync;
        }
    },

    // ดึง URL ปัจจุบัน (สำหรับแสดงในหน้าตั้งค่า)
    getCurrentUrl() {
        return this.WEB_APP_URL || '';
    }
};

// Load config on init
GoogleSheets.loadConfig();
window.GoogleSheets = GoogleSheets;
