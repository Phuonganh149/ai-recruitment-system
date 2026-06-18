/* CVMS Shared API Layer
   Database thật chạy ở backend SQLite qua /api/*
   localStorage chỉ còn giữ phiên đăng nhập hiện tại.
*/

const CVMS = {
  getToken() {
    return localStorage.getItem('cvms_token') || '';
  },

  _request(method, path, body) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    const token = this.getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(body ? JSON.stringify(body) : null);
    let data = null;
    try { data = JSON.parse(xhr.responseText || 'null'); } catch { data = null; }
    if (xhr.status >= 400) {
      throw new Error((data && (data.error || data.msg || data.detail)) || `HTTP ${xhr.status}`);
    }
    return data;
  },

  getJobs() {
    return this._request('GET', '/api/jobs').jobs || [];
  },
  getCompanies() {
    return this._request('GET', '/api/companies').companies || [];
  },
  addCompany(company) {
    return this._request('POST', '/api/companies', company).company;
  },
  updateCompany(id, patch) {
    return this._request('PATCH', `/api/companies/${id}`, patch).company;
  },
  addJob(job) {
    return this._request('POST', '/api/jobs', job).job;
  },
  updateJob(id, patch) {
    return this._request('PATCH', `/api/jobs/${id}`, patch).job;
  },
  closeJob(id) {
    return this._request('POST', `/api/jobs/${id}/close`).job;
  },
  addCompanyJob(job) {
    return this._request('POST', '/api/company/jobs', job).job;
  },
  updateCompanyJob(id, patch) {
    return this._request('PATCH', `/api/company/jobs/${id}`, patch).job;
  },
  updateCompanyJobStatus(id, status) {
    return this._request('PATCH', `/api/company/jobs/${id}/status`, { status }).job;
  },

  getApplications() {
    return this._request('GET', '/api/applications').applications || [];
  },
  applyJob(jobId, userEmail, userName) {
    return this._request('POST', '/api/applications', { jobId, userEmail, userName });
  },
  updateApplicationStatus(appId, newStatus, adminNote = '') {
    return this._request('PATCH', `/api/applications/${appId}/status`, { status: newStatus, adminNote }).application;
  },
  updatePipelineStage(appId, stage) {
    return this._request('PATCH', `/api/applications/${appId}/pipeline`, { stage }).application;
  },
  shareApplicationWithCompany(appId, note = '') {
    return this._request('POST', `/api/applications/${appId}/share-company`, { note }).application;
  },
  updateCompanyApplicationFeedback(appId, feedback = '') {
    return this._request('PATCH', `/api/applications/${appId}/company-feedback`, { feedback }).application;
  },
  assessApplicationsBatch(options = {}) {
    return this._request('POST', '/api/applications/ai-assess-batch', options);
  },
  submitCompanyBooking(payload) {
    return this._request('POST', '/api/company-bookings', payload);
  },
  confirmCompanyBookingPayment(id, email) {
    return this._request('PATCH', `/api/company-bookings/${id}/payment`, { email });
  },
  getCompanyBookings() {
    return this._request('GET', '/api/company-bookings').bookings || [];
  },
  adminConfirmCompanyBooking(id) {
    return this._request('PATCH', `/api/company-bookings/${id}/admin-confirm`).booking;
  },
  rejectCompanyBooking(id, reason = '') {
    return this._request('PATCH', `/api/company-bookings/${id}/reject`, { reason }).booking;
  },
  createJobFromBooking(id, payload = {}) {
    return this._request('POST', `/api/company-bookings/${id}/create-job`, payload);
  },
  getCompanyDashboard() {
    return this._request('GET', '/api/company/dashboard');
  },
  requestWalletTopup(payload) {
    return this._request('POST', '/api/company/wallet-topups', payload).topup;
  },
  getCvUnlockQuote() {
    return this._request('GET', '/api/company/cv-unlock-quote').quote;
  },
  requestSubscription(planId) {
    return this._request('POST', '/api/company/subscriptions', { planId }).subscription;
  },
  requestRefund(payload) {
    return this._request('POST', '/api/company/refunds', payload).refund;
  },
  createDispute(payload) {
    return this._request('POST', '/api/company/disputes', payload).dispute;
  },
  unlockApplication(appId, payload = {}) {
    return this._request('POST', `/api/company/applications/${appId}/unlock`, payload).access;
  },
  getApplicationCvUrl(appId) {
    return this._request('GET', `/api/company/applications/${appId}/cv-url`);
  },
  updateCompanyPipeline(appId, payload) {
    return this._request('PATCH', `/api/applications/${appId}/pipeline`, payload).application;
  },
  getAdminFinance() {
    return this._request('GET', '/api/admin/finance');
  },
  adminConfirmWalletTopup(id) {
    return this._request('PATCH', `/api/admin/wallet-topups/${id}/confirm`).topup;
  },
  updateCommission(rate) {
    return this._request('PATCH', '/api/admin/commission', { rate }).setting;
  },
  adminConfirmSubscription(id) {
    return this._request('PATCH', `/api/admin/subscriptions/${id}/confirm`).subscription;
  },
  adminApproveRefund(id) {
    return this._request('PATCH', `/api/admin/refunds/${id}/approve`).refund;
  },
  moderateJob(id, decision, note = '') {
    return this._request('PATCH', `/api/admin/jobs/${id}/moderate`, { decision, note }).job;
  },

  getSavedJobs() {
    return this._request('GET', '/api/saved-jobs').savedJobs || [];
  },
  toggleSavedJob(jobId) {
    return this._request('POST', `/api/saved-jobs/${jobId}/toggle`);
  },

  getNotifAdmin() {
    return this._request('GET', '/api/notifications?role=admin').notifications || [];
  },
  markAdminNotifsRead() {
    this._request('POST', '/api/notifications/read', { role: 'admin' });
  },
  countUnreadAdmin() {
    return this.getNotifAdmin().filter(n => !n.read).length;
  },
  getNotifUser(email) {
    return this._request('GET', `/api/notifications?role=user&email=${encodeURIComponent(email || '')}`).notifications || [];
  },
  markUserNotifsRead(email) {
    this._request('POST', '/api/notifications/read', { role: 'user', email });
  },
  countUnreadUser(email) {
    return this.getNotifUser(email).filter(n => !n.read).length;
  },

  updateProfile(email, patch) {
    return this._request('PATCH', '/api/users/profile', { ...patch, email }).user;
  },

  getCVIndex() {
    return this._request('GET', '/api/cvs').cvs || {};
  },
  getCV(email) {
    return this._request('GET', `/api/cvs/${encodeURIComponent(email)}`).cv;
  },
  saveCV(email, cvData) {
    return this._request('PUT', `/api/cvs/${encodeURIComponent(email)}`, cvData).cv;
  },
  saveCv(email, cvData) { return this.saveCV(email, cvData); },
  getCv(email) { return this.getCV(email); },
  deleteCv(email) { return this.deleteCV(email); },
  deleteCV(email) {
    return this._request('DELETE', `/api/cvs/${encodeURIComponent(email)}`);
  },

  logout() {
    try { if (window.CVMSAuth) window.CVMSAuth.signOut(); } catch {}
    try { this._request('POST', '/api/auth/logout'); } catch {}
    localStorage.removeItem('cvms_user');
    localStorage.removeItem('cvms_token');
    localStorage.removeItem('cvms_auth_user_id');
  },
};

window.CVMS = CVMS;
