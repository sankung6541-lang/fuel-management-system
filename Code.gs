/**
 * Fuel Management System - Google Apps Script Backend
 * ระบบจัดการน้ำมัน กองพันทหารราบ
 * 
 * วิธีใช้:
 * 1. สร้าง Google Sheets ใหม่
 * 2. Extensions > Apps Script
 * 3. ลบ Code เดิมทั้งหมด แล้ววาง Code นี้
 * 4. Deploy > New deployment > Web app
 * 5. Execute as: Me, Who has access: Anyone
 * 6. Copy URL ไปใส่ในหน้าตั้งค่าของระบบ
 */

const SHEETS = {
    REQUESTS: 'Requests',
    TRANSACTIONS: 'Transactions',
    INVENTORY: 'Inventory',
    USERS: 'Users'
};

// ========== Main Handlers ==========

function doGet(e) {
    const action = e.parameter.action || 'test';
    
    try {
        switch (action) {
            case 'test':
                return jsonResponse({ success: true, message: 'Connected!' });
            case 'getData':
                return jsonResponse({ success: true, data: getAllData() });
            case 'getInventory':
                return jsonResponse({ success: true, inventory: getInventory() });
            default:
                return jsonResponse({ success: false, message: 'Unknown action' });
        }
    } catch (error) {
        return jsonResponse({ success: false, message: error.toString() });
    }
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        
        switch (action) {
            case 'sync':
                return syncData(data.data);
            case 'addRequest':
                return addRequest(data.request);
            case 'addTransaction':
                return addTransaction(data.transaction);
            case 'updateInventory':
                return updateInventory(data.fuelType, data.amount);
            case 'sendTelegram':
                return sendTelegram(data.botToken, data.chatId, data.message);
            case 'sendLineNotify':
                return sendTelegram(data.botToken, data.chatId, data.message); // Backward compatibility
            default:
                return jsonResponse({ success: false, message: 'Unknown action' });
        }
    } catch (error) {
        return jsonResponse({ success: false, message: error.toString() });
    }
}

// ========== Telegram Bot ==========

function sendTelegram(botToken, chatId, message) {
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        };
        
        const response = UrlFetchApp.fetch(url, options);
        const result = JSON.parse(response.getContentText());
        
        return jsonResponse({ success: result.ok, message: result.ok ? 'Sent!' : result.description });
    } catch (error) {
        return jsonResponse({ success: false, message: error.toString() });
    }
}

// ========== Data Operations ==========

function syncData(allData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Initialize sheets if needed
    initSheets(ss);
    
    // Sync Requests
    if (allData.requests && allData.requests.length > 0) {
        const reqSheet = ss.getSheetByName(SHEETS.REQUESTS);
        reqSheet.getRange(2, 1, reqSheet.getLastRow(), 10).clearContent();
        
        const reqData = allData.requests.map(r => [
            r.id, r.requesterId, r.requesterName, r.fuelType, r.liters,
            r.vehiclePlate, r.mileage || '', r.purpose || '', r.status, r.requestDate
        ]);
        if (reqData.length > 0) {
            reqSheet.getRange(2, 1, reqData.length, 10).setValues(reqData);
        }
    }
    
    // Sync Transactions
    if (allData.transactions && allData.transactions.length > 0) {
        const txSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
        txSheet.getRange(2, 1, txSheet.getLastRow(), 9).clearContent();
        
        const txData = allData.transactions.map(t => [
            t.id, t.type, t.fuelType, t.liters, t.vehiclePlate || '',
            t.requesterId || '', t.requesterName || '', t.transactionDate, t.note || ''
        ]);
        if (txData.length > 0) {
            txSheet.getRange(2, 1, txData.length, 9).setValues(txData);
        }
    }
    
    // Sync Inventory
    if (allData.inventory) {
        const invSheet = ss.getSheetByName(SHEETS.INVENTORY);
        invSheet.getRange(2, 1, 3, 3).setValues([
            ['diesel', allData.inventory.diesel.current, allData.inventory.diesel.capacity],
            ['benzin95', allData.inventory.benzin95.current, allData.inventory.benzin95.capacity],
            ['benzin91', allData.inventory.benzin91.current, allData.inventory.benzin91.capacity]
        ]);
    }
    
    // Sync Users
    if (allData.users && allData.users.length > 0) {
        const userSheet = ss.getSheetByName(SHEETS.USERS);
        userSheet.getRange(2, 1, userSheet.getLastRow(), 5).clearContent();
        
        const userData = allData.users.map(u => [
            u.id, u.username, u.name, u.role, u.active
        ]);
        if (userData.length > 0) {
            userSheet.getRange(2, 1, userData.length, 5).setValues(userData);
        }
    }
    
    return jsonResponse({ success: true, message: 'Sync completed', timestamp: new Date().toISOString() });
}

function addRequest(request) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    const sheet = ss.getSheetByName(SHEETS.REQUESTS);
    sheet.appendRow([
        request.id, request.requesterId, request.requesterName, request.fuelType,
        request.liters, request.vehiclePlate, request.mileage || '', request.purpose || '',
        request.status, request.requestDate
    ]);
    
    return jsonResponse({ success: true });
}

function addTransaction(transaction) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    const sheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
    sheet.appendRow([
        transaction.id, transaction.type, transaction.fuelType, transaction.liters,
        transaction.vehiclePlate || '', transaction.requesterId || '', transaction.requesterName || '',
        transaction.transactionDate, transaction.note || ''
    ]);
    
    return jsonResponse({ success: true });
}

function updateInventory(fuelType, amount) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    const sheet = ss.getSheetByName(SHEETS.INVENTORY);
    const data = sheet.getRange(2, 1, 3, 3).getValues();
    
    for (let i = 0; i < data.length; i++) {
        if (data[i][0] === fuelType) {
            data[i][1] = parseFloat(data[i][1]) + parseFloat(amount);
            break;
        }
    }
    
    sheet.getRange(2, 1, 3, 3).setValues(data);
    return jsonResponse({ success: true });
}

function getAllData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    return {
        requests: getSheetData(ss, SHEETS.REQUESTS),
        transactions: getSheetData(ss, SHEETS.TRANSACTIONS),
        inventory: getInventory(),
        users: getSheetData(ss, SHEETS.USERS)
    };
}

function getInventory() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    const sheet = ss.getSheetByName(SHEETS.INVENTORY);
    const data = sheet.getRange(2, 1, 3, 3).getValues();
    
    return {
        diesel: { current: data[0][1], capacity: data[0][2], unit: 'liters' },
        benzin95: { current: data[1][1], capacity: data[1][2], unit: 'liters' },
        benzin91: { current: data[2][1], capacity: data[2][2], unit: 'liters' }
    };
}

function getSheetData(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    return data.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });
}

// ========== Initialize Sheets ==========

function initSheets(ss) {
    // Requests
    if (!ss.getSheetByName(SHEETS.REQUESTS)) {
        const sheet = ss.insertSheet(SHEETS.REQUESTS);
        sheet.appendRow(['id', 'requesterId', 'requesterName', 'fuelType', 'liters', 'vehiclePlate', 'mileage', 'purpose', 'status', 'requestDate']);
        sheet.getRange(1, 1, 1, 10).setBackground('#1a472a').setFontColor('#ffffff').setFontWeight('bold');
    }
    
    // Transactions
    if (!ss.getSheetByName(SHEETS.TRANSACTIONS)) {
        const sheet = ss.insertSheet(SHEETS.TRANSACTIONS);
        sheet.appendRow(['id', 'type', 'fuelType', 'liters', 'vehiclePlate', 'requesterId', 'requesterName', 'transactionDate', 'note']);
        sheet.getRange(1, 1, 1, 9).setBackground('#1a472a').setFontColor('#ffffff').setFontWeight('bold');
    }
    
    // Inventory
    if (!ss.getSheetByName(SHEETS.INVENTORY)) {
        const sheet = ss.insertSheet(SHEETS.INVENTORY);
        sheet.appendRow(['fuelType', 'current', 'capacity']);
        sheet.getRange(1, 1, 1, 3).setBackground('#1a472a').setFontColor('#ffffff').setFontWeight('bold');
        sheet.appendRow(['diesel', 5000, 10000]);
        sheet.appendRow(['benzin95', 2000, 5000]);
        sheet.appendRow(['benzin91', 1500, 5000]);
    }
    
    // Users
    if (!ss.getSheetByName(SHEETS.USERS)) {
        const sheet = ss.insertSheet(SHEETS.USERS);
        sheet.appendRow(['id', 'username', 'name', 'role', 'active']);
        sheet.getRange(1, 1, 1, 5).setBackground('#1a472a').setFontColor('#ffffff').setFontWeight('bold');
    }
}

// ========== Helpers ==========

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// ========== Manual Test ==========

function testSetup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    Logger.log('Sheets initialized successfully!');
}
