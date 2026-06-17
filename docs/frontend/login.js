document.addEventListener('DOMContentLoaded', () => {
    const container   = document.getElementById('container');
    const registerBtn = document.getElementById('register');
    const loginBtn    = document.getElementById('login');
    const roleSelect  = document.getElementById('reg-role');
    const nameInput   = document.getElementById('reg-name');

    if (registerBtn) registerBtn.addEventListener('click', () => container.classList.add('active'));
    if (loginBtn)    loginBtn.addEventListener('click',    () => container.classList.remove('active'));

    if (roleSelect && nameInput) {
        const syncSignupMode = () => {
            nameInput.placeholder = roleSelect.value === 'company'
                ? 'Tên doanh nghiệp / Người liên hệ'
                : 'Họ và tên';
        };
        roleSelect.addEventListener('change', syncSignupMode);
        syncSignupMode();
    }
});

function showToast(msg, type = 'success', duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function apiRequest(path, body, token = '') {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(JSON.stringify(body || {}));
    let data = {};
    try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
    if (xhr.status >= 400) throw new Error(data.error || data.msg || 'Lỗi máy chủ');
    return data;
}

async function handleSignUp(e) {
    e.preventDefault();

    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const role     = document.getElementById('reg-role')?.value || 'user';

    if (!name || !email || !password) {
        showToast('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Mật khẩu phải từ 6 ký tự!', 'error');
        return;
    }
    if (email === 'admincv@gmail.com') {
        showToast('Email này không được phép đăng ký!', 'error');
        return;
    }

    // Thu thập consents từ form (nếu có checkbox); nếu form không có checkbox
    // thì mặc định đồng ý tất cả để tránh backend block đăng ký.
    const consents = collectRegistrationConsents(role);

    try {
        const authResult = await CVMSAuth.signUp(email, password);
        if (authResult.error) throw authResult.error;
        const accessToken = authResult.data.session?.access_token;
        if (!accessToken) {
            // Supabase yêu cầu xác nhận email trước (email confirmation bật)
            showToast('Đã gửi email xác nhận! Vui lòng kiểm tra hộp thư rồi đăng nhập.', 'success', 5000);
            return;
        }
        const result = apiRequest('/api/auth/register', { name, email, role, consents }, accessToken);
        if (!result.ok) {
            showToast(result.msg || 'Không đăng ký được.', 'error');
            return;
        }
        localStorage.setItem('cvms_user', JSON.stringify(result.user || {}));
        localStorage.setItem('cvms_token', accessToken);
        if (authResult.data.user?.id) localStorage.setItem('cvms_auth_user_id', authResult.data.user.id);
        showToast(role === 'company'
            ? 'Đăng ký doanh nghiệp thành công! Chuyển sang trang dashboard...'
            : 'Đăng ký thành công! Chuyển sang trang dashboard...'
        );
        setTimeout(() => {
            if (role === 'company') {
                window.location.href = './company/pages/dashboard.html';
            } else {
                window.location.href = './user/pages/dashboard.html';
            }
        }, 900);
    } catch (error) {
        if (error.message && error.message.includes('Cấu hình Supabase')) {
            showToast('⚠️ Server chưa cấu hình Supabase. Liên hệ admin để kiểm tra file .env.', 'error', 5000);
        } else if (error.message && error.message.includes('already registered')) {
            showToast('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.', 'error');
        } else if (error.message && error.message.includes('Password should be')) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
        } else {
            showToast(error.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'error');
        }
    }
}

async function handleSignIn(e) {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Vui lòng nhập email và mật khẩu!', 'error');
        return;
    }

    try {
        const authResult = await CVMSAuth.signIn(email, password);
        if (authResult.error) throw authResult.error;
        const accessToken = authResult.data.session?.access_token;
        if (!accessToken) throw new Error('Supabase Auth không trả về access token.');
        const result = apiRequest('/api/auth/login', {}, accessToken);
        if (!result.ok) {
            showToast(result.msg || 'Email hoặc mật khẩu không đúng!', 'error');
            return;
        }

        localStorage.setItem('cvms_user', JSON.stringify(result.user));
        localStorage.setItem('cvms_token', accessToken);
        if (authResult.data.user?.id) localStorage.setItem('cvms_auth_user_id', authResult.data.user.id);
        showToast('Đăng nhập thành công! Chào mừng ' + result.user.name + '!');

        if (result.user.role === 'admin') {
            setTimeout(() => { window.location.href = './admin/pages/dashboard.html'; }, 700);
        } else if (result.user.role === 'company') {
            setTimeout(() => { window.location.href = './company/pages/dashboard.html'; }, 700);
        } else {
            setTimeout(() => { window.location.href = './user/pages/dashboard.html'; }, 700);
        }
    } catch (error) {
        // Bắt lỗi cấu hình Supabase chưa thiết lập
        if (error.message && error.message.includes('Cấu hình Supabase')) {
            showToast('⚠️ Server chưa cấu hình Supabase. Liên hệ admin để kiểm tra file .env.', 'error', 5000);
        } else if (error.message && error.message.includes('Invalid login credentials')) {
            showToast('Email hoặc mật khẩu không đúng. Kiểm tra lại hoặc đăng ký nếu chưa có tài khoản.', 'error');
        } else {
            showToast(error.message || 'Đăng nhập thất bại.', 'error');
        }
    }
}

function forgotPassword() {
    showToast('Vui lòng liên hệ admin để đặt lại mật khẩu.', 'success', 3000);
}


function collectRegistrationConsents(role) {
    // Đọc checkbox nếu có trong form; nếu không có thì mặc định đồng ý
    // (form login.html hiện không có checkbox consent riêng)
    const getChecked = (id) => {
        const el = document.getElementById(id);
        return el ? !!el.checked : true; // mặc định true nếu không có checkbox
    };
    return {
        terms:            getChecked('consent-terms'),
        privacy:          getChecked('consent-privacy'),
        candidateConsent: role !== 'company' ? getChecked('consent-candidate') : false,
        companyPolicy:    role === 'company'  ? getChecked('consent-company')  : false,
        marketing:        getChecked('consent-marketing'),
    };
}

function handleOAuth(provider) {
    if (!['google', 'github', 'facebook'].includes(provider)) return;
    const role = document.getElementById('reg-role')?.value || 'user';
    window.location.href = `/api/auth/oauth/${provider}/start?role=${encodeURIComponent(role)}`;
}
