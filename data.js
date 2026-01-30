/**
 * Fuel Management System - Data Management
 */

const DataManager = {
    STORAGE_KEYS: {
        USERS: 'fuel_users',
        REQUESTS: 'fuel_requests',
        TRANSACTIONS: 'fuel_transactions',
        INVENTORY: 'fuel_inventory',
        SETTINGS: 'fuel_settings',
        GOOGLE_CONFIG: 'fuel_google_config'
    },

    // Default data
    getDefaultInventory() {
        return {
            diesel: { current: 5000, capacity: 10000, unit: 'liters' },
            benzin95: { current: 2000, capacity: 5000, unit: 'liters' },
            benzin91: { current: 1500, capacity: 5000, unit: 'liters' }
        };
    },

    getDefaultUsers() {
        return [
            { id: 'U001', username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 'U002', username: 'officer1', password: 'officer123', name: 'เจ้าหน้าที่น้ำมัน', role: 'officer', active: true, createdAt: new Date().toISOString() },
            { id: 'U003', username: 'user1', password: 'user123', name: 'ผู้เบิก 1', role: 'requester', active: true, createdAt: new Date().toISOString() }
        ];
    },

    // Initialize data
    init() {
        if (!this.get(this.STORAGE_KEYS.USERS)) {
            this.set(this.STORAGE_KEYS.USERS, this.getDefaultUsers());
        }
        if (!this.get(this.STORAGE_KEYS.INVENTORY)) {
            this.set(this.STORAGE_KEYS.INVENTORY, this.getDefaultInventory());
        }
        if (!this.get(this.STORAGE_KEYS.REQUESTS)) {
            this.set(this.STORAGE_KEYS.REQUESTS, []);
        }
        if (!this.get(this.STORAGE_KEYS.TRANSACTIONS)) {
            this.set(this.STORAGE_KEYS.TRANSACTIONS, []);
        }
    },

    // Generic CRUD operations
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            return false;
        }
    },

    // Users
    getUsers() { return this.get(this.STORAGE_KEYS.USERS) || []; },

    getUserById(id) { return this.getUsers().find(u => u.id === id); },

    getUserByUsername(username) { return this.getUsers().find(u => u.username === username); },

    addUser(user) {
        const users = this.getUsers();
        user.id = Utils.generateId('U');
        user.createdAt = Utils.getCurrentDateTime();
        user.active = true;
        users.push(user);
        return this.set(this.STORAGE_KEYS.USERS, users);
    },

    updateUser(id, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) return false;
        users[index] = { ...users[index], ...updates };
        return this.set(this.STORAGE_KEYS.USERS, users);
    },

    deleteUser(id) {
        const users = this.getUsers().filter(u => u.id !== id);
        return this.set(this.STORAGE_KEYS.USERS, users);
    },

    // Requests
    getRequests() { return this.get(this.STORAGE_KEYS.REQUESTS) || []; },

    getRequestById(id) { return this.getRequests().find(r => r.id === id); },

    getRequestsByStatus(status) { return this.getRequests().filter(r => r.status === status); },

    getRequestsByUser(userId) { return this.getRequests().filter(r => r.requesterId === userId); },

    addRequest(request) {
        const requests = this.getRequests();
        request.id = Utils.generateId('REQ');
        request.status = 'pending';
        request.requestDate = Utils.getCurrentDateTime();
        requests.unshift(request);
        return this.set(this.STORAGE_KEYS.REQUESTS, requests);
    },

    updateRequest(id, updates) {
        const requests = this.getRequests();
        const index = requests.findIndex(r => r.id === id);
        if (index === -1) return false;
        requests[index] = { ...requests[index], ...updates };
        return this.set(this.STORAGE_KEYS.REQUESTS, requests);
    },

    // Transactions
    getTransactions() { return this.get(this.STORAGE_KEYS.TRANSACTIONS) || []; },

    addTransaction(transaction) {
        const transactions = this.getTransactions();
        transaction.id = Utils.generateId('TXN');
        transaction.transactionDate = Utils.getCurrentDateTime();
        transactions.unshift(transaction);
        return this.set(this.STORAGE_KEYS.TRANSACTIONS, transactions);
    },

    // Inventory
    getInventory() { return this.get(this.STORAGE_KEYS.INVENTORY) || this.getDefaultInventory(); },

    updateInventory(fuelType, amount) {
        const inventory = this.getInventory();
        if (!inventory[fuelType]) return false;
        inventory[fuelType].current += amount;
        if (inventory[fuelType].current < 0) inventory[fuelType].current = 0;
        return this.set(this.STORAGE_KEYS.INVENTORY, inventory);
    },

    setInventory(fuelType, amount) {
        const inventory = this.getInventory();
        if (!inventory[fuelType]) return false;
        inventory[fuelType].current = amount;
        return this.set(this.STORAGE_KEYS.INVENTORY, inventory);
    },

    // Process fuel request (approve and dispense)
    processFuelRequest(requestId, officerId, actualLiters) {
        const request = this.getRequestById(requestId);
        if (!request) return { success: false, message: 'ไม่พบคำขอ' };

        const inventory = this.getInventory();
        if (inventory[request.fuelType].current < actualLiters) {
            return { success: false, message: 'น้ำมันคงเหลือไม่เพียงพอ' };
        }

        // Update request status
        this.updateRequest(requestId, {
            status: 'completed',
            approvedBy: officerId,
            approvedDate: Utils.getCurrentDateTime(),
            actualLiters: actualLiters
        });

        // Deduct from inventory
        this.updateInventory(request.fuelType, -actualLiters);

        // Add transaction record
        this.addTransaction({
            requestId: requestId,
            fuelType: request.fuelType,
            liters: actualLiters,
            vehiclePlate: request.vehiclePlate,
            requesterId: request.requesterId,
            requesterName: request.requesterName,
            officerId: officerId,
            type: 'dispense'
        });

        return { success: true, message: 'จ่ายน้ำมันสำเร็จ' };
    },

    // Add fuel to inventory
    addFuelToInventory(fuelType, liters, officerId, note = '') {
        this.updateInventory(fuelType, liters);
        this.addTransaction({
            fuelType: fuelType,
            liters: liters,
            officerId: officerId,
            type: 'receive',
            note: note
        });
        return { success: true, message: 'เพิ่มน้ำมันสำเร็จ' };
    },

    // Reports
    getMonthlyReport(year, month) {
        const transactions = this.getTransactions();
        return transactions.filter(t => {
            const d = new Date(t.transactionDate);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    },

    getSummaryStats() {
        const requests = this.getRequests();
        const inventory = this.getInventory();
        return {
            totalRequests: requests.length,
            pendingRequests: requests.filter(r => r.status === 'pending').length,
            completedToday: requests.filter(r => r.status === 'completed' && Utils.formatDateForInput(r.approvedDate) === Utils.formatDateForInput(new Date())).length,
            inventory: inventory
        };
    },

    // Export all data
    exportAllData() {
        return {
            users: this.getUsers(),
            requests: this.getRequests(),
            transactions: this.getTransactions(),
            inventory: this.getInventory(),
            exportedAt: Utils.getCurrentDateTime()
        };
    },

    // Import data
    importData(data) {
        if (data.users) this.set(this.STORAGE_KEYS.USERS, data.users);
        if (data.requests) this.set(this.STORAGE_KEYS.REQUESTS, data.requests);
        if (data.transactions) this.set(this.STORAGE_KEYS.TRANSACTIONS, data.transactions);
        if (data.inventory) this.set(this.STORAGE_KEYS.INVENTORY, data.inventory);
        return true;
    },

    // Reset to defaults
    resetData() {
        this.set(this.STORAGE_KEYS.USERS, this.getDefaultUsers());
        this.set(this.STORAGE_KEYS.INVENTORY, this.getDefaultInventory());
        this.set(this.STORAGE_KEYS.REQUESTS, []);
        this.set(this.STORAGE_KEYS.TRANSACTIONS, []);
    }
};

// Initialize on load
DataManager.init();
window.DataManager = DataManager;
