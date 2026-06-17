document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('cvms_user') || 'null');
  if (!user) {
    window.location.href = '../../login.html';
    return;
  }

  setValue('p-name', user.name || '');
  setValue('p-email', user.email || '');
  setValue('p-phone', user.phone || '');
  setValue('p-address', user.address || '');
  setValue('p-bio', user.bio || '');

  renderApplicationHistory(user.email);
  renderCurrentCV(user.email);

  document.getElementById('save-profile')?.addEventListener('click', () => saveProfile(user));
  setupCVUpload(user.email);

  if (typeof initNotifUI === 'function') initNotifUI('user');
});

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getSelectedIndustries() {
  return Array.from(document.querySelectorAll('input[name="industries"]:checked, .industry-checkbox:checked'))
    .map(item => item.value || item.dataset.value || item.parentElement?.textContent?.trim())
    .filter(Boolean);
}

function saveProfile(user) {
  try {
    const patch = {
      name: document.getElementById('p-name')?.value.trim() || user.name || '',
      phone: document.getElementById('p-phone')?.value.trim() || '',
      address: document.getElementById('p-address')?.value.trim() || '',
      bio: document.getElementById('p-bio')?.value.trim() || '',
    };
    const result = CVMS.updateProfile(patch);
    const nextUser = { ...user, ...(result || patch) };
    localStorage.setItem('cvms_user', JSON.stringify(nextUser));
    showToast('Đã lưu thông tin hồ sơ thành công!');
  } catch (error) {
    showToast(error.message || 'Không lưu được hồ sơ.', 'error');
  }
}

function setupCVUpload(email) {
  const dropZone = document.getElementById('cv-drop-zone');
  const fileInput = document.getElementById('cv-file-input');

  dropZone?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('dragover', event => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    if (event.dataTransfer.files[0]) handleFileUpload(event.dataTransfer.files[0], email);
  });
  fileInput?.addEventListener('change', event => {
    if (event.target.files[0]) handleFileUpload(event.target.files[0], email);
  });
}

function handleFileUpload(file, email) {
  const allowedExt = ['pdf'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowedExt.includes(ext)) return showToast('Chỉ hỗ trợ PDF, Word, JPG, PNG', 'error');
  if (file.size > 5 * 1024 * 1024) return showToast('File không được vượt quá 5MB', 'error');

  const reader = new FileReader();
  reader.onload = () => {
    try {
      CVMS.saveCv(email, {
        name: file.name,
        type: file.type || 'application/octet-stream',
        ext,
        size: file.size,
        dataUrl: reader.result,
        uploadedAt: new Date().toLocaleString('vi-VN'),
        industries: getSelectedIndustries(),
      });
      showToast('Upload CV thành công. CV đã được lưu riêng tư.');
      renderCurrentCV(email);
    } catch (error) {
      showToast(error.message || 'Upload CV thất bại.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

function renderCurrentCV(email) {
  const container = document.getElementById('cv-current');
  if (!container) return;

  let response = null;
  try {
    response = CVMS.getCv(email);
  } catch {
    response = null;
  }
  const cvData = response?.cv || response || null;

  if (!cvData) {
    container.innerHTML = '<p style="color:#64748b">Chưa có CV nào được tải lên.</p>';
    return;
  }

  const sizeKB = (Number(cvData.size || 0) / 1024).toFixed(1);
  const viewUrl = response?.url || '';
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
      <span style="font-size:30px">${cvData.ext === 'pdf' ? 'PDF' : 'CV'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(cvData.name || 'CV của tôi')}</div>
        <div style="font-size:13px; color:#64748b">${sizeKB} KB - ${escapeHTML(cvData.uploadedAt || '')}</div>
      </div>
      ${viewUrl ? `<button onclick="previewCV('${encodeURIComponent(viewUrl)}', '${escapeHTML(cvData.name || 'CV')}')" style="padding:8px 16px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer;">Xem</button>` : ''}
      <button onclick="deleteCV('${email}')" style="color:#ef4444; background:none; border:none; font-size:18px; cursor:pointer;">Xóa</button>
    </div>`;
}

function previewCV(encodedUrl, name) {
  const url = decodeURIComponent(encodedUrl);
  let modal = document.getElementById('cv-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cv-preview-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="background:white;width:min(1000px,96vw);height:min(820px,92vh);border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:12px">
          <strong id="cv-preview-title"></strong>
          <button onclick="closePreviewModal()" style="font-size:22px;background:none;border:none;cursor:pointer">x</button>
        </div>
        <iframe id="cv-preview-frame" style="flex:1;border:none"></iframe>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('cv-preview-title').textContent = name || 'CV';
  document.getElementById('cv-preview-frame').src = url;
  modal.style.display = 'flex';
}

function closePreviewModal() {
  const modal = document.getElementById('cv-preview-modal');
  if (modal) modal.style.display = 'none';
}

function deleteCV(email) {
  if (!confirm('Xóa CV này?')) return;
  try {
    CVMS.deleteCv(email);
    renderCurrentCV(email);
    showToast('Đã xóa CV.');
  } catch (error) {
    showToast(error.message || 'Không xóa được CV.', 'error');
  }
}

function renderApplicationHistory(email) {
  const apps = CVMS.getApplications().filter(a => a.userEmail === email);
  const tbody = document.getElementById('my-applications');
  if (!tbody) return;

  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#64748b">Chưa có đơn ứng tuyển nào.</td></tr>';
    return;
  }

  const statusClass = { 'Mới nộp': 'badge-blue', 'Đang xem xét': 'badge-amber', 'Phỏng vấn': 'badge-purple', 'Đã offer': 'badge-green', 'Từ chối': 'badge-red' };
  tbody.innerHTML = apps.slice().reverse().map(app => `
    <tr>
      <td><strong>${escapeHTML(app.jobTitle)}</strong><br><small>${escapeHTML(app.company)}</small></td>
      <td>${escapeHTML(app.location)}</td>
      <td>${escapeHTML(app.date)}</td>
      <td><span class="badge ${statusClass[app.status] || 'badge-blue'}">${escapeHTML(app.status)}</span></td>
      <td style="color:#64748b">${escapeHTML(app.adminNote || app.interviewNote || '-')}</td>
    </tr>
  `).join('');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function showToast(msg, type = 'success') {
  let toast = document.getElementById('u-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'u-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `u-toast show ${type === 'error' ? 'warn' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 2800);
}
