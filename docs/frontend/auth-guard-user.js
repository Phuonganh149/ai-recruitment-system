/* ═══════════════════════════════════════════════════════
   auth-guard-user.js — Bảo vệ tất cả trang User
═══════════════════════════════════════════════════════ */
(function () {
    document.documentElement.style.visibility = 'hidden';

    const raw  = localStorage.getItem('cvms_user');
    const token = localStorage.getItem('cvms_token') || '';
    let user = null;
    try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }

    if (!user || !token || !isSessionValid(token)) {
        localStorage.removeItem('cvms_user');
        localStorage.removeItem('cvms_token');
        window.location.replace('../../login.html');
        return;
    }
    if (user.role === 'admin') {
        window.location.replace('../../admin/pages/dashboard.html');
        return;
    }
    if (user.role === 'company') {
        window.location.replace('../../company/pages/dashboard.html');
        return;
    }

    // ✅ FIX: Hiện trang ngay khi đã xác nhận là user hợp lệ
    document.documentElement.style.visibility = 'visible';

    document.addEventListener('DOMContentLoaded', () => {
        const initials = user.name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        document.querySelectorAll('.avatar').forEach(el => el.textContent = initials);
        const nameEl = document.querySelector('.avatar-info p');
        const roleEl = document.querySelector('.avatar-info span');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent  = user.email;

        const topbarAvatar = document.querySelector('.topbar-actions .avatar');
        if (topbarAvatar) topbarAvatar.textContent = initials;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn đăng xuất?')) {
                    logout(token);
                    window.location.href = '../../login.html';
                }
            });
        }
    });

    function isSessionValid(token) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/api/auth/me', false);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(null);
            if (xhr.status >= 400) return false;
            const data = JSON.parse(xhr.responseText || '{}');
            return !!data.user && data.user.role !== 'admin';
        } catch {
            return false;
        }
    }

    function logout(token) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/auth/logout', false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send('{}');
        } catch {}
        localStorage.removeItem('cvms_user');
        localStorage.removeItem('cvms_token');
    }
})();
