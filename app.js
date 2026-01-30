/**
 * Fuel Management System - Main Application
 */

const App = {
    currentPage: '',

    init() {
        // Check authentication
        if (!Auth.requireLogin()) return;

        // Initialize components
        this.initSidebar();
        this.initUserInfo();
        this.setCurrentPage();
        this.initTheme();
    },

    initSidebar() {
        const user = Auth.getCurrentUser();
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Build navigation based on role
        const navItems = this.getNavItems(user.role);
        const navMenu = sidebar.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.innerHTML = navItems.map(item => {
                if (item.divider) return '<li class="nav-divider"></li>';
                const isActive = window.location.pathname.includes(item.href) ? 'active' : '';
                return `<li class="nav-item"><a href="${item.href}" class="nav-link ${isActive}"><i class="fas ${item.icon}"></i><span>${item.label}</span></a></li>`;
            }).join('');
        }

        // Mobile menu toggle
        const toggle = document.querySelector('.mobile-menu-toggle');
        const overlay = document.querySelector('.sidebar-overlay');
        if (toggle) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay?.classList.toggle('active');
            });
        }
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    },

    getNavItems(role) {
        const items = [
            { href: 'dashboard.html', icon: 'fa-home', label: 'หน้าหลัก' },
            { href: 'request.html', icon: 'fa-gas-pump', label: 'เบิกน้ำมัน' }
        ];

        if (role === 'admin' || role === 'officer') {
            items.push({ href: 'approve.html', icon: 'fa-check-circle', label: 'อนุมัติ/จ่าย' });
            items.push({ href: 'vehicles.html', icon: 'fa-car', label: 'ทะเบียนรถ' });
            items.push({ href: 'history.html', icon: 'fa-user-clock', label: 'ประวัติผู้เบิก' });
        }

        items.push({ divider: true });
        items.push({ href: 'reports.html', icon: 'fa-chart-bar', label: 'รายงาน' });

        if (role === 'admin') {
            items.push({ href: 'users.html', icon: 'fa-users', label: 'จัดการผู้ใช้' });
            items.push({ href: 'settings.html', icon: 'fa-cog', label: 'ตั้งค่า' });
        }

        return items;
    },

    initUserInfo() {
        const user = Auth.getCurrentUser();
        const userInfo = document.querySelector('.user-info');
        if (userInfo && user) {
            const initials = user.name.charAt(0);
            userInfo.innerHTML = `
                <div class="user-avatar">${initials}</div>
                <div><div class="user-name">${user.name}</div><div class="user-role">${Utils.getRoleName(user.role)}</div></div>
            `;
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        }
    },

    setCurrentPage() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop().replace('.html', '');
        this.currentPage = pageName;
        document.body.setAttribute('data-page', pageName);
    },

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
    },

    toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
