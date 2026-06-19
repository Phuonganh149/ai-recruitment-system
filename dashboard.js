let companyDashboardData = { jobs: [], applications: [], walletTransactions: [], topups: [], unlocked: [], unlockQuote: null };

const stages = [
  ['new', 'Mới'],
  ['screening', 'Sàng lọc'],
  ['interview', 'Phỏng vấn'],
  ['offer', 'Offer'],
  ['hired', 'Nhận việc'],
  ['rejected', 'Từ chối'],
];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function money(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function badge(label, cls = 'badge-blue') {
  return `<span class="badge ${cls}">${escapeHTML(label)}</span>`;
}

function renderStats() {
  const jobs = companyDashboardData.jobs || [];
  const apps = companyDashboardData.applications || [];
  setText('stat-wallet', money(companyDashboardData.wallet?.balance || 0));
  setText('stat-jobs', jobs.filter(job => job.active !== false).length);
  setText('stat-applications', apps.length);
  setText('stat-unlocked', apps.filter(app => app.unlocked).length);
  setText('stat-unlock-fee', companyDashboardData.unlockQuote ? money(companyDashboardData.unlockQuote.fee) : '1%-2% v?');
  const sub = companyDashboardData.activeSubscription;
  setText('stat-plan', sub ? String(sub.plan_id || sub.planId || 'G?i') : '?');
  const used = Number(sub?.posts_used || 0);
  const limit = Number(sub?.posts_limit || sub?.post_limit || 0);
  setText('stat-posts', sub ? `?? d?ng ${used}/${limit} tin, c?n ${Math.max(0, limit - used)}` : 'Ch?a c? g?i ho?t ??ng');
  renderCompanyStatus();
}



function renderCompanyStatus() {
  const el = document.getElementById('companyStatusStrip');
  if (!el) return;
  const user = companyDashboardData.user || JSON.parse(localStorage.getItem('cvms_user') || '{}');
  const status = String(user.companyStatus || user.company?.status || companyDashboardData.companyStatus || '').toLowerCase() || 'pending';
  const labels = { pending: 'Ch? x?c minh', verified: '?? x?c minh', active: '?? x?c minh', rejected: 'B? t? ch?i', suspended: 'T?m kh?a', blocked: 'B? kh?a' };
  const locked = !['verified', 'active'].includes(status);
  el.className = `company-status-strip ${locked ? 'locked' : 'ok'}`;
  el.innerHTML = `<strong>Tr?ng th?i doanh nghi?p: ${escapeHTML(labels[status] || status)}</strong>${locked ? '<span> B?n ch?a th? ??ng tin, n?p v? ho?c m? CV cho t?i khi ???c admin x?c minh.</span>' : '<span> B?n c? th? s? d?ng c?c ch?c n?ng doanh nghi?p.</span>'}`;
}

function renderJobs() {
  const tbody = document.getElementById('companyJobBody');
  const jobs = companyDashboardData.jobs || [];
  if (!tbody) return;
  if (!jobs.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Chưa có tin nào. Hãy tạo tin đầu tiên.</td></tr>';
    return;
  }
  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td>
        <div class="cname">${escapeHTML(job.title)}</div>
        <div class="cpos">${escapeHTML(job.dept || 'Khác')} - ${escapeHTML(job.location || '')}</div>
      </td>
      <td>${Number(job.applicants || 0)}</td>
      <td>${badge(job.status || 'Chờ kiểm duyệt', job.active === false ? 'badge-amber' : 'badge-green')}</td>
      <td>
        <div class="inline-actions">
          <button class="action-btn" onclick="editJob(${Number(job.id)})"><i class="ti ti-pencil"></i></button>
          <button class="action-btn" onclick="setJobStatus(${Number(job.id)}, 'active')">Đăng</button>
          <button class="action-btn" onclick="setJobStatus(${Number(job.id)}, 'pause')">Dừng</button>
          <button class="action-btn danger" onclick="setJobStatus(${Number(job.id)}, 'close')">Đóng</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderAiCell(app) {
  if (app.aiScore === null || app.aiScore === undefined || app.aiScore === '') return '<span class="muted">Chưa chấm</span>';
  const score = Number(app.aiScore || 0);
  const cls = score >= 80 ? 'score-good' : score >= 60 ? 'score-mid' : 'score-low';
  return `<div class="ai-pill ${cls}">${score}/100<span>${escapeHTML(app.aiFitLevel || 'AI')}</span></div>`;
}

function renderApplications() {
  const tbody = document.getElementById('companyApplicationBody');
  const apps = companyDashboardData.applications || [];
  if (!tbody) return;
  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Chưa có hồ sơ ứng tuyển cho tin của công ty.</td></tr>';
    return;
  }
  tbody.innerHTML = apps.map(app => `
    <tr>
      <td>
        <div class="cname">${escapeHTML(app.unlocked ? app.userName : app.candidateCode)}</div>
        <div class="cpos">${escapeHTML(app.unlocked ? app.userEmail : 'Hồ sơ ẩn danh')}</div>
      </td>
      <td>
        <div>${escapeHTML(app.jobTitle || 'Chưa rõ')}</div>
        <div class="cpos">${escapeHTML(app.date || '')}</div>
      </td>
      <td>${renderAiCell(app)}</td>
      <td>
        <select class="filter-select" onchange="movePipeline(${Number(app.id)}, this.value)">
          ${stages.map(([value, label]) => `<option value="${value}" ${app.pipelineStage === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <div class="interview-mini">
          <input type="datetime-local" id="iv-${Number(app.id)}" value="${toDatetimeInput(app.interviewAt)}">
          <button class="action-btn" onclick="saveInterview(${Number(app.id)})"><i class="ti ti-calendar-plus"></i></button>
        </div>
      </td>
      <td>
        ${app.unlocked
          ? `<button class="add-btn small" onclick="openCv(${Number(app.id)})"><i class="ti ti-file-cv"></i> Xem CV</button>`
          : `<button class="add-btn small" onclick="unlockCv(${Number(app.id)})"><i class="ti ti-lock-open"></i> Mở khóa</button>`}
        ${app.unlockFee ? `<div class="cpos">Đã trừ ${money(app.unlockFee)}</div>` : '<div class="cpos">Phí: 1%-2% số dư ví</div>'}
      </td>
    </tr>
  `).join('');
}

function renderWallet() {
  const tbody = document.getElementById('walletTransactionBody');
  const rows = companyDashboardData.walletTransactions || [];
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Chưa có giao dịch ví.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(tx => `
    <tr>
      <td>${escapeHTML(tx.type || '')}</td>
      <td class="${Number(tx.amount || 0) < 0 ? 'tx-negative' : 'tx-positive'}">${money(tx.amount)}</td>
      <td>${money(tx.balanceAfter)}</td>
      <td>${escapeHTML(tx.createdAt || '')}</td>
    </tr>
  `).join('');
}



function renderUnlockedCvs() {
  const tbody = document.getElementById('unlockedCvBody');
  if (!tbody) return;
  const apps = (companyDashboardData.applications || []).filter(app => app.unlocked);
  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Ch?a m? CV n?o. Khi m? CV th?nh c?ng, h? s? s? xu?t hi?n ? ??y.</td></tr>';
    return;
  }
  tbody.innerHTML = apps.map(app => `
    <tr>
      <td><div class="cname">${escapeHTML(app.userName || app.candidateCode)}</div><div class="cpos">${escapeHTML(app.userEmail || '')}</div></td>
      <td>${escapeHTML(app.jobTitle || '')}</td>
      <td>${money(app.unlockFee || 0)}</td>
      <td>${escapeHTML(app.unlockedAt || '')}</td>
      <td><button class="add-btn small" onclick="openCv(${Number(app.id)})"><i class="ti ti-file-cv"></i> Xem l?i CV</button></td>
    </tr>
  `).join('');
}

function renderPipeline() {
  const board = document.getElementById('pipelineBoard');
  const apps = companyDashboardData.applications || [];
  if (!board) return;
  board.innerHTML = stages.map(([value, label]) => {
    const list = apps.filter(app => (app.pipelineStage || 'new') === value);
    return `
      <div class="pipeline-col">
        <div class="pipeline-head">${escapeHTML(label)} <span>${list.length}</span></div>
        ${list.map(app => `
          <div class="pipeline-card">
            <strong>${escapeHTML(app.unlocked ? app.userName : app.candidateCode)}</strong>
            <span>${escapeHTML(app.jobTitle || '')}</span>
          </div>
        `).join('') || '<div class="pipeline-empty">Trống</div>'}
      </div>
    `;
  }).join('');
}

function renderInterviews() {
  const tbody = document.getElementById('interviewBody');
  const rows = (companyDashboardData.applications || []).filter(app => app.interviewAt);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Chưa có lịch phỏng vấn.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(app => `
    <tr>
      <td>${escapeHTML(app.unlocked ? app.userName : app.candidateCode)}</td>
      <td>${escapeHTML(app.jobTitle || '')}</td>
      <td>${escapeHTML(app.interviewAt || '')}</td>
      <td>${escapeHTML(app.interviewNote || '')}</td>
    </tr>
  `).join('');
}

function toDatetimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function loadDashboard() {
  try {
    companyDashboardData = CVMS.getCompanyDashboard();
    try { companyDashboardData.unlockQuote = CVMS.getCvUnlockQuote(); } catch { companyDashboardData.unlockQuote = null; }
    const user = companyDashboardData.user || JSON.parse(localStorage.getItem('cvms_user') || '{}');
    setText('companyNameTitle', user.companyName || user.name || 'Doanh nghiệp');
    setText('companyMiniName', user.companyName || user.name || 'Doanh nghiệp');
    renderStats();
    renderJobs();
    renderApplications();
    renderWallet();
    renderUnlockedCvs();
    renderPipeline();
    renderInterviews();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function focusJobForm() {
  document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('job-title')?.focus();
}

function resetJobForm() {
  document.getElementById('companyJobForm')?.reset();
  document.getElementById('job-id').value = '';
}

function editJob(id) {
  const job = (companyDashboardData.jobs || []).find(item => Number(item.id) === Number(id));
  if (!job) return;
  document.getElementById('job-id').value = job.id;
  document.getElementById('job-title').value = job.title || '';
  document.getElementById('job-dept').value = job.dept || '';
  document.getElementById('job-location').value = job.location || '';
  document.getElementById('job-salary').value = job.salary || '';
  document.getElementById('job-deadline').value = job.deadline || '';
  document.getElementById('job-qty').value = job.qty || 1;
  document.getElementById('job-tags').value = Array.isArray(job.tags) ? job.tags.join(', ') : '';
  focusJobForm();
}

function collectJobPayload() {
  return {
    title: document.getElementById('job-title').value.trim(),
    dept: document.getElementById('job-dept').value.trim(),
    location: document.getElementById('job-location').value.trim(),
    salary: document.getElementById('job-salary').value.trim() || 'Thỏa thuận',
    deadline: document.getElementById('job-deadline').value.trim(),
    qty: Number(document.getElementById('job-qty').value || 1),
    tags: document.getElementById('job-tags').value.split(',').map(item => item.trim()).filter(Boolean),
  };
}

function saveCompanyJob(event) {
  event.preventDefault();
  try {
    const id = document.getElementById('job-id').value;
    const payload = collectJobPayload();
    if (!payload.title || !payload.dept || !payload.location) {
      showCompanyToast('Vui lòng nhập đủ vị trí, ngành và địa điểm.', 'error');
      return;
    }
    if (id) CVMS.updateCompanyJob(id, payload);
    else CVMS.addCompanyJob(payload);
    resetJobForm();
    showCompanyToast('Đã lưu tin. Tin mới cần admin kiểm duyệt trước khi hiển thị.');
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function setJobStatus(id, status) {
  try {
    CVMS.updateCompanyJobStatus(id, status);
    showCompanyToast('Đã cập nhật trạng thái tin.');
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function submitTopup(event) {
  event.preventDefault();
  try {
    const amount = Number(document.getElementById('topup-amount').value || 0);
    const note = document.getElementById('topup-note').value.trim();
    if (!document.getElementById('topup-confirm')?.checked) {
      showCompanyToast('Vui l?ng tick x?c nh?n giao d?ch n?p v? tr??c khi g?i.', 'error');
      return;
    }
    CVMS.requestWalletTopup({ amount, note, confirmed: true });
    event.target.reset();
    showCompanyToast('Đã gửi yêu cầu nạp ví. Vui lòng chuyển khoản theo thông tin admin.');
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function unlockCv(appId) {
  if (!confirm('Mở khóa hồ sơ này sẽ trừ 1%-2% số dư ví hiện tại. Tiếp tục?')) return;
  try {
    const access = CVMS.unlockApplication(appId, { confirmed: true });
    showCompanyToast(access.alreadyUnlocked ? 'CV này đã mở trước đó, không trừ phí lại.' : `Đã mở khóa CV, phí ${money(access.feeAmount)}.`);
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function openCv(appId) {
  try {
    const result = CVMS.getApplicationCvUrl(appId);
    if (!result.url) {
      showCompanyToast('Chưa tạo được link CV riêng tư.', 'error');
      return;
    }
    window.open(result.url, '_blank', 'noopener');
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function movePipeline(appId, stage) {
  try {
    CVMS.updateCompanyPipeline(appId, { stage });
    showCompanyToast('Đã cập nhật pipeline.');
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}

function saveInterview(appId) {
  try {
    const interviewAt = document.getElementById(`iv-${Number(appId)}`)?.value || '';
    CVMS.updateCompanyPipeline(appId, { stage: 'interview', interviewAt, interviewNote: 'Lịch phỏng vấn do doanh nghiệp đặt' });
    showCompanyToast('Đã lưu lịch phỏng vấn.');
    loadDashboard();
  } catch (error) {
    showCompanyToast(error.message, 'error');
  }
}



function activateCompanyTab(tabId, pushHash = true) {
  const target = tabId || 'jobs';
  document.querySelectorAll('[data-company-section]').forEach(section => {
    section.classList.toggle('active', section.dataset.companySection === target);
  });
  document.querySelectorAll('[data-company-tab]').forEach(link => {
    link.classList.toggle('active', link.dataset.companyTab === target);
  });
  if (pushHash) history.replaceState(null, '', `#${target}`);
}

function bindCompanyTabs() {
  document.querySelectorAll('[data-company-tab]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      activateCompanyTab(link.dataset.companyTab);
    });
  });
  const initial = (location.hash || '#jobs').replace('#', '');
  activateCompanyTab(initial, false);
}

function showCompanyToast(msg, type = 'success') {
  let t = document.getElementById('company-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'company-toast';
    t.className = 'admin-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `admin-toast ${type === 'error' ? 'error' : ''}`;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('companyJobForm')?.addEventListener('submit', saveCompanyJob);
  document.getElementById('walletTopupForm')?.addEventListener('submit', submitTopup);
  loadDashboard();
  bindCompanyTabs();
  if (typeof initNotifUI === 'function') initNotifUI('company');
});
