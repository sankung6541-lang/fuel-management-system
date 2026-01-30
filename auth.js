/**
 * Fuel Management System - Authentication
 */

const Auth = {
    SESSION_KEY: 'fuel_current_user',

    login(username, password) {
        const user = DataManager.getUserByUsername(username);
        if (!user) return { success: false, message: 'ไม่พบผู้ใช้นี้ในระบบ' };
        if (!user.active) return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
        if (user.password !== password) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

        const session = { id: user.id, username: user.username, name: user.name, role: user.role, loginAt: Utils.getCurrentDateTime() };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return { success: true, message: 'เข้าสู่ระบบสำเร็จ', user: session };
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        try {
            const session = sessionStorage.getItem(this.SESSION_KEY);
            return session ? JSON.parse(session) : null;
        } catch { return null; }
    },

    isLoggedIn() { return this.getCurrentUser() !== null; },

    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (Array.isArray(role)) return role.includes(user.role);
        return user.role === role;
    },

    isAdmin() { return this.hasRole('admin'); },
    isOfficer() { return this.hasRole(['admin', 'officer']); },

    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    requireRole(role) {
        if (!this.requireLogin()) return false;
        if (!this.hasRole(role)) {
            Utils.showToast('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'danger');
            window.location.href = 'pages/dashboard.html';
            return false;
        }
        return true;
    },

    changePassword(oldPassword, newPassword) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, message: 'กรุณาเข้าสู่ระบบ' };

        const fullUser = DataManager.getUserById(user.id);
        if (fullUser.password !== oldPassword) return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };

        DataManager.updateUser(user.id, { password: newPassword });
        return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
    },

    register(userData) {
        if (DataManager.getUserByUsername(userData.username)) {
            return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
        }
        DataManager.addUser(userData);
        return { success: true, message: 'ลงทะเบียนสำเร็จ' };
    }
};

window.Auth = Auth;
