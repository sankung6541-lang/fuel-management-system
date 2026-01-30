/**
 * Fuel Management System - Utilities
 */

const Utils = {
    generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}${random}`;
    },

    formatDate(date, includeTime = false) {
        const d = new Date(date);
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const day = d.getDate();
        const month = thaiMonths[d.getMonth()];
        const year = d.getFullYear() + 543;
        let result = `${day} ${month} ${year}`;
        if (includeTime) {
            result += ` ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
        }
        return result;
    },

    formatDateForInput(date) {
        return new Date(date).toISOString().split('T')[0];
    },

    formatNumber(num, decimals = 0) {
        return Number(num).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    },

    getFuelTypeName(type) {
        const names = { 'diesel': 'ดีเซล', 'benzin95': 'เบนซิน 95', 'benzin91': 'เบนซิน 91' };
        return names[type] || type;
    },

    getStatusName(status) {
        const names = { 'pending': 'รออนุมัติ', 'approved': 'อนุมัติแล้ว', 'rejected': 'ปฏิเสธ', 'completed': 'จ่ายแล้ว' };
        return names[status] || status;
    },

    getRoleName(role) {
        const names = { 'admin': 'ผู้ดูแลระบบ', 'officer': 'เจ้าหน้าที่น้ำมัน', 'requester': 'ผู้เบิก' };
        return names[role] || role;
    },

    showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const colors = { 'success': '#10b981', 'danger': '#ef4444', 'warning': '#f59e0b', 'info': '#3b82f6' };
        const icons = { 'success': 'fa-check-circle', 'danger': 'fa-exclamation-circle', 'warning': 'fa-exclamation-triangle', 'info': 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;padding:1rem 1.5rem;background:${colors[type]};color:white;border-radius:0.5rem;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);display:flex;align-items:center;gap:0.75rem;z-index:9999;animation:slideIn 0.3s ease;`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
    },

    confirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `<div class="modal" style="max-width:400px"><div class="modal-header"><h3 class="modal-title">ยืนยัน</h3></div><div class="modal-body"><p>${message}</p></div><div class="modal-footer"><button class="btn btn-secondary" id="confirmCancel">ยกเลิก</button><button class="btn btn-primary" id="confirmOk">ยืนยัน</button></div></div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); resolve(true); };
            overlay.querySelector('#confirmCancel').onclick = () => { overlay.remove(); resolve(false); };
        });
    },

    exportToCSV(data, filename = 'export.csv') {
        if (!data || !data.length) { this.showToast('ไม่มีข้อมูล', 'warning'); return; }
        const headers = Object.keys(data[0]);
        const csv = [headers.join(','), ...data.map(row => headers.map(h => { let c = row[h] ?? ''; if (typeof c === 'string' && (c.includes(',') || c.includes('"'))) c = `"${c.replace(/"/g, '""')}"`; return c; }).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        this.showToast('ส่งออกสำเร็จ', 'success');
    },

    printReport(title, content) {
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:'Sarabun',sans-serif;padding:20px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>${title}</h1><div style="text-align:right;color:#666">พิมพ์เมื่อ: ${this.formatDate(new Date(), true)}</div>${content}</body></html>`);
        w.document.close();
        w.print();
    },

    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    getCurrentDateTime() { return new Date().toISOString(); },

    getMonthRange(date = new Date()) {
        return { start: new Date(date.getFullYear(), date.getMonth(), 1), end: new Date(date.getFullYear(), date.getMonth() + 1, 0) };
    }
};

// Toast animation styles
const style = document.createElement('style');
style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}`;
document.head.appendChild(style);

window.Utils = Utils;
