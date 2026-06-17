import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';

export async function createStore(root, defaultJobs, defaultCompanies = []) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  const productionRequiresSupabase = true;

  if (supabaseUrl && supabaseKey) {
    const store = createSupabaseStore(supabaseUrl, supabaseKey, defaultJobs, defaultCompanies);
    try {
      await store.init();
    } catch (error) {
      throw new Error(`Supabase init failed. Run supabase/schema.sql in Supabase SQL Editor first. ${error.message}`);
    }
    return store;
  }

  if (productionRequiresSupabase && (!supabaseUrl || !supabaseKey)) {
    throw new Error('CVMS production requires Supabase. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. SQLite is disabled.');
  }

  const store = createSupabaseStore(supabaseUrl, supabaseKey, defaultJobs, defaultCompanies);
  await store.init();
  return store;
}

function createSupabaseStore(supabaseUrl, supabaseKey, defaultJobs, defaultCompanies = []) {
  const baseUrl = `${supabaseUrl}/rest/v1`;
  const storageBucket = process.env.SUPABASE_CV_BUCKET || 'private-cvs';

  async function request(table, query = '', options = {}) {
    const response = await fetch(`${baseUrl}/${table}${query}`, {
      method: options.method || 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        ...(options.prefer ? { Prefer: options.prefer } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
      throw new Error(data?.message || data?.error || response.statusText);
    }
    return data;
  }

  async function rpc(name, payload = {}) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) throw new Error(data?.message || data?.error || response.statusText);
    return data;
  }

  async function adminCreateAuthUser({ email, password, name }) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
      const msg = data?.msg || data?.message || data?.error_description || data?.error || response.statusText;
      const err = new Error(msg);
      err.status = response.status;
      err.code = data?.error_code || data?.code || '';
      throw err;
    }
    return data;
  }

  async function uploadPrivateCv(email, cv = {}) {
    const file = decodeDataUrl(cv.dataUrl || cv.base64 || '');
    const ext = String(cv.ext || '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const storagePath = `${safeStorageSegment(email)}/${Date.now()}-${safeStorageSegment(cv.name || `cv.${ext}`)}`;
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${storageBucket}/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': file.mimeType || cv.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file.buffer,
    });
    const raw = await response.text();
    if (!response.ok) {
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}
      throw new Error(data?.message || data?.error || response.statusText);
    }
    return {
      storageBucket,
      storagePath,
      type: file.mimeType || cv.type || 'application/octet-stream',
      size: file.buffer.length || Number(cv.size || 0),
    };
  }

  async function createStorageSignedUrl(storagePath, expiresIn = 600) {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${storageBucket}/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn }),
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) throw new Error(data?.message || data?.error || response.statusText);
    return data?.signedURL?.startsWith('http') ? data.signedURL : `${supabaseUrl}/storage/v1${data?.signedURL || ''}`;
  }

  async function selectOne(table, query) {
    const rows = await request(table, `${query}&limit=1`);
    return rows?.[0] || null;
  }

  function publicUser(row) {
    if (!row) return null;
    const { password: _password, ...user } = row;
    return user;
  }

  async function getUserByAuthId(authUserId) {
    if (!authUserId) return null;
    const row = await selectOne('users', `?select=*&auth_user_id=eq.${encodeFilter(authUserId)}`);
    return row ? attachCompany(publicUser(row)) : null;
  }

  async function attachCompany(user) {
    if (!user) return user;
    const company = user.companyId ? normalizeCompany(await selectOne('companies', `?select=*&id=eq.${Number(user.companyId)}`)) : null;
    return {
      ...user,
      companyId: user.companyId || null,
      companyName: company?.name || '',
      companySlug: company?.slug || '',
      companyIndustry: company?.industry || '',
      companyPlan: company?.plan || '',
      companyStatus: company?.status || '',
      companyRejectedReason: company?.rejectedReason || company?.rejected_reason || '',
      platformRole: user.role === 'admin' ? 'Quản trị nền tảng' : user.role === 'company' ? 'Đối tác doanh nghiệp' : user.platformRole || '',
    };
  }

  async function init() {
    await ensurePlatformAdmin();
    if (process.env.CVMS_SEED_DEMO === 'true') {
      await seedCompanies();
      await seedBookingRequests();
      const jobs = await request('jobs', '?select=id&limit=1');
      if (!jobs.length) {
        await request('jobs', '?select=*', {
          method: 'POST',
          prefer: 'return=representation',
          body: defaultJobs.map(serializeJob),
        });
      }
    }
  }

  async function seedCompanies() {
    if (!defaultCompanies.length) return;
    await request('companies', '?on_conflict=id&select=*', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: defaultCompanies,
    });
  }

  async function seedBookingRequests() {
    try {
      await request('booking_requests', '?select=id&limit=1');
    } catch {
      // Table may not exist yet; schema/migration will create it.
    }
  }

  async function ensurePlatformAdmin() {
    const exists = await selectOne('users', `?select=email&email=eq.${encodeFilter('admincv@gmail.com')}`);
    if (!exists) {
      await request('users', '', {
        method: 'POST',
        body: { email: 'admincv@gmail.com', name: 'Nguyễn Admin', password: hashPassword('123456'), role: 'admin', companyId: null, companyRole: 'Platform Admin' },
      });
      return;
    }
    await request('users', `?email=eq.${encodeFilter('admincv@gmail.com')}`, {
      method: 'PATCH',
      body: { role: 'admin', companyId: null, companyRole: 'Platform Admin' },
    });
  }


  function validateRegistrationConsents(role, consents = {}) {
    if (!consents.terms || !consents.privacy) return 'B?n c?n ??ng ? ?i?u kho?n s? d?ng v? Ch?nh s?ch b?o m?t.';
    if (role === 'user' && !consents.candidateConsent) return '?ng vi?n c?n ??ng ? x? l? v? chia s? CV khi ?ng tuy?n.';
    if (role === 'company' && !consents.companyPolicy) return 'Doanh nghi?p c?n ??ng ? Ch?nh s?ch doanh nghi?p.';
    return '';
  }

  async function saveUserConsents(email, role, consents = {}, ip = '', userAgent = '') {
    const map = [
      ['terms', consents.terms],
      ['privacy', consents.privacy],
      ['candidate_consent', role === 'user' && consents.candidateConsent],
      ['company_policy', role === 'company' && consents.companyPolicy],
      ['marketing', consents.marketing === true],
    ].filter(([, accepted]) => accepted);
    const rows = map.map(([type]) => ({
      user_email: email,
      user_role: role,
      consent_type: type,
      version: '2026-06-14',
      ip,
      user_agent: userAgent,
      metadata: { source: 'register' },
    }));
    if (rows.length) {
      await request('user_consents', '?on_conflict=user_email,consent_type,version', { method: 'POST', prefer: 'resolution=merge-duplicates', body: rows });
    }
  }

  async function getCompanies() {
    const rows = await request('companies', '?select=*&order=name.asc');
    return rows.map(normalizeCompany);
  }

  async function getCompany(id) {
    const row = await selectOne('companies', `?select=*&id=eq.${Number(id)}`);
    return normalizeCompany(row);
  }

  async function addCompany(company) {
    const id = Date.now();
    const rows = await request('companies', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: normalizeCompanyInput(company, id),
    });
    return normalizeCompany(rows[0]);
  }

  async function updateCompany(id, patch) {
    const rows = await request('companies', `?id=eq.${Number(id)}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: normalizeCompanyInput(patch, Number(id), true),
    });
    return normalizeCompany(rows[0]);
  }

  async function requireCompanyContext(user) {
    const companyId = Number(user?.companyId || 0);
    if (!companyId) throw new Error('Tài khoản doanh nghiệp chưa được gắn với công ty. Hãy hoàn tất booking/gói đăng tuyển trước.');
    const company = await getCompany(companyId);
    if (!company) throw new Error('Không tìm thấy doanh nghiệp của tài khoản này.');
    await ensureCompanyWallet(companyId);
    return { companyId, company };
  }

  async function ensureCompanyWallet(companyId) {
    const current = await selectOne('company_wallets', `?select=*&companyId=eq.${Number(companyId)}`);
    if (current) return current;
    const rows = await request('company_wallets', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: { companyId: Number(companyId), balance: 0, currency: 'VND' },
    });
    return rows?.[0] || { companyId: Number(companyId), balance: 0, currency: 'VND' };
  }



  async function ensureActiveSubscription(companyId) {
    try {
      const now = new Date().toISOString();
      const rows = await request('company_subscriptions', `?select=*&companyId=eq.${Number(companyId)}&status=eq.active&order=ends_at.desc`);
      const active = (rows || []).find((item) => !item.ends_at || String(item.ends_at) >= now);
      if (!active) throw new Error('Doanh nghi?p ch?a c? g?i ??ng tuy?n ?ang ho?t ??ng. H?y mua g?i v? ch? admin x?c nh?n.');
      if (Number(active.post_limit || 0) > 0 && Number(active.posts_used || 0) >= Number(active.post_limit || 0)) {
        throw new Error('G?i ??ng tuy?n ?? h?t l??t ??ng tin. Vui l?ng mua th?m g?i.');
      }
      return active;
    } catch (error) {
      if (/company_subscriptions/.test(error.message)) return null;
      throw error;
    }
  }


  async function reserveCompanyJobSlot(companyId, actorEmail) {
    const result = await rpc('reserve_company_job_slot', { p_company_id: Number(companyId), p_actor_email: actorEmail || '' });
    return Array.isArray(result) ? result[0] : result;
  }

  async function releaseCompanyJobSlot(subscriptionId, actorEmail) {
    if (!subscriptionId) return null;
    try {
      const result = await rpc('release_company_job_slot', { p_subscription_id: Number(subscriptionId), p_actor_email: actorEmail || '' });
      return Array.isArray(result) ? result[0] : result;
    } catch { return null; }
  }

  async function addCompanyJob(user, payload = {}) {
    const { companyId, company } = await requireCompanyContext(user, { requireVerified: true });
    await ensureActiveSubscription(companyId);
    return addJob({
      ...payload,
      companyId,
      company: company.name,
      status: payload.status || 'Chờ kiểm duyệt',
      active: payload.active === true,
    });
  }

  async function updateCompanyJob(user, id, patch = {}) {
    const { companyId, company } = await requireCompanyContext(user, { requireVerified: true });
    const current = normalizeJob(await selectOne('jobs', `?select=*&id=eq.${Number(id)}`));
    if (!current || Number(current.companyId || 0) !== companyId) throw new Error('Doanh nghiệp không có quyền sửa tin này.');
    return updateJob(Number(id), { ...patch, companyId, company: company.name });
  }

  async function updateCompanyJobStatus(user, id, status = '') {
    const normalized = String(status || '').trim();
    const map = {
      publish: { status: 'Chờ kiểm duyệt', active: false },
      active: { status: 'Đang tuyển', active: true },
      pause: { status: 'Tạm dừng', active: false },
      close: { status: 'Đã đóng', active: false },
    };
    const patch = map[normalized] || { status: normalized || 'Tạm dừng', active: normalized === 'Đang tuyển' };
    return updateCompanyJob(user, id, patch);
  }

  async function getJobs() {
    const rows = await request('jobs', '?select=*&order=id.desc');
    return rows.map(normalizeJob);
  }

  async function addJob(job) {
    const id = Date.now();
    const rows = await request('jobs', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: serializeJob({
        id,
        title: job.title,
        company: job.company || 'CVMS',
        companyId: job.companyId || null,
        location: job.location,
        salary: job.salary || 'Thỏa thuận',
        salaryNum: job.salaryNum || 0,
        deadline: job.deadline,
        tags: job.tags || [],
        dept: job.dept || 'Other',
        qty: job.qty || 1,
        applicants: 0,
        status: job.status || 'Đang tuyển',
        active: job.active === undefined ? true : job.active,
        subscription_id: job.subscription_id || null,
      }),
    });
    await addNotification({
      role: 'user',
      type: 'new_job',
      title: '🆕 Vị trí tuyển dụng mới!',
      body: `"${job.title}" tại ${job.company || 'CVMS'} — ${job.location}`,
      jobId: id,
    });
    return normalizeJob(rows[0]);
  }

  async function updateJob(id, patch) {
    const current = await selectOne('jobs', `?select=*&id=eq.${id}`);
    if (!current) throw new Error('Job not found');
    const next = { ...normalizeJob(current), ...patch };
    const rows = await request('jobs', `?id=eq.${id}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: serializeJob(next),
    });
    return normalizeJob(rows[0]);
  }

  async function closeJob(id) {
    const rows = await request('jobs', `?id=eq.${id}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { active: false, status: 'Đã đóng' },
    });
    return normalizeJob(rows[0]);
  }

  async function getApplications() {
    const rows = await request('applications', '?select=*&order=dateTs.asc');
    return rows.map(normalizeApplication);
  }

  async function applyJob({ jobId, userEmail, userName }) {
    const duplicate = await selectOne('applications', `?select=id&jobId=eq.${jobId}&userEmail=eq.${encodeFilter(userEmail)}`);
    if (duplicate) return { ok: false, msg: 'Bạn đã ứng tuyển vị trí này rồi!' };

    const job = normalizeJob(await selectOne('jobs', `?select=*&id=eq.${jobId}`));
    if (!job || job.active === false) return { ok: false, msg: 'Vị trí không tồn tại hoặc đã đóng!' };

    const id = Date.now();
    const now = new Date();
    const app = {
      id,
      jobId,
      companyId: job.companyId || null,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      userEmail,
      userName,
      status: 'Mới nộp',
      pipelineStage: 'new',
      date: now.toLocaleDateString('vi-VN'),
      dateTs: Date.now(),
      adminNote: '',
    };
    const rows = await request('applications', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: app,
    });
    await request('jobs', `?id=eq.${jobId}`, {
      method: 'PATCH',
      body: { applicants: (job.applicants || 0) + 1 },
    });
    await addNotification({
      role: job.companyId ? 'company' : 'admin',
      type: 'new_application',
      title: '🔔 Ứng viên mới!',
      body: `${userName} vừa nộp đơn vào "${job.title}"`,
      appId: id,
      companyId: job.companyId || null,
      userEmail,
    });
    return { ok: true, app: normalizeApplication(rows[0]) };
  }

  async function updateApplicationStatus(appId, newStatus, adminNote = '') {
    const pipelineStage = statusToStage(newStatus);
    const rows = await request('applications', `?id=eq.${appId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { status: newStatus, adminNote, pipelineStage },
    });
    const app = rows[0];
    if (!app) throw new Error('Application not found');
    const messages = statusMessages(app, adminNote);
    if (messages[newStatus]) {
      await addNotification({
        role: 'user',
        targetEmail: app.userEmail,
        type: 'status_update',
        title: '📋 Cập nhật đơn ứng tuyển',
      body: messages[newStatus],
      appId,
      companyId: app.companyId || null,
      jobTitle: app.jobTitle,
      });
    }
    return normalizeApplication(app);
  }

  async function updatePipelineStage(appId, stage) {
    const stageStatusMap = { new: 'Mới nộp', screening: 'Đang xem xét', interview: 'Phỏng vấn', review: 'Đang xem xét', offer: 'Đã offer', hired: 'Đã offer', rejected: 'Từ chối' };
    const rows = await request('applications', `?id=eq.${appId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { pipelineStage: stage, status: stageStatusMap[stage] || 'Đang xem xét' },
    });
    const app = rows[0];
    if (!app) throw new Error('Application not found');
    const stageLabel = { new: 'Mới', screening: 'Screening', interview: 'Phỏng vấn', review: 'Đánh giá', offer: 'Offer', hired: 'Nhận việc' };
    if (['interview', 'offer', 'hired'].includes(stage)) {
      await addNotification({
        role: 'user',
        targetEmail: app.userEmail,
        type: 'pipeline_move',
        title: '📋 Cập nhật hồ sơ',
        body: `Đơn ứng tuyển "${app.jobTitle}" đã chuyển sang giai đoạn: ${stageLabel[stage]}`,
        appId,
        companyId: app.companyId || null,
      });
    }
    return normalizeApplication(app);
  }

  async function register({ name, email, password, role = 'user', consents = {}, ip = '', userAgent = '' }) {
    if (!name || !email || !password) return { ok: false, msg: 'Vui l?ng nh?p ?? h? t?n, email v? m?t kh?u.' };
    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, msg: 'Email kh?ng h?p l?.' };
    if (String(password).length < 8) return { ok: false, msg: 'M?t kh?u ph?i t?i thi?u 8 k? t?.' };
    const rawRole = String(role || 'user').toLowerCase();
    if (!['user', 'company'].includes(rawRole)) return { ok: false, msg: 'Vai tr? kh?ng h?p l?.' };
    const normalizedRole = rawRole;
    const consentError = validateRegistrationConsents(normalizedRole, consents);
    if (consentError) return { ok: false, msg: consentError };
    const exists = await selectOne('users', `?select=*&email=eq.${encodeFilter(cleanEmail)}`);
    if (exists?.auth_user_id) return { ok: false, msg: 'Email n?y ?? c? t?i kho?n. Vui l?ng ??ng nh?p.' };
    let authUser;
    try {
      authUser = await adminCreateAuthUser({ email: cleanEmail, password, name });
    } catch (error) {
      const msg = String(error?.message || '').toLowerCase();
      if (error?.status === 422 || msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return { ok: false, msg: 'Email n?y ?? ???c ??ng k?. Vui l?ng ??ng nh?p.' };
      }
      return { ok: false, msg: error?.message || 'Kh?ng t?o ???c t?i kho?n Supabase Auth.' };
    }
    const authUserId = authUser?.id || authUser?.user?.id;
    if (!authUserId) return { ok: false, msg: 'Supabase Auth kh?ng tr? v? user id.' };
    if (exists) {
      await request('users', `?email=eq.${encodeFilter(cleanEmail)}`, { method: 'PATCH', body: { auth_user_id: authUserId, name: exists.name || name, role: exists.role || normalizedRole } });
    } else {
      await request('users', '', {
        method: 'POST',
        body: { email: cleanEmail, name, auth_user_id: authUserId, role: normalizedRole, status: normalizedRole === 'company' ? 'pending' : 'active', companyRole: normalizedRole === 'company' ? '??i t?c doanh nghi?p' : '' },
      });
    }
    try { await saveUserConsents(cleanEmail, normalizedRole, consents, ip, userAgent); } catch {}
    const user = await getUserByAuthId(authUserId);
    return { ok: true, user };
  }

  async function loginFromAuth({ authPayload = {}, ip = '', userAgent = '' }) {
    const authUserId = authPayload.id;
    const email = String(authPayload.email || '').trim().toLowerCase();
    if (!authUserId || !email) {
      return { ok: false, code: 'invalid_token', msg: 'Token kh?ng h?p l?.' };
    }
    if (!authPayload.email_confirmed_at && !authPayload.confirmed_at) {
      return { ok: false, code: 'email_not_confirmed', msg: 'B?n c?n x?c nh?n email tr??c khi ??ng nh?p. Vui l?ng ki?m tra h?p th?.' };
    }
    let user = await getUserByAuthId(authUserId);
    if (!user) {
      const byEmail = await selectOne('users', `?select=*&email=eq.${encodeFilter(email)}`);
      if (byEmail && !byEmail.auth_user_id) {
        await request('users', `?email=eq.${encodeFilter(email)}`, { method: 'PATCH', body: { auth_user_id: authUserId } });
        user = await getUserByAuthId(authUserId);
      } else if (byEmail && byEmail.auth_user_id && byEmail.auth_user_id !== authUserId) {
        return { ok: false, code: 'email_taken', msg: 'Email n?y ?? li?n k?t t?i kho?n kh?c.' };
      }
    }
    if (!user) {
      const meta = authPayload.user_metadata || {};
      const rawRole = String(meta.cvms_role || meta.role || 'user').toLowerCase();
      if (!['user', 'company'].includes(rawRole)) {
        return { ok: false, code: 'invalid_role', msg: 'Vai trò đăng ký không hợp lệ.' };
      }
      const role = rawRole;
      const name = String(meta.name || meta.full_name || email.split('@')[0]).trim() || 'Ng??i d?ng';
      const status = role === 'company' ? 'pending' : 'active';
      await request('users', '', {
        method: 'POST',
        body: { email, name, auth_user_id: authUserId, role, status, companyRole: role === 'company' ? '??i t?c doanh nghi?p' : '' },
      });
      const consents = meta.consents || {};
      if (consents && (consents.terms || consents.privacy || consents.candidateConsent || consents.companyPolicy || consents.marketing)) {
        try { await saveUserConsents(email, role, consents, ip, userAgent); } catch {}
      }
      user = await getUserByAuthId(authUserId);
    }
    if (!user) return { ok: false, code: 'profile_create_failed', msg: 'Kh?ng t?o ???c profile.' };
    return { ok: true, user };
  }

  async function login({ authUserId, email }) {
    let user = await getUserByAuthId(authUserId);
    if (!user && email) {
      const row = await selectOne('users', `?select=*&email=eq.${encodeFilter(email)}`);
      if (row && !row.auth_user_id) {
        await request('users', `?email=eq.${encodeFilter(email)}`, { method: 'PATCH', body: { auth_user_id: authUserId } });
        user = await getUserByAuthId(authUserId);
      }
    }
    if (!user) return { ok: false, msg: 'T?i kho?n ch?a c? h? s? CVMS ho?c ch?a li?n k?t auth_user_id.' };
    return { ok: true, user };
  }

  async function getUserByEmail(email) {
    const row = await selectOne('users', `?select=*&email=eq.${encodeFilter(email)}`);
    if (!row) return null;
    return attachCompany(publicUser(row));
  }

  async function oauthLogin({ email, name, provider, role = 'user' }) {
    if (!email) return { ok: false, msg: 'OAuth không trả về email!' };
    let row = await selectOne('users', `?select=*&email=eq.${encodeFilter(email)}`);
    if (!row) {
      await request('users', '', {
        method: 'POST',
        body: { email, name: name || email, password: `oauth:${provider || 'provider'}`, role: role === 'company' ? 'company' : 'user', companyRole: role === 'company' ? 'Đối tác doanh nghiệp' : '' },
      });
      row = await selectOne('users', `?select=*&email=eq.${encodeFilter(email)}`);
    }
    const { password: _password, ...user } = row;
    return { ok: true, user: await attachCompany(user) };
  }

  async function updateProfile(email, patch) {
    const rows = await request('users', `?email=eq.${encodeFilter(email)}&select=email,name,role,companyId,companyRole,phone,address,bio,targetPosition,experienceLevel,education,skills,expectedSalary,desiredLocations,workType,portfolio,linkedin`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: buildProfilePatch(patch),
    });
    return rows[0];
  }

  async function addNotification(notification) {
    await request('notifications', '', {
      method: 'POST',
      body: buildNotification(notification),
    });
  }

  async function addBookingRequest(payload) {
    const item = normalizeBookingRequestInput(payload);
    const rows = await request('booking_requests', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: item,
    });
    await addNotification({
      role: 'admin',
      type: 'company_booking',
      title: '🏢 Yêu cầu booking mới',
      body: `${item.companyName} muốn đặt gói ${item.packageLabel} cho ${item.jobTitle || 'đăng tin tuyển dụng'}.`,
      userEmail: item.email,
    });
    return rows?.[0] || item;
  }

  async function getBookingRequests() {
    try {
      const rows = await request('booking_requests', '?select=*&order=id.desc');
      return rows || [];
    } catch {
      return [];
    }
  }

  async function ensureCompanyForBooking(booking = {}) {
    const companyName = String(booking.companyName || '').trim() || 'Doanh nghiệp chưa đặt tên';
    const slug = slugify(companyName);
    let company = normalizeCompany(await selectOne('companies', `?select=*&slug=eq.${encodeFilter(slug)}`));
    if (!company) {
      company = await addCompany({
        name: companyName,
        slug,
        industry: booking.industry || 'Chưa phân loại',
        location: 'Hà Nội',
        plan: packageToPlan(booking.packageKey),
        status: 'pending',
      });
    }
    if (booking.email) {
      await request('users', `?email=eq.${encodeFilter(booking.email)}`, {
        method: 'PATCH',
        body: { companyId: company.id, companyRole: 'Đối tác doanh nghiệp' },
      });
    }
    if (booking.id) {
      await request('booking_requests', `?id=eq.${Number(booking.id)}`, {
        method: 'PATCH',
        body: { companyId: company.id },
      });
    }
    return company;
  }


  async function ensureSubscriptionFromBooking(booking, companyId, actorEmail = '') {
    const planId = String(booking.packageKey || 'basic').toLowerCase();
    const plan = await selectOne('subscription_plans', `?select=*&id=eq.${encodeFilter(planId)}`) || await selectOne('subscription_plans', '?select=*&id=eq.basic');
    const existed = await request('company_subscriptions', `?select=*&companyId=eq.${Number(companyId)}&refType=eq.booking_request&refId=eq.${Number(booking.id || 0)}&limit=1`).catch(() => []);
    if (existed?.[0]) return existed[0];
    const rows = await request('company_subscriptions', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        companyId,
        plan_id: plan?.id || planId,
        status: 'waiting_admin_confirm',
        amount: Number(booking.totalAmount || plan?.price || 0),
        post_limit: Number(booking.quantity || plan?.post_limit || 1),
        requested_by: booking.email || actorEmail,
        refType: 'booking_request',
        refId: Number(booking.id || 0),
      },
    });
    return rows?.[0];
  }

  async function adminConfirmBookingPayment(id) {
    const bookingId = Number(id);
    const current = await selectOne('booking_requests', `?select=*&id=eq.${bookingId}`);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    if (current.paymentStatus === 'admin_confirmed') return current;
    const company = await ensureCompanyForBooking(current);
    const adminConfirmedAt = new Date().toLocaleString('vi-VN');
    const rows = await request('booking_requests', `?id=eq.${bookingId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'payment_confirmed',
        paymentStatus: 'admin_confirmed',
        adminConfirmedAt,
        companyId: company.id,
      },
    });
    await addNotification({
      role: 'company',
      targetEmail: current.email,
      type: 'booking_payment_confirmed',
      title: 'Thanh toán booking đã được xác nhận',
      body: `Admin đã xác nhận thanh toán cho yêu cầu booking #${bookingId}.`,
      companyId: company.id,
      userEmail: current.email,
    });
    const subscription = await ensureSubscriptionFromBooking({ ...current, companyId: company.id }, company.id, 'admin');
    if (subscription?.id) await adminConfirmSubscription(subscription.id, { email: 'admin' });
    return rows?.[0] || { ...current, status: 'payment_confirmed', paymentStatus: 'admin_confirmed', adminConfirmedAt, companyId: company.id };
  }

  async function rejectBookingRequest(id, reason = '') {
    const bookingId = Number(id);
    const current = await selectOne('booking_requests', `?select=*&id=eq.${bookingId}`);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    const rows = await request('booking_requests', `?id=eq.${bookingId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { status: 'rejected', rejectedReason: String(reason || '').trim() },
    });
    await addNotification({
      role: 'company',
      targetEmail: current.email,
      type: 'booking_rejected',
      title: 'Yêu cầu booking cần kiểm tra lại',
      body: reason || `Yêu cầu booking #${bookingId} đã bị tạm từ chối. Vui lòng liên hệ admin.`,
      userEmail: current.email,
    });
    return rows?.[0] || { ...current, status: 'rejected', rejectedReason: reason };
  }

  async function createJobFromBooking(id, payload = {}) {
    const bookingId = Number(id);
    const booking = await selectOne('booking_requests', `?select=*&id=eq.${bookingId}`);
    if (!booking) throw new Error('Không tìm thấy yêu cầu booking.');
    const existingJobId = Number(booking.jobId || 0);
    if (existingJobId) {
      const existing = await getJobs().then((jobs) => jobs.find((job) => Number(job.id) === existingJobId));
      if (existing) return { booking, job: existing };
    }
    const company = await ensureCompanyForBooking(booking);
    const job = await addJob({
      title: payload.title || booking.jobTitle || 'Tin tuyển dụng mới',
      companyId: company.id,
      company: company.name,
      location: payload.location || company.location || 'Hà Nội',
      salary: payload.salary || 'Thỏa thuận',
      salaryNum: extractSalaryNumber(payload.salary || ''),
      deadline: payload.deadline || defaultDeadline(Number(booking.duration || 30)),
      tags: normalizeTags(payload.tags || booking.industry || booking.packageLabel || ''),
      dept: payload.dept || booking.industry || 'Other',
      qty: Math.max(1, Number(payload.qty || booking.quantity || 1)),
      status: 'Đang tuyển',
      active: true,
    });
    const rows = await request('booking_requests', `?id=eq.${bookingId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { status: 'job_created', jobId: job.id, companyId: company.id },
    });
    await addNotification({
      role: 'company',
      targetEmail: booking.email,
      type: 'booking_job_created',
      title: 'Tin tuyển dụng đã được đăng',
      body: `Admin đã tạo tin "${job.title}" từ yêu cầu booking #${bookingId}.`,
      jobId: job.id,
      companyId: company.id,
      userEmail: booking.email,
    });
    return { booking: rows?.[0] || { ...booking, status: 'job_created', jobId: job.id, companyId: company.id }, job };
  }

  async function shareApplicationWithCompany(appId, note = '') {
    const id = Number(appId);
    const current = await selectOne('applications', `?select=*&id=eq.${id}`);
    if (!current) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
    const sharedAt = new Date().toLocaleString('vi-VN');
    const rows = await request('applications', `?id=eq.${id}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { sharedToCompany: true, sharedAt, companyShareNote: String(note || '').trim() },
    });
    const app = normalizeApplication(rows?.[0] || current);
    const companyUsers = current.companyId
      ? await request('users', `?select=email&role=eq.company&companyId=eq.${Number(current.companyId)}&limit=1`)
      : [];
    await addNotification({
      role: 'company',
      targetEmail: companyUsers?.[0]?.email || null,
      type: 'candidate_shortlist',
      title: 'Admin đã gửi ứng viên phù hợp',
      body: `${current.userName || current.userEmail} đã được gửi sang doanh nghiệp cho vị trí "${current.jobTitle}".`,
      appId: id,
      companyId: current.companyId || null,
      jobTitle: current.jobTitle,
      userEmail: current.userEmail,
    });
    return app;
  }

  async function updateCompanyApplicationFeedback(appId, user, feedback = '') {
    const id = Number(appId);
    const current = await selectOne('applications', `?select=*&id=eq.${id}`);
    if (!current) throw new Error('Không tìm thấy hồ sơ ứng viên.');
    if (Number(user.companyId || 0) && Number(current.companyId || 0) !== Number(user.companyId)) {
      throw new Error('Doanh nghiệp không có quyền phản hồi hồ sơ này.');
    }
    const companyFeedbackAt = new Date().toLocaleString('vi-VN');
    const rows = await request('applications', `?id=eq.${id}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { companyFeedback: String(feedback || '').trim(), companyFeedbackAt },
    });
    await addNotification({
      role: 'admin',
      type: 'company_candidate_feedback',
      title: 'Doanh nghiệp phản hồi ứng viên',
      body: `${user.name || user.email} phản hồi hồ sơ "${current.userName || current.userEmail}": ${feedback || 'Đã xem hồ sơ'}`,
      appId: id,
      companyId: current.companyId || null,
      jobTitle: current.jobTitle,
      userEmail: current.userEmail,
    });
    return normalizeApplication(rows?.[0] || current);
  }

  async function getCompanyApplications(companyId) {
    const apps = (await request('applications', `?select=*&companyId=eq.${Number(companyId)}&order=dateTs.desc`)).map(normalizeApplication);
    const accesses = await request('application_accesses', `?select=*&companyId=eq.${Number(companyId)}&order=created_at.desc`);
    const accessByApp = new Map((accesses || []).map((item) => [Number(item.applicationId), item]));
    return apps.map((app) => anonymizeApplicationForCompany(app, accessByApp.get(Number(app.id))));
  }

  async function requestWalletTopup(user, payload = {}) {
    const { companyId } = await requireCompanyContext(user, { requireVerified: true });
    const amount = Math.max(0, Math.round(Number(payload.amount || 0)));
    if (amount < 50000) throw new Error('Số tiền nạp tối thiểu là 50.000đ.');
    const transferCode = `NAPVI-${companyId}-${Date.now()}`;
    const item = {
      companyId,
      requestedBy: user.email,
      amount,
      status: 'pending',
      transferNote: `${transferCode}${payload.note ? ' | ' + String(payload.note).trim() : ''}`,
      transferCode,
    };
    const rows = await request('wallet_topups', '?select=*', {
      method: 'POST',
      prefer: 'return=representation',
      body: item,
    });
    await addNotification({
      role: 'admin',
      type: 'wallet_topup_request',
      title: 'Doanh nghiệp yêu cầu nạp ví',
      body: `${user.companyName || user.name || user.email} yêu cầu nạp ${formatVnd(amount)}.`,
      companyId,
      userEmail: user.email,
    });
    return rows?.[0] || item;
  }

  async function adminConfirmWalletTopup(id, adminUser = {}) {
    const topupId = Number(id);
    const rows = await rpc('confirm_wallet_topup', { p_topup_id: topupId, p_actor_email: adminUser.email || 'admin' });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function unlockApplication(user, appId) {
    const { companyId } = await requireCompanyContext(user, { requireVerified: true });
    const result = await rpc('unlock_application_for_company', {
      p_company_id: companyId,
      p_application_id: Number(appId),
      p_actor_email: user.email,
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async function getApplicationCvUrl(user, appId) {
    const { companyId } = await requireCompanyContext(user);
    const app = await selectOne('applications', `?select=*&id=eq.${Number(appId)}&companyId=eq.${companyId}`);
    if (!app) throw new Error('Không tìm thấy hồ sơ thuộc doanh nghiệp này.');
    const access = await selectOne('application_accesses', `?select=*&companyId=eq.${companyId}&applicationId=eq.${Number(appId)}`);
    if (!access) throw new Error('Doanh nghiệp cần mở khóa hồ sơ trước khi xem CV.');
    const cv = await getCv(app.userEmail);
    if (!cv?.storagePath) throw new Error('Ứng viên chưa tải CV riêng tư.');
    await logDataAccess({ actorEmail: user.email, companyId, applicationId: Number(appId), dataType: 'cv_signed_url', purpose: 'company_unlocked_view' });
    return { url: await createStorageSignedUrl(cv.storagePath), cv: redactCv(cv), access };
  }

  async function updateCompanyPipelineStage(user, appId, stage, interview = {}) {
    const { companyId } = await requireCompanyContext(user);
    const current = await selectOne('applications', `?select=*&id=eq.${Number(appId)}&companyId=eq.${companyId}`);
    if (!current) throw new Error('Doanh nghiệp không có quyền cập nhật hồ sơ này.');
    const rows = await request('applications', `?id=eq.${Number(appId)}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        pipelineStage: stage,
        status: stageStatus(stage),
        interviewAt: interview.interviewAt || current.interviewAt || null,
        interviewNote: interview.interviewNote || current.interviewNote || '',
      },
    });
    return normalizeApplication(rows?.[0] || current);
  }

  async function getAdminFinance() {
    const [wallets, topups, transactions, revenues, settings, subscriptions, refunds, disputes] = await Promise.all([
      request('company_wallets', '?select=*&order=updated_at.desc'),
      request('wallet_topups', '?select=*&order=created_at.desc'),
      request('wallet_transactions', '?select=*&order=created_at.desc&limit=100'),
      request('platform_revenues', '?select=*&order=recognized_at.desc&limit=100'),
      request('commission_settings', '?select=*'),
      request('company_subscriptions', '?select=*&order=created_at.desc'),
      request('refunds', '?select=*&order=created_at.desc'),
      request('disputes', '?select=*&order=created_at.desc'),
    ]);
    return { ...buildFinanceSummary({ wallets, topups, transactions, revenues, settings }), subscriptions, refunds, disputes };
  }

  async function updateCommissionSetting(rate, adminUser = {}) {
    const normalized = clampCommissionRate(rate);
    const rows = await request('commission_settings', '?id=eq.default&select=*', {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { cvUnlockRate: normalized, updatedBy: adminUser.email || 'admin' },
    });
    return rows?.[0] || { id: 'default', cvUnlockRate: normalized };
  }

  async function moderateJob(user, id, decision = 'approve', note = '') {
    if (user?.role !== 'admin') throw new Error('Chỉ admin nền tảng được kiểm duyệt tin.');
    const patch = decision === 'reject'
      ? { status: 'Bị từ chối', active: false, moderationNote: String(note || '').trim() }
      : { status: 'Đang tuyển', active: true, moderationNote: String(note || '').trim() };
    return updateJob(Number(id), patch);
  }

  async function logDataAccess(payload = {}) {
    try {
      await request('data_access_logs', '', {
        method: 'POST',
        body: {
          actorEmail: payload.actorEmail || '',
          companyId: payload.companyId || null,
          applicationId: payload.applicationId || null,
          dataType: payload.dataType || 'unknown',
          purpose: payload.purpose || '',
            },
      });
    } catch {}
  }

  async function getCompanyDashboard(user) {
    const { companyId } = await requireCompanyContext(user);
    const byEmail = await request('booking_requests', `?select=*&email=eq.${encodeFilter(user.email || '')}&order=id.desc`);
    const byCompany = companyId
      ? await request('booking_requests', `?select=*&companyId=eq.${companyId}&order=id.desc`)
      : [];
    const bookings = mergeById([...(byEmail || []), ...(byCompany || [])]);
    const jobs = companyId
      ? (await request('jobs', `?select=*&companyId=eq.${companyId}&order=id.desc`)).map(normalizeJob)
      : [];
    const applications = await getCompanyApplications(companyId);
    const wallet = await ensureCompanyWallet(companyId);
    const topups = await request('wallet_topups', `?select=*&companyId=eq.${companyId}&order=created_at.desc`);
    const walletTransactions = await request('wallet_transactions', `?select=*&companyId=eq.${companyId}&order=created_at.desc&limit=80`);
    const unlocked = await request('application_accesses', `?select=*&companyId=eq.${companyId}&order=created_at.desc`);
    const subscriptions = await request('company_subscriptions', `?select=*&companyId=eq.${companyId}&order=created_at.desc`);
    const activeSubscription = (subscriptions || []).find((item) => item.status === 'active' && (!item.ends_at || String(item.ends_at) >= new Date().toISOString())) || null;
    return { user, companyId, bookings, jobs, applications, shortlisted: applications.filter((app) => app.unlocked), wallet, topups, walletTransactions, unlocked, subscriptions, activeSubscription };
  }

  async function confirmBookingPayment(id, email = '') {
    const bookingId = Number(id);
    const current = await selectOne('booking_requests', `?select=*&id=eq.${bookingId}`);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    const suppliedEmail = String(email || '').trim().toLowerCase();
    if (suppliedEmail && String(current.email || '').trim().toLowerCase() !== suppliedEmail) {
      throw new Error('Email xác nhận không khớp với yêu cầu booking.');
    }
    const paymentConfirmedAt = new Date().toLocaleString('vi-VN');
    const rows = await request('booking_requests', `?id=eq.${bookingId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'waiting_admin_confirm',
        paymentStatus: 'customer_confirmed',
        paymentConfirmedAt,
      },
    });
    const booking = rows?.[0] || { ...current, status: 'waiting_admin_confirm', paymentStatus: 'customer_confirmed', paymentConfirmedAt };
    await addNotification({
      role: 'admin',
      type: 'company_booking_payment',
      title: '💳 Doanh nghiệp đã xác nhận chuyển khoản',
      body: `${booking.companyName || current.companyName} đã xác nhận chuyển khoản cho booking #${booking.id || bookingId}.`,
      userEmail: booking.email || current.email,
    });
    return booking;
  }

  async function getNotifications(role, email, companyId = null) {
    if (role === 'admin') {
      const rows = await request('notifications', "?select=*&role=eq.admin&order=id.desc&limit=50");
      return rows.map(normalizeNotification);
    }
    if (role === 'company') {
      const filter = Number(companyId || 0)
        ? `?select=*&role=eq.company&or=(targetEmail.eq.${encodeFilter(email || '')},companyId.eq.${Number(companyId)})&order=id.desc&limit=100`
        : `?select=*&role=eq.company&targetEmail=eq.${encodeFilter(email || '')}&order=id.desc&limit=100`;
      const rows = await request('notifications', filter);
      return rows.map(normalizeNotification);
    }
    const rows = await request('notifications', `?select=*&role=eq.user&or=(targetEmail.is.null,targetEmail.eq.${encodeFilter(email || '')})&order=id.desc&limit=100`);
    return rows.map(normalizeNotification);
  }

  async function markNotificationsRead(role, email, companyId = null) {
    if (role === 'admin') {
      await request('notifications', '?role=eq.admin', { method: 'PATCH', body: { read: true } });
      return;
    }
    if (role === 'company') {
      const filter = Number(companyId || 0)
        ? `?role=eq.company&or=(targetEmail.eq.${encodeFilter(email || '')},companyId.eq.${Number(companyId)})`
        : `?role=eq.company&targetEmail=eq.${encodeFilter(email || '')}`;
      await request('notifications', filter, { method: 'PATCH', body: { read: true } });
      return;
    }
    await request('notifications', `?role=eq.user&or=(targetEmail.is.null,targetEmail.eq.${encodeFilter(email || '')})`, { method: 'PATCH', body: { read: true } });
  }

  async function getCvIndex() {
    const rows = await request('cvs', '?select=email,name,ext,size,uploadedAt,industries&order=uploadedAt.desc');
    return Object.fromEntries(rows.map((row) => [row.email, row]));
  }

  async function getCv(email) {
    return redactCv(await selectOne('cvs', `?select=*&email=eq.${encodeFilter(email)}`));
  }

  async function saveCv(email, cv) {
    const stored = await uploadPrivateCv(email, cv);
    const rows = await request('cvs', '?on_conflict=email&select=*', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        email,
        name: cv.name,
        type: stored.type,
        ext: cv.ext,
        size: stored.size,
        base64: null,
        storageBucket: stored.storageBucket,
        storagePath: stored.storagePath,
        uploadedAt: cv.uploadedAt || new Date().toLocaleString('vi-VN'),
        industries: normalizeIndustries(cv.industries),
      },
    });
    return redactCv(rows[0]);
  }

  async function deleteCv(email) {
    await request('cvs', `?email=eq.${encodeFilter(email)}`, { method: 'DELETE' });
  }

  async function saveApplicationAssessment(appId, assessment) {
    const score = Number.isFinite(Number(assessment.aiScore)) ? Math.max(0, Math.min(100, Math.round(Number(assessment.aiScore)))) : null;
    const rows = await request('applications', `?id=eq.${appId}&select=*`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        aiScore: score,
        aiFitLevel: assessment.aiFitLevel || '',
        aiEvaluation: assessment.aiEvaluation || {},
        aiEvaluatedAt: assessment.aiEvaluatedAt || new Date().toLocaleString('vi-VN'),
      },
    });
    return normalizeApplication(rows[0]);
  }

  async function getSavedJobs(email) {
    try {
      return request('saved_jobs', `?select=jobId,savedAt&userEmail=eq.${encodeFilter(email || '')}&order=savedAt.desc`);
    } catch {
      return [];
    }
  }

  async function toggleSavedJob(email, jobId) {
    const existing = await getSavedJobs(email);
    if (existing.some((item) => Number(item.jobId) === Number(jobId))) {
      await request('saved_jobs', `?userEmail=eq.${encodeFilter(email)}&jobId=eq.${jobId}`, { method: 'DELETE' });
      return { saved: false, jobId };
    }
    await request('saved_jobs', '', {
      method: 'POST',
      body: { userEmail: email, jobId, savedAt: new Date().toLocaleString('vi-VN') },
    });
    return { saved: true, jobId };
  }



  async function getCvUnlockQuote(user) {
    const { companyId } = await requireCompanyContext(user);
    const result = await rpc('get_cv_unlock_quote', { p_company_id: companyId });
    return Array.isArray(result) ? result[0] : result;
  }

  async function requestSubscription(user, planId = 'basic') {
    const { companyId } = await requireCompanyContext(user);
    const plan = await selectOne('subscription_plans', `?select=*&id=eq.${encodeFilter(planId || 'basic')}&active=eq.true`);
    if (!plan) throw new Error('G?i ??ng tuy?n kh?ng t?n t?i ho?c ?? ng?ng b?n.');
    const rows = await request('company_subscriptions', '?select=*', {
      method: 'POST', prefer: 'return=representation',
      body: { companyId, plan_id: plan.id, amount: Number(plan.price || 0), post_limit: Number(plan.post_limit || 0), requested_by: user.email, status: 'pending_payment' },
    });
    await addNotification({ role: 'admin', type: 'subscription_request', title: 'Doanh nghi?p mua g?i', body: `${user.companyName || user.email} y?u c?u mua g?i ${plan.name}.`, companyId, userEmail: user.email });
    return rows?.[0];
  }

  async function adminConfirmSubscription(id, adminUser = {}) {
    const result = await rpc('confirm_company_subscription', { p_subscription_id: Number(id), p_actor_email: adminUser.email || 'admin' });
    return Array.isArray(result) ? result[0] : result;
  }

  async function requestRefund(user, payload = {}) {
    const { companyId } = await requireCompanyContext(user);
    const amount = Math.max(1, Math.round(Number(payload.amount || 0)));
    const rows = await request('refunds', '?select=*', { method: 'POST', prefer: 'return=representation', body: { companyId, amount, reason: String(payload.reason || '').trim(), requested_by: user.email, status: 'pending' } });
    await addNotification({ role: 'admin', type: 'refund_request', title: 'Y?u c?u ho?n ti?n', body: `${user.companyName || user.email} y?u c?u ho?n ${formatVnd(amount)}.`, companyId, userEmail: user.email });
    return rows?.[0];
  }

  async function adminApproveRefund(id, adminUser = {}) {
    const result = await rpc('approve_refund', { p_refund_id: Number(id), p_actor_email: adminUser.email || 'admin' });
    return Array.isArray(result) ? result[0] : result;
  }

  async function createDispute(user, payload = {}) {
    const { companyId } = await requireCompanyContext(user);
    const rows = await request('disputes', '?select=*', { method: 'POST', prefer: 'return=representation', body: { companyId, applicationId: Number(payload.applicationId || 0) || null, reason: String(payload.reason || '').trim() || 'Tranh ch?p h? s?/CV', created_by: user.email, status: 'open' } });
    await addNotification({ role: 'admin', type: 'dispute_opened', title: 'Tranh ch?p m?i', body: `${user.companyName || user.email} ?? m? tranh ch?p.`, companyId, userEmail: user.email });
    return rows?.[0];
  }

  async function getUserCvUrl(user, email) {
    if (user?.role !== 'user' || user.email !== email) throw new Error('Ch? ?ng vi?n s? h?u CV m?i ???c xem CV c?a m?nh.');
    const cv = await getCv(email);
    if (!cv?.storagePath) return {};
    await logDataAccess({ actorEmail: user.email, companyId: null, applicationId: null, dataType: 'cv_signed_url', purpose: 'candidate_owner_view' });
    return { url: await createStorageSignedUrl(cv.storagePath, 600), storagePath: cv.storagePath };
  }
  return {
    provider: 'supabase',
    init,
    getCompanies,
    getCompany,
    addCompany,
    updateCompany,
    getJobs,
    addJob,
    updateJob,
    closeJob,
    addCompanyJob,
    updateCompanyJob,
    updateCompanyJobStatus,
    getApplications,
    applyJob,
    updateApplicationStatus,
    updatePipelineStage,
    updateCompanyPipelineStage,
    register,
    login,
    getUserByEmail,
    getUserByAuthId,
    loginFromAuth,
    oauthLogin,
    updateProfile,
    getNotifications,
    markNotificationsRead,
    addBookingRequest,
    getBookingRequests,
    confirmBookingPayment,
    adminConfirmBookingPayment,
    rejectBookingRequest,
    createJobFromBooking,
    shareApplicationWithCompany,
    updateCompanyApplicationFeedback,
    getCompanyDashboard,
    getCvUnlockQuote,
    requestSubscription,
    adminConfirmSubscription,
    requestRefund,
    adminApproveRefund,
    createDispute,
    requestWalletTopup,
    adminConfirmWalletTopup,
    unlockApplication,
    getApplicationCvUrl,
    getUserCvUrl,
    getAdminFinance,
    updateCommissionSetting,
    moderateJob,
    getCvIndex,
    getCv,
    saveCv,
    deleteCv,
    saveApplicationAssessment,
    getSavedJobs,
    toggleSavedJob,
  };
}

async function createSqliteStore(root, defaultJobs, defaultCompanies = []) {
  const { DatabaseSync } = await import('node:sqlite');
  const dbPath = join(root, 'data', 'cvms.sqlite');
  const localCvDir = join(root, 'data', 'private-cvs');
  await mkdir(dirname(dbPath), { recursive: true });
  await mkdir(localCvDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  function addColumnIfMissing(table, column, type) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((item) => item.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  function init() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        companyId INTEGER,
        companyRole TEXT,
        phone TEXT,
        address TEXT,
        bio TEXT,
        targetPosition TEXT,
        experienceLevel TEXT,
        education TEXT,
        skills TEXT,
        expectedSalary TEXT,
        desiredLocations TEXT,
        workType TEXT,
        portfolio TEXT,
        linkedin TEXT
      );
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        industry TEXT,
        location TEXT,
        plan TEXT,
        status TEXT DEFAULT 'active',
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        companyId INTEGER,
        location TEXT NOT NULL,
        salary TEXT,
        salaryNum INTEGER DEFAULT 0,
        deadline TEXT,
        tags TEXT,
        dept TEXT,
        qty INTEGER DEFAULT 1,
        applicants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Đang tuyển',
        active INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY,
        jobId INTEGER NOT NULL,
        companyId INTEGER,
        jobTitle TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        userEmail TEXT NOT NULL,
        userName TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Mới nộp',
        pipelineStage TEXT NOT NULL DEFAULT 'new',
        date TEXT,
        dateTs INTEGER,
        adminNote TEXT DEFAULT '',
        aiScore INTEGER,
        aiFitLevel TEXT,
        aiEvaluation TEXT,
        aiEvaluatedAt TEXT,
        sharedToCompany INTEGER DEFAULT 0,
        sharedAt TEXT,
        companyShareNote TEXT,
        companyFeedback TEXT,
        companyFeedbackAt TEXT
      );
      CREATE TABLE IF NOT EXISTS saved_jobs (
        userEmail TEXT NOT NULL,
        jobId INTEGER NOT NULL,
        savedAt TEXT,
        PRIMARY KEY (userEmail, jobId)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL,
        targetEmail TEXT,
        type TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        appId INTEGER,
        jobId INTEGER,
        companyId INTEGER,
        jobTitle TEXT,
        userEmail TEXT,
        time TEXT,
        read INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS cvs (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        ext TEXT,
        size INTEGER,
        base64 TEXT,
        storageBucket TEXT,
        storagePath TEXT,
        uploadedAt TEXT,
        industries TEXT
      );
      CREATE TABLE IF NOT EXISTS booking_requests (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'company',
        companyName TEXT NOT NULL,
        contactName TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        industry TEXT,
        packageKey TEXT,
        packageLabel TEXT,
        jobTitle TEXT,
        quantity INTEGER DEFAULT 1,
        duration INTEGER DEFAULT 30,
        totalAmount INTEGER DEFAULT 0,
        note TEXT,
        status TEXT DEFAULT 'pending',
        paymentStatus TEXT DEFAULT 'waiting_transfer',
        paymentConfirmedAt TEXT,
        adminConfirmedAt TEXT,
        rejectedReason TEXT,
        companyId INTEGER,
        jobId INTEGER,
        createdAt TEXT,
        source TEXT DEFAULT 'public'
      );
      CREATE TABLE IF NOT EXISTS company_wallets (
        companyId INTEGER PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'VND',
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS wallet_topups (
        id INTEGER PRIMARY KEY,
        companyId INTEGER NOT NULL,
        requestedBy TEXT,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        transferNote TEXT,
        confirmedBy TEXT,
        confirmedAt TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INTEGER PRIMARY KEY,
        companyId INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balanceBefore INTEGER NOT NULL,
        balanceAfter INTEGER NOT NULL,
        refType TEXT,
        refId INTEGER,
        note TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS application_accesses (
        id INTEGER PRIMARY KEY,
        companyId INTEGER NOT NULL,
        applicationId INTEGER NOT NULL,
        feeAmount INTEGER NOT NULL,
        commissionRate REAL NOT NULL,
        balanceBefore INTEGER NOT NULL,
        balanceAfter INTEGER NOT NULL,
        unlockedBy TEXT,
        createdAt TEXT,
        UNIQUE(companyId, applicationId)
      );
      CREATE TABLE IF NOT EXISTS commission_settings (
        id TEXT PRIMARY KEY,
        cvUnlockRate REAL NOT NULL DEFAULT 0.015,
        updatedBy TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS platform_revenues (
        id INTEGER PRIMARY KEY,
        companyId INTEGER,
        source TEXT NOT NULL,
        amount INTEGER NOT NULL,
        refType TEXT,
        refId INTEGER,
        recognizedAt TEXT,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY,
        actorEmail TEXT,
        actorRole TEXT,
        action TEXT,
        entityType TEXT,
        entityId TEXT,
        metadata TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id INTEGER PRIMARY KEY,
        actorEmail TEXT,
        companyId INTEGER,
        applicationId INTEGER,
        dataType TEXT,
        purpose TEXT,
        createdAt TEXT
      );
    `);

    addColumnIfMissing('cvs', 'industries', 'TEXT');
    addColumnIfMissing('cvs', 'storageBucket', 'TEXT');
    addColumnIfMissing('cvs', 'storagePath', 'TEXT');
    addColumnIfMissing('users', 'companyId', 'INTEGER');
    addColumnIfMissing('users', 'companyRole', 'TEXT');
    addColumnIfMissing('jobs', 'companyId', 'INTEGER');
    addColumnIfMissing('applications', 'companyId', 'INTEGER');
    addColumnIfMissing('notifications', 'companyId', 'INTEGER');
    for (const column of ['targetPosition', 'experienceLevel', 'education', 'skills', 'expectedSalary', 'desiredLocations', 'workType', 'portfolio', 'linkedin']) {
      addColumnIfMissing('users', column, 'TEXT');
    }
    addColumnIfMissing('applications', 'aiScore', 'INTEGER');
    addColumnIfMissing('applications', 'aiFitLevel', 'TEXT');
    addColumnIfMissing('applications', 'aiEvaluation', 'TEXT');
    addColumnIfMissing('applications', 'aiEvaluatedAt', 'TEXT');
    addColumnIfMissing('applications', 'sharedToCompany', 'INTEGER DEFAULT 0');
    addColumnIfMissing('applications', 'sharedAt', 'TEXT');
    addColumnIfMissing('applications', 'companyShareNote', 'TEXT');
    addColumnIfMissing('applications', 'companyFeedback', 'TEXT');
    addColumnIfMissing('applications', 'companyFeedbackAt', 'TEXT');
    addColumnIfMissing('applications', 'interviewAt', 'TEXT');
    addColumnIfMissing('applications', 'interviewNote', 'TEXT');
    addColumnIfMissing('booking_requests', 'role', 'TEXT');
    addColumnIfMissing('booking_requests', 'companyName', 'TEXT');
    addColumnIfMissing('booking_requests', 'contactName', 'TEXT');
    addColumnIfMissing('booking_requests', 'email', 'TEXT');
    addColumnIfMissing('booking_requests', 'phone', 'TEXT');
    addColumnIfMissing('booking_requests', 'industry', 'TEXT');
    addColumnIfMissing('booking_requests', 'packageKey', 'TEXT');
    addColumnIfMissing('booking_requests', 'packageLabel', 'TEXT');
    addColumnIfMissing('booking_requests', 'jobTitle', 'TEXT');
    addColumnIfMissing('booking_requests', 'quantity', 'INTEGER');
    addColumnIfMissing('booking_requests', 'duration', 'INTEGER');
    addColumnIfMissing('booking_requests', 'totalAmount', 'INTEGER');
    addColumnIfMissing('booking_requests', 'note', 'TEXT');
    addColumnIfMissing('booking_requests', 'status', 'TEXT');
    addColumnIfMissing('booking_requests', 'paymentStatus', 'TEXT');
    addColumnIfMissing('booking_requests', 'paymentConfirmedAt', 'TEXT');
    addColumnIfMissing('booking_requests', 'adminConfirmedAt', 'TEXT');
    addColumnIfMissing('booking_requests', 'rejectedReason', 'TEXT');
    addColumnIfMissing('booking_requests', 'companyId', 'INTEGER');
    addColumnIfMissing('booking_requests', 'jobId', 'INTEGER');
    addColumnIfMissing('booking_requests', 'createdAt', 'TEXT');
    addColumnIfMissing('booking_requests', 'source', 'TEXT');

    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, slug, industry, location, plan, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, industry=excluded.industry, location=excluded.location, plan=excluded.plan, status=excluded.status
    `);
    for (const company of defaultCompanies) {
      insertCompany.run(company.id, company.name, company.slug || '', company.industry || '', company.location || '', company.plan || 'Starter', company.status || 'active', new Date().toLocaleString('vi-VN'));
    }

    ensurePlatformAdmin('admincv@gmail.com', 'Nguyễn Admin');
    db.prepare("UPDATE users SET companyId = NULL, companyRole = 'Platform Admin' WHERE role = 'admin'").run();

    const insertDefault = db.prepare(`
      INSERT OR IGNORE INTO jobs (id, title, company, companyId, location, salary, salaryNum, deadline, tags, dept, qty, applicants, status, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateUntouchedDefault = db.prepare(`
      UPDATE jobs
      SET title=?, company=?, companyId=?, location=?, salary=?, salaryNum=?, deadline=?, tags=?, dept=?, qty=?, status=?, active=?
      WHERE id=? AND applicants=0
    `);
    for (const job of defaultJobs) {
      insertDefault.run(job.id, job.title, job.company, job.companyId || 1, job.location, job.salary, job.salaryNum, job.deadline, JSON.stringify(job.tags), job.dept, job.qty, job.applicants, job.status, job.active ? 1 : 0);
      updateUntouchedDefault.run(job.title, job.company, job.companyId || 1, job.location, job.salary, job.salaryNum, job.deadline, JSON.stringify(job.tags), job.dept, job.qty, job.status, job.active ? 1 : 0, job.id);
    }
    db.prepare('UPDATE jobs SET companyId = 1 WHERE companyId IS NULL').run();
    db.prepare('UPDATE applications SET companyId = COALESCE((SELECT companyId FROM jobs WHERE jobs.id = applications.jobId), 1) WHERE companyId IS NULL').run();
    db.prepare('UPDATE notifications SET companyId = COALESCE((SELECT companyId FROM jobs WHERE jobs.id = notifications.jobId), companyId) WHERE companyId IS NULL AND jobId IS NOT NULL').run();
    db.prepare("INSERT OR IGNORE INTO commission_settings (id, cvUnlockRate, updatedAt) VALUES ('default', 0.015, ?)").run(new Date().toISOString());
    db.prepare("INSERT OR IGNORE INTO company_wallets (companyId, balance, currency, updatedAt) SELECT id, 0, 'VND', ? FROM companies").run(new Date().toISOString());
  }

  function ensurePlatformAdmin(email, name) {
    const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (email, name, password, role, companyId, companyRole)
        VALUES (?, ?, ?, 'admin', NULL, 'Platform Admin')
      `).run(email, name, hashPassword('123456'));
      return;
    }
    db.prepare(`
      UPDATE users
      SET role = 'admin', companyId = NULL, companyRole = 'Platform Admin'
      WHERE email = ?
    `).run(email);
  }

  function getCompanies() {
    return db.prepare('SELECT * FROM companies ORDER BY name ASC').all();
  }

  function getCompany(id) {
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) || null;
  }

  function addCompany(company) {
    const id = Date.now();
    const item = normalizeCompanyInput(company, id);
    db.prepare(`
      INSERT INTO companies (id, name, slug, industry, location, plan, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.name, item.slug, item.industry, item.location, item.plan, item.status, item.createdAt);
    return getCompany(id);
  }

  function updateCompany(id, patch) {
    const current = getCompany(id);
    if (!current) throw new Error('Company not found');
    const item = normalizeCompanyInput({ ...current, ...patch }, Number(id));
    db.prepare(`
      UPDATE companies
      SET name = ?, slug = ?, industry = ?, location = ?, plan = ?, status = ?
      WHERE id = ?
    `).run(item.name, item.slug, item.industry, item.location, item.plan, item.status, Number(id));
    if (patch.name) {
      db.prepare('UPDATE jobs SET company = ? WHERE companyId = ?').run(item.name, Number(id));
      db.prepare('UPDATE applications SET company = ? WHERE companyId = ?').run(item.name, Number(id));
    }
    return getCompany(id);
  }

  function requireCompanyContext(user) {
    const companyId = Number(user?.companyId || 0);
    if (!companyId) throw new Error('Tài khoản doanh nghiệp chưa được gắn với công ty. Hãy hoàn tất booking/gói đăng tuyển trước.');
    const company = getCompany(companyId);
    if (!company) throw new Error('Không tìm thấy doanh nghiệp của tài khoản này.');
    ensureCompanyWallet(companyId);
    return { companyId, company };
  }

  function ensureCompanyWallet(companyId) {
    const current = db.prepare('SELECT * FROM company_wallets WHERE companyId = ?').get(Number(companyId));
    if (current) return current;
    db.prepare('INSERT INTO company_wallets (companyId, balance, currency, updatedAt) VALUES (?, 0, ?, ?)').run(Number(companyId), 'VND', new Date().toISOString());
    return db.prepare('SELECT * FROM company_wallets WHERE companyId = ?').get(Number(companyId));
  }

  function addCompanyJob(user, payload = {}) {
    const { companyId, company } = requireCompanyContext(user);
    return addJob({
      ...payload,
      companyId,
      company: company.name,
      status: payload.status || 'Chờ kiểm duyệt',
      active: payload.active === true,
    });
  }

  function updateCompanyJob(user, id, patch = {}) {
    const { companyId, company } = requireCompanyContext(user);
    const current = normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number(id)));
    if (!current || Number(current.companyId || 0) !== companyId) throw new Error('Doanh nghiệp không có quyền sửa tin này.');
    return updateJob(Number(id), { ...patch, companyId, company: company.name });
  }

  function updateCompanyJobStatus(user, id, status = '') {
    const normalized = String(status || '').trim();
    const map = {
      publish: { status: 'Chờ kiểm duyệt', active: false },
      active: { status: 'Đang tuyển', active: true },
      pause: { status: 'Tạm dừng', active: false },
      close: { status: 'Đã đóng', active: false },
    };
    const patch = map[normalized] || { status: normalized || 'Tạm dừng', active: normalized === 'Đang tuyển' };
    return updateCompanyJob(user, id, patch);
  }

  function getJobs() {
    return db.prepare('SELECT * FROM jobs ORDER BY id DESC').all().map(normalizeJob);
  }

  function addJob(job) {
    const id = Date.now();
    db.prepare(`
      INSERT INTO jobs (id, title, company, companyId, location, salary, salaryNum, deadline, tags, dept, qty, applicants, status, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
    `).run(id, job.title, job.company || 'CVMS', job.companyId || 1, job.location, job.salary || 'Thỏa thuận', job.salaryNum || 0, job.deadline, JSON.stringify(job.tags || []), job.dept || 'Other', job.qty || 1, job.status || 'Đang tuyển');
    if (job.active === false) db.prepare('UPDATE jobs SET active = 0 WHERE id = ?').run(id);

    addNotification({
      role: 'user',
      type: 'new_job',
      title: '🆕 Vị trí tuyển dụng mới!',
      body: `"${job.title}" tại ${job.company || 'CVMS'} — ${job.location}`,
      jobId: id,
      companyId: job.companyId || 1,
    });
    return normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
  }

  function updateJob(id, patch) {
    const current = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!current) throw new Error('Job not found');
    const next = { ...normalizeJob(current), ...patch };
    db.prepare(`
      UPDATE jobs SET title=?, company=?, companyId=?, location=?, salary=?, salaryNum=?, deadline=?, tags=?, dept=?, qty=?, applicants=?, status=?, active=? WHERE id=?
    `).run(next.title, next.company, next.companyId || 1, next.location, next.salary, next.salaryNum || 0, next.deadline, JSON.stringify(next.tags || []), next.dept, next.qty || 1, next.applicants || 0, next.status, next.active === false ? 0 : 1, id);
    return normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
  }

  function closeJob(id) {
    db.prepare("UPDATE jobs SET active = 0, status = 'Đã đóng' WHERE id = ?").run(id);
    return normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
  }

  function getApplications() {
    return db.prepare('SELECT * FROM applications ORDER BY dateTs ASC').all().map(normalizeApplication);
  }

  function applyJob({ jobId, userEmail, userName }) {
    const duplicate = db.prepare('SELECT id FROM applications WHERE jobId = ? AND userEmail = ?').get(jobId, userEmail);
    if (duplicate) return { ok: false, msg: 'Bạn đã ứng tuyển vị trí này rồi!' };
    const job = normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId));
    if (!job || job.active === false) return { ok: false, msg: 'Vị trí không tồn tại hoặc đã đóng!' };

    const id = Date.now();
    const now = new Date();
    db.prepare(`
      INSERT INTO applications (id, jobId, companyId, jobTitle, company, location, userEmail, userName, status, pipelineStage, date, dateTs, adminNote)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Mới nộp', 'new', ?, ?, '')
    `).run(id, jobId, job.companyId || 1, job.title, job.company, job.location, userEmail, userName, now.toLocaleDateString('vi-VN'), Date.now());
    db.prepare('UPDATE jobs SET applicants = applicants + 1 WHERE id = ?').run(jobId);

    addNotification({
      role: job.companyId ? 'company' : 'admin',
      type: 'new_application',
      title: '🔔 Ứng viên mới!',
      body: `${userName} vừa nộp đơn vào "${job.title}"`,
      appId: id,
      companyId: job.companyId || 1,
      userEmail,
    });
    return { ok: true, app: normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(id)) };
  }

  function updateApplicationStatus(appId, newStatus, adminNote = '') {
    const pipelineStage = statusToStage(newStatus);
    db.prepare('UPDATE applications SET status = ?, adminNote = ?, pipelineStage = ? WHERE id = ?').run(newStatus, adminNote, pipelineStage, appId);
    const app = normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(appId));
    if (!app) throw new Error('Application not found');
    const messages = statusMessages(app, adminNote);
    if (messages[newStatus]) {
      addNotification({
        role: 'user',
        targetEmail: app.userEmail,
        type: 'status_update',
        title: '📋 Cập nhật đơn ứng tuyển',
        body: messages[newStatus],
        appId,
        companyId: app.companyId || null,
        jobTitle: app.jobTitle,
      });
    }
    return app;
  }

  function updatePipelineStage(appId, stage) {
    const stageStatusMap = { new: 'Mới nộp', screening: 'Đang xem xét', interview: 'Phỏng vấn', review: 'Đang xem xét', offer: 'Đã offer', hired: 'Đã offer', rejected: 'Từ chối' };
    db.prepare('UPDATE applications SET pipelineStage = ?, status = ? WHERE id = ?').run(stage, stageStatusMap[stage] || 'Đang xem xét', appId);
    const app = normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(appId));
    if (!app) throw new Error('Application not found');
    const stageLabel = { new: 'Mới', screening: 'Screening', interview: 'Phỏng vấn', review: 'Đánh giá', offer: 'Offer', hired: 'Nhận việc' };
    if (['interview', 'offer', 'hired'].includes(stage)) {
      addNotification({
        role: 'user',
        targetEmail: app.userEmail,
        type: 'pipeline_move',
        title: '📋 Cập nhật hồ sơ',
        body: `Đơn ứng tuyển "${app.jobTitle}" đã chuyển sang giai đoạn: ${stageLabel[stage]}`,
        appId,
        companyId: app.companyId || null,
      });
    }
    return app;
  }

  function register({ name, email, password, role = 'user' }) {
    if (!name || !email || !password) return { ok: false, msg: 'Thiếu thông tin đăng ký!' };
    if (email === 'admincv@gmail.com') return { ok: false, msg: 'Email này không được phép đăng ký!' };
    const exists = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
    if (exists) return { ok: false, msg: 'Email này đã được đăng ký!' };
    db.prepare("INSERT INTO users (email, name, password, role, companyRole) VALUES (?, ?, ?, ?, ?)").run(email, name, hashPassword(password), role === 'company' ? 'company' : 'user', role === 'company' ? 'Đối tác doanh nghiệp' : '');
    return { ok: true };
  }

  function login({ email, password }) {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row || !verifyPassword(password, row.password)) return { ok: false, msg: 'Email hoặc mật khẩu không đúng!' };
    if (!String(row.password).startsWith('pbkdf2$')) {
      db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashPassword(password), email);
    }
    const { password: _password, ...user } = row;
    return { ok: true, user: attachCompany(user) };
  }

  function getUserByEmail(email) {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) return null;
    const { password: _password, ...user } = row;
    return attachCompany(user);
  }

  function oauthLogin({ email, name, provider, role = 'user' }) {
    if (!email) return { ok: false, msg: 'OAuth không trả về email!' };
    let row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) {
      db.prepare("INSERT INTO users (email, name, password, role, companyRole) VALUES (?, ?, ?, ?, ?)")
        .run(email, name || email, `oauth:${provider || 'provider'}`, role === 'company' ? 'company' : 'user', role === 'company' ? 'Đối tác doanh nghiệp' : '');
      row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
    const { password: _password, ...user } = row;
    if (user.role === 'admin') user.platformRole = 'Quản trị nền tảng';
    if (user.role === 'company') user.platformRole = 'Đối tác doanh nghiệp';
    return { ok: true, user: attachCompany(user) };
  }

  function updateProfile(email, patch) {
    const next = buildProfilePatch(patch);
    db.prepare(`
      UPDATE users
      SET name = ?, phone = ?, address = ?, bio = ?, targetPosition = ?, experienceLevel = ?, education = ?, skills = ?, expectedSalary = ?, desiredLocations = ?, workType = ?, portfolio = ?, linkedin = ?
      WHERE email = ?
    `).run(next.name, next.phone, next.address, next.bio, next.targetPosition, next.experienceLevel, next.education, next.skills, next.expectedSalary, next.desiredLocations, next.workType, next.portfolio, next.linkedin, email);
    return attachCompany(db.prepare('SELECT email, name, role, companyId, companyRole, phone, address, bio, targetPosition, experienceLevel, education, skills, expectedSalary, desiredLocations, workType, portfolio, linkedin FROM users WHERE email = ?').get(email));
  }

  function addNotification(notification) {
    const item = buildNotification(notification);
    db.prepare(`
      INSERT INTO notifications (id, role, targetEmail, type, title, body, appId, jobId, companyId, jobTitle, userEmail, time, read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(item.id, item.role, item.targetEmail, item.type, item.title, item.body, item.appId, item.jobId, item.companyId, item.jobTitle, item.userEmail, item.time);
  }

  function addBookingRequest(payload) {
    const item = normalizeBookingRequestInput(payload);
    db.prepare(`
      INSERT INTO booking_requests (id, role, companyName, contactName, email, phone, industry, packageKey, packageLabel, jobTitle, quantity, duration, totalAmount, note, status, paymentStatus, paymentConfirmedAt, createdAt, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.role, item.companyName, item.contactName, item.email, item.phone, item.industry, item.packageKey, item.packageLabel, item.jobTitle, item.quantity, item.duration, item.totalAmount, item.note, item.status, item.paymentStatus, item.paymentConfirmedAt, item.createdAt, item.source);
    addNotification({
      role: 'admin',
      type: 'company_booking',
      title: '🏢 Yêu cầu booking mới',
      body: `${item.companyName} muốn đặt gói ${item.packageLabel} cho ${item.jobTitle || 'đăng tin tuyển dụng'}.`,
      userEmail: item.email,
    });
    return db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(item.id);
  }

  function getBookingRequests() {
    return db.prepare('SELECT * FROM booking_requests ORDER BY id DESC').all();
  }

  function ensureCompanyForBooking(booking = {}) {
    const companyName = String(booking.companyName || '').trim() || 'Doanh nghiệp chưa đặt tên';
    const slug = slugify(companyName);
    let company = db.prepare('SELECT * FROM companies WHERE slug = ? OR lower(name) = lower(?) LIMIT 1').get(slug, companyName);
    if (!company) {
      company = addCompany({
        name: companyName,
        slug,
        industry: booking.industry || 'Chưa phân loại',
        location: 'Hà Nội',
        plan: packageToPlan(booking.packageKey),
        status: 'active',
      });
    }
    if (booking.email) {
      db.prepare("UPDATE users SET companyId = ?, companyRole = 'Đối tác doanh nghiệp' WHERE email = ?").run(company.id, booking.email);
    }
    if (booking.id) {
      db.prepare('UPDATE booking_requests SET companyId = ? WHERE id = ?').run(company.id, booking.id);
    }
    return normalizeCompany(company);
  }

  function adminConfirmBookingPayment(id) {
    const bookingId = Number(id);
    const current = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    if (current.paymentStatus === 'admin_confirmed') return current;
    const company = ensureCompanyForBooking(current);
    const adminConfirmedAt = new Date().toLocaleString('vi-VN');
    db.prepare(`
      UPDATE booking_requests
      SET status = 'payment_confirmed', paymentStatus = 'admin_confirmed', adminConfirmedAt = ?, companyId = ?
      WHERE id = ?
    `).run(adminConfirmedAt, company.id, bookingId);
    addNotification({
      role: 'company',
      targetEmail: current.email,
      type: 'booking_payment_confirmed',
      title: 'Thanh toán booking đã được xác nhận',
      body: `Admin đã xác nhận thanh toán cho yêu cầu booking #${bookingId}.`,
      companyId: company.id,
      userEmail: current.email,
    });
    if (Number(current.totalAmount || 0) > 0) {
      db.prepare(`
        INSERT INTO platform_revenues (id, companyId, source, amount, refType, refId, recognizedAt, note)
        VALUES (?, ?, 'package_payment', ?, 'booking_request', ?, ?, ?)
      `).run(
        Date.now() + Math.floor(Math.random() * 1000),
        company.id,
        Number(current.totalAmount || 0),
        bookingId,
        new Date().toISOString(),
        `Doanh thu gói đăng tuyển ${current.packageLabel || current.packageKey || ''}`.trim(),
      );
    }
    return db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
  }

  function rejectBookingRequest(id, reason = '') {
    const bookingId = Number(id);
    const current = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    db.prepare("UPDATE booking_requests SET status = 'rejected', rejectedReason = ? WHERE id = ?").run(String(reason || '').trim(), bookingId);
    addNotification({
      role: 'company',
      targetEmail: current.email,
      type: 'booking_rejected',
      title: 'Yêu cầu booking cần kiểm tra lại',
      body: reason || `Yêu cầu booking #${bookingId} đã bị tạm từ chối. Vui lòng liên hệ admin.`,
      userEmail: current.email,
    });
    return db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
  }

  function createJobFromBooking(id, payload = {}) {
    const bookingId = Number(id);
    const booking = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
    if (!booking) throw new Error('Không tìm thấy yêu cầu booking.');
    const existingJobId = Number(booking.jobId || 0);
    if (existingJobId) {
      const existing = normalizeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(existingJobId));
      if (existing) return { booking, job: existing };
    }
    const company = ensureCompanyForBooking(booking);
    const job = addJob({
      title: payload.title || booking.jobTitle || 'Tin tuyển dụng mới',
      companyId: company.id,
      company: company.name,
      location: payload.location || company.location || 'Hà Nội',
      salary: payload.salary || 'Thỏa thuận',
      salaryNum: extractSalaryNumber(payload.salary || ''),
      deadline: payload.deadline || defaultDeadline(Number(booking.duration || 30)),
      tags: normalizeTags(payload.tags || booking.industry || booking.packageLabel || ''),
      dept: payload.dept || booking.industry || 'Other',
      qty: Math.max(1, Number(payload.qty || booking.quantity || 1)),
      status: 'Đang tuyển',
      active: true,
    });
    db.prepare("UPDATE booking_requests SET status = 'job_created', jobId = ?, companyId = ? WHERE id = ?").run(job.id, company.id, bookingId);
    addNotification({
      role: 'company',
      targetEmail: booking.email,
      type: 'booking_job_created',
      title: 'Tin tuyển dụng đã được đăng',
      body: `Admin đã tạo tin "${job.title}" từ yêu cầu booking #${bookingId}.`,
      jobId: job.id,
      companyId: company.id,
      userEmail: booking.email,
    });
    return { booking: db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId), job };
  }

  function shareApplicationWithCompany(appId, note = '') {
    const id = Number(appId);
    const current = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!current) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
    const sharedAt = new Date().toLocaleString('vi-VN');
    db.prepare(`
      UPDATE applications
      SET sharedToCompany = 1, sharedAt = ?, companyShareNote = ?
      WHERE id = ?
    `).run(sharedAt, String(note || '').trim(), id);
    const companyUser = current.companyId
      ? db.prepare("SELECT email FROM users WHERE role = 'company' AND companyId = ? LIMIT 1").get(current.companyId)
      : null;
    addNotification({
      role: 'company',
      targetEmail: companyUser?.email || null,
      type: 'candidate_shortlist',
      title: 'Admin đã gửi ứng viên phù hợp',
      body: `${current.userName || current.userEmail} đã được gửi sang doanh nghiệp cho vị trí "${current.jobTitle}".`,
      appId: id,
      companyId: current.companyId || null,
      jobTitle: current.jobTitle,
      userEmail: current.userEmail,
    });
    return normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(id));
  }

  function updateCompanyApplicationFeedback(appId, user, feedback = '') {
    const id = Number(appId);
    const current = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!current) throw new Error('Không tìm thấy hồ sơ ứng viên.');
    if (Number(user.companyId || 0) && Number(current.companyId || 0) !== Number(user.companyId)) {
      throw new Error('Doanh nghiệp không có quyền phản hồi hồ sơ này.');
    }
    const companyFeedbackAt = new Date().toLocaleString('vi-VN');
    db.prepare('UPDATE applications SET companyFeedback = ?, companyFeedbackAt = ? WHERE id = ?')
      .run(String(feedback || '').trim(), companyFeedbackAt, id);
    addNotification({
      role: 'admin',
      type: 'company_candidate_feedback',
      title: 'Doanh nghiệp phản hồi ứng viên',
      body: `${user.name || user.email} phản hồi hồ sơ "${current.userName || current.userEmail}": ${feedback || 'Đã xem hồ sơ'}`,
      appId: id,
      companyId: current.companyId || null,
      jobTitle: current.jobTitle,
      userEmail: current.userEmail,
    });
    return normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(id));
  }

  function getCompanyApplications(companyId) {
    const apps = db.prepare('SELECT * FROM applications WHERE companyId = ? ORDER BY dateTs DESC').all(Number(companyId)).map(normalizeApplication);
    const accesses = db.prepare('SELECT * FROM application_accesses WHERE companyId = ? ORDER BY createdAt DESC').all(Number(companyId));
    const accessByApp = new Map(accesses.map((item) => [Number(item.applicationId), item]));
    return apps.map((app) => anonymizeApplicationForCompany(app, accessByApp.get(Number(app.id))));
  }

  function logAudit(payload = {}) {
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actorEmail, actorRole, action, entityType, entityId, metadata, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        Date.now() + Math.floor(Math.random() * 1000),
        payload.actorEmail || '',
        payload.actorRole || '',
        payload.action || '',
        payload.entityType || '',
        payload.entityId || '',
        JSON.stringify(payload.metadata || {}),
        new Date().toISOString(),
      );
    } catch {}
  }

  function logDataAccess(payload = {}) {
    try {
      db.prepare(`
        INSERT INTO data_access_logs (id, actorEmail, companyId, applicationId, dataType, purpose, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        Date.now() + Math.floor(Math.random() * 1000),
        payload.actorEmail || '',
        payload.companyId || null,
        payload.applicationId || null,
        payload.dataType || 'unknown',
        payload.purpose || '',
        new Date().toISOString(),
      );
    } catch {}
  }

  function requestWalletTopup(user, payload = {}) {
    const { companyId } = requireCompanyContext(user);
    const amount = Math.max(0, Math.round(Number(payload.amount || 0)));
    if (amount < 50000) throw new Error('Số tiền nạp tối thiểu là 50.000đ.');
    const id = Date.now() + Math.floor(Math.random() * 1000);
    db.prepare(`
      INSERT INTO wallet_topups (id, companyId, requestedBy, amount, status, transferNote, createdAt)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, companyId, user.email, amount, String(payload.note || '').trim(), new Date().toISOString());
    addNotification({
      role: 'admin',
      type: 'wallet_topup_request',
      title: 'Doanh nghiệp yêu cầu nạp ví',
      body: `${user.companyName || user.name || user.email} yêu cầu nạp ${formatVnd(amount)}.`,
      companyId,
      userEmail: user.email,
    });
    return db.prepare('SELECT * FROM wallet_topups WHERE id = ?').get(id);
  }

  function adminConfirmWalletTopup(id, adminUser = {}) {
    const topupId = Number(id);
    const topup = db.prepare('SELECT * FROM wallet_topups WHERE id = ?').get(topupId);
    if (!topup) throw new Error('Không tìm thấy yêu cầu nạp ví.');
    if (topup.status === 'confirmed') return topup;
    const tx = db.transaction(() => {
      const wallet = ensureCompanyWallet(topup.companyId);
      const before = Number(wallet.balance || 0);
      const after = before + Number(topup.amount || 0);
      db.prepare("UPDATE company_wallets SET balance = ?, updatedAt = ? WHERE companyId = ?").run(after, new Date().toISOString(), topup.companyId);
      db.prepare(`
        INSERT INTO wallet_transactions (id, companyId, type, amount, balanceBefore, balanceAfter, refType, refId, note, createdAt)
        VALUES (?, ?, 'topup', ?, ?, ?, 'wallet_topup', ?, ?, ?)
      `).run(Date.now() + Math.floor(Math.random() * 1000), topup.companyId, topup.amount, before, after, topupId, 'Nạp ví đã được admin xác nhận', new Date().toISOString());
      db.prepare("UPDATE wallet_topups SET status = 'confirmed', confirmedBy = ?, confirmedAt = ? WHERE id = ?").run(adminUser.email || 'admin', new Date().toISOString(), topupId);
      logAudit({ actorEmail: adminUser.email || 'admin', actorRole: 'admin', action: 'confirm_wallet_topup', entityType: 'wallet_topup', entityId: String(topupId), metadata: { amount: topup.amount, companyId: topup.companyId } });
    });
    tx();
    return db.prepare('SELECT * FROM wallet_topups WHERE id = ?').get(topupId);
  }

  function unlockApplication(user, appId) {
    const { companyId } = requireCompanyContext(user);
    const id = Number(appId);
    const app = db.prepare('SELECT * FROM applications WHERE id = ? AND companyId = ?').get(id, companyId);
    if (!app) throw new Error('Không tìm thấy hồ sơ thuộc doanh nghiệp này.');
    const existing = db.prepare('SELECT * FROM application_accesses WHERE companyId = ? AND applicationId = ?').get(companyId, id);
    if (existing) return { ...existing, alreadyUnlocked: true };
    const tx = db.transaction(() => {
      const wallet = ensureCompanyWallet(companyId);
      const before = Number(wallet.balance || 0);
      if (before <= 0) throw new Error('Ví doanh nghiệp chưa có số dư để mở CV.');
      const setting = db.prepare("SELECT * FROM commission_settings WHERE id = 'default'").get() || { cvUnlockRate: 0.015 };
      const rate = clampCommissionRate(setting.cvUnlockRate);
      const fee = Math.max(1, Math.round(before * rate));
      if (before < fee) throw new Error('Số dư ví không đủ để mở CV.');
      const after = before - fee;
      const accessId = Date.now() + Math.floor(Math.random() * 1000);
      db.prepare('UPDATE company_wallets SET balance = ?, updatedAt = ? WHERE companyId = ?').run(after, new Date().toISOString(), companyId);
      db.prepare(`
        INSERT INTO application_accesses (id, companyId, applicationId, feeAmount, commissionRate, balanceBefore, balanceAfter, unlockedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(accessId, companyId, id, fee, rate, before, after, user.email, new Date().toISOString());
      db.prepare(`
        INSERT INTO wallet_transactions (id, companyId, type, amount, balanceBefore, balanceAfter, refType, refId, note, createdAt)
        VALUES (?, ?, 'cv_unlock_fee', ?, ?, ?, 'application_access', ?, ?, ?)
      `).run(Date.now() + Math.floor(Math.random() * 1000), companyId, -fee, before, after, accessId, `Phí mở CV ứng viên cho hồ sơ #${id}`, new Date().toISOString());
      db.prepare(`
        INSERT INTO platform_revenues (id, companyId, source, amount, refType, refId, recognizedAt, note)
        VALUES (?, ?, 'cv_unlock_fee', ?, 'application_access', ?, ?, ?)
      `).run(Date.now() + Math.floor(Math.random() * 1000), companyId, fee, accessId, new Date().toISOString(), `Doanh thu phí mở CV hồ sơ #${id}`);
      logAudit({ actorEmail: user.email, actorRole: 'company', action: 'unlock_application', entityType: 'application', entityId: String(id), metadata: { fee, rate, companyId } });
      logDataAccess({ actorEmail: user.email, companyId, applicationId: id, dataType: 'candidate_identity', purpose: 'unlock_application' });
    });
    tx();
    return db.prepare('SELECT * FROM application_accesses WHERE companyId = ? AND applicationId = ?').get(companyId, id);
  }

  function getApplicationCvUrl(user, appId) {
    const { companyId } = requireCompanyContext(user);
    const id = Number(appId);
    const app = db.prepare('SELECT * FROM applications WHERE id = ? AND companyId = ?').get(id, companyId);
    if (!app) throw new Error('Không tìm thấy hồ sơ thuộc doanh nghiệp này.');
    const access = db.prepare('SELECT * FROM application_accesses WHERE companyId = ? AND applicationId = ?').get(companyId, id);
    if (!access) throw new Error('Doanh nghiệp cần mở khóa hồ sơ trước khi xem CV.');
    const cv = getCv(app.userEmail);
    if (!cv?.storagePath) throw new Error('Ứng viên chưa tải CV riêng tư.');
    logDataAccess({ actorEmail: user.email, companyId, applicationId: id, dataType: 'cv_signed_url', purpose: 'company_unlocked_view' });
    return { storagePath: cv.storagePath, cv: redactCv(cv), access };
  }

  function updateCompanyPipelineStage(user, appId, stage, interview = {}) {
    const { companyId } = requireCompanyContext(user);
    const id = Number(appId);
    const current = db.prepare('SELECT * FROM applications WHERE id = ? AND companyId = ?').get(id, companyId);
    if (!current) throw new Error('Doanh nghiệp không có quyền cập nhật hồ sơ này.');
    db.prepare('UPDATE applications SET pipelineStage = ?, status = ?, interviewAt = ?, interviewNote = ? WHERE id = ?')
      .run(stage, stageStatus(stage), interview.interviewAt || current.interviewAt || null, interview.interviewNote || current.interviewNote || '', id);
    return normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(id));
  }

  function getAdminFinance() {
    const wallets = db.prepare('SELECT * FROM company_wallets ORDER BY updatedAt DESC').all();
    const topups = db.prepare('SELECT * FROM wallet_topups ORDER BY createdAt DESC').all();
    const transactions = db.prepare('SELECT * FROM wallet_transactions ORDER BY createdAt DESC LIMIT 100').all();
    const revenues = db.prepare('SELECT * FROM platform_revenues ORDER BY recognizedAt DESC LIMIT 100').all();
    const settings = db.prepare('SELECT * FROM commission_settings').all();
    return buildFinanceSummary({ wallets, topups, transactions, revenues, settings });
  }

  function updateCommissionSetting(rate, adminUser = {}) {
    const normalized = clampCommissionRate(rate);
    db.prepare(`
      INSERT INTO commission_settings (id, cvUnlockRate, updatedBy, updatedAt)
      VALUES ('default', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET cvUnlockRate=excluded.cvUnlockRate, updatedBy=excluded.updatedBy, updatedAt=excluded.updatedAt
    `).run(normalized, adminUser.email || 'admin', new Date().toISOString());
    logAudit({ actorEmail: adminUser.email || 'admin', actorRole: 'admin', action: 'update_commission', entityType: 'commission_settings', entityId: 'default', metadata: { rate: normalized } });
    return db.prepare("SELECT * FROM commission_settings WHERE id = 'default'").get();
  }

  function moderateJob(user, id, decision = 'approve', note = '') {
    if (user?.role !== 'admin') throw new Error('Chỉ admin nền tảng được kiểm duyệt tin.');
    const patch = decision === 'reject'
      ? { status: 'Bị từ chối', active: false, moderationNote: String(note || '').trim() }
      : { status: 'Đang tuyển', active: true, moderationNote: String(note || '').trim() };
    return updateJob(Number(id), patch);
  }

  function getCompanyDashboard(user) {
    const { companyId } = requireCompanyContext(user);
    const byEmail = db.prepare('SELECT * FROM booking_requests WHERE email = ? ORDER BY id DESC').all(user.email || '');
    const byCompany = companyId
      ? db.prepare('SELECT * FROM booking_requests WHERE companyId = ? ORDER BY id DESC').all(companyId)
      : [];
    const bookings = mergeById([...byEmail, ...byCompany]);
    const jobs = companyId
      ? db.prepare('SELECT * FROM jobs WHERE companyId = ? ORDER BY id DESC').all(companyId).map(normalizeJob)
      : [];
    const applications = getCompanyApplications(companyId);
    const wallet = ensureCompanyWallet(companyId);
    const topups = db.prepare('SELECT * FROM wallet_topups WHERE companyId = ? ORDER BY createdAt DESC').all(companyId);
    const walletTransactions = db.prepare('SELECT * FROM wallet_transactions WHERE companyId = ? ORDER BY createdAt DESC LIMIT 80').all(companyId);
    const unlocked = db.prepare('SELECT * FROM application_accesses WHERE companyId = ? ORDER BY createdAt DESC').all(companyId);
    return { user: attachCompany(user), companyId, bookings, jobs, applications, shortlisted: applications.filter((app) => app.unlocked), wallet, topups, walletTransactions, unlocked };
  }

  function confirmBookingPayment(id, email = '') {
    const bookingId = Number(id);
    const current = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
    if (!current) throw new Error('Không tìm thấy yêu cầu booking.');
    const suppliedEmail = String(email || '').trim().toLowerCase();
    if (suppliedEmail && String(current.email || '').trim().toLowerCase() !== suppliedEmail) {
      throw new Error('Email xác nhận không khớp với yêu cầu booking.');
    }
    const paymentConfirmedAt = new Date().toLocaleString('vi-VN');
    db.prepare(`
      UPDATE booking_requests
      SET status = 'waiting_admin_confirm', paymentStatus = 'customer_confirmed', paymentConfirmedAt = ?
      WHERE id = ?
    `).run(paymentConfirmedAt, bookingId);
    const booking = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(bookingId);
    addNotification({
      role: 'admin',
      type: 'company_booking_payment',
      title: '💳 Doanh nghiệp đã xác nhận chuyển khoản',
      body: `${booking.companyName || current.companyName} đã xác nhận chuyển khoản cho booking #${booking.id || bookingId}.`,
      userEmail: booking.email || current.email,
    });
    return booking;
  }

  function getNotifications(role, email, companyId = null) {
    if (role === 'admin') return db.prepare("SELECT * FROM notifications WHERE role = 'admin' ORDER BY id DESC LIMIT 50").all().map(normalizeNotification);
    if (role === 'company') {
      return db.prepare(`
        SELECT * FROM notifications
        WHERE role = 'company' AND (targetEmail = ? OR companyId = ?)
        ORDER BY id DESC LIMIT 100
      `).all(email || '', Number(companyId || 0)).map(normalizeNotification);
    }
    return db.prepare("SELECT * FROM notifications WHERE role = 'user' AND (targetEmail IS NULL OR targetEmail = ?) ORDER BY id DESC LIMIT 100").all(email || '').map(normalizeNotification);
  }

  function markNotificationsRead(role, email, companyId = null) {
    if (role === 'admin') db.prepare("UPDATE notifications SET read = 1 WHERE role = 'admin'").run();
    else if (role === 'company') db.prepare("UPDATE notifications SET read = 1 WHERE role = 'company' AND (targetEmail = ? OR companyId = ?)").run(email || '', Number(companyId || 0));
    else db.prepare("UPDATE notifications SET read = 1 WHERE role = 'user' AND (targetEmail IS NULL OR targetEmail = ?)").run(email || '');
  }

  function getCvIndex() {
    const rows = db.prepare('SELECT email, name, ext, size, uploadedAt, industries FROM cvs ORDER BY uploadedAt DESC').all();
    return Object.fromEntries(rows.map((row) => [row.email, normalizeCv(row)]));
  }

  function getCv(email) {
    return redactCv(normalizeCv(db.prepare('SELECT * FROM cvs WHERE email = ?').get(email) || null));
  }

  async function saveCv(email, cv) {
    const file = decodeDataUrl(cv.dataUrl || cv.base64 || '');
    const ext = String(cv.ext || '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const relativePath = `${safeStorageSegment(email)}-${Date.now()}.${ext}`;
    await writeFile(join(localCvDir, relativePath), file.buffer);
    const current = db.prepare('SELECT storagePath FROM cvs WHERE email = ?').get(email);
    if (current?.storagePath) {
      try { await unlink(join(localCvDir, current.storagePath)); } catch {}
    }
    db.prepare(`
      INSERT INTO cvs (email, name, type, ext, size, base64, storageBucket, storagePath, uploadedAt, industries)
      VALUES (?, ?, ?, ?, ?, '', 'local-private-cvs', ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name, type=excluded.type, ext=excluded.ext, size=excluded.size, base64='', storageBucket=excluded.storageBucket, storagePath=excluded.storagePath, uploadedAt=excluded.uploadedAt, industries=excluded.industries
    `).run(email, cv.name, file.mimeType || cv.type || 'application/octet-stream', ext, file.buffer.length || cv.size, relativePath, cv.uploadedAt || new Date().toLocaleString('vi-VN'), JSON.stringify(normalizeIndustries(cv.industries)));
    return getCv(email);
  }

  async function deleteCv(email) {
    const current = db.prepare('SELECT storagePath FROM cvs WHERE email = ?').get(email);
    db.prepare('DELETE FROM cvs WHERE email = ?').run(email);
    if (current?.storagePath) {
      try { await unlink(join(localCvDir, current.storagePath)); } catch {}
    }
  }

  async function readLocalCv(storagePath) {
    const target = join(localCvDir, storagePath);
    if (!target.startsWith(localCvDir)) throw new Error('Invalid CV path');
    return readFile(target);
  }

  function saveApplicationAssessment(appId, assessment) {
    const score = Number.isFinite(Number(assessment.aiScore)) ? Math.max(0, Math.min(100, Math.round(Number(assessment.aiScore)))) : null;
    const evaluatedAt = assessment.aiEvaluatedAt || new Date().toLocaleString('vi-VN');
    db.prepare(`
      UPDATE applications
      SET aiScore = ?, aiFitLevel = ?, aiEvaluation = ?, aiEvaluatedAt = ?
      WHERE id = ?
    `).run(score, assessment.aiFitLevel || '', JSON.stringify(assessment.aiEvaluation || {}), evaluatedAt, appId);
    return normalizeApplication(db.prepare('SELECT * FROM applications WHERE id = ?').get(appId));
  }

  function getSavedJobs(email) {
    return db.prepare('SELECT jobId, savedAt FROM saved_jobs WHERE userEmail = ? ORDER BY savedAt DESC').all(email || '');
  }

  function toggleSavedJob(email, jobId) {
    const current = db.prepare('SELECT jobId FROM saved_jobs WHERE userEmail = ? AND jobId = ?').get(email, jobId);
    if (current) {
      db.prepare('DELETE FROM saved_jobs WHERE userEmail = ? AND jobId = ?').run(email, jobId);
      return { saved: false, jobId };
    }
    db.prepare('INSERT INTO saved_jobs (userEmail, jobId, savedAt) VALUES (?, ?, ?)').run(email, jobId, new Date().toLocaleString('vi-VN'));
    return { saved: true, jobId };
  }

  function attachCompany(user) {
    if (!user) return user;
    const company = user.companyId ? getCompany(user.companyId) : null;
    return {
      ...user,
      companyId: user.companyId || null,
      companyName: company?.name || '',
      companySlug: company?.slug || '',
      companyIndustry: company?.industry || '',
      companyPlan: company?.plan || '',
      companyStatus: company?.status || '',
      companyRejectedReason: company?.rejectedReason || company?.rejected_reason || '',
      platformRole: user.role === 'admin' ? 'Quản trị nền tảng' : user.role === 'company' ? 'Đối tác doanh nghiệp' : user.platformRole || '',
    };
  }

  return {
    provider: 'sqlite',
    dbPath,
    init,
    getCompanies,
    getCompany,
    addCompany,
    updateCompany,
    getJobs,
    addJob,
    updateJob,
    closeJob,
    addCompanyJob,
    updateCompanyJob,
    updateCompanyJobStatus,
    getApplications,
    applyJob,
    updateApplicationStatus,
    updatePipelineStage,
    updateCompanyPipelineStage,
    register,
    login,
    getUserByEmail,
    oauthLogin,
    updateProfile,
    getNotifications,
    markNotificationsRead,
    addBookingRequest,
    getBookingRequests,
    confirmBookingPayment,
    adminConfirmBookingPayment,
    rejectBookingRequest,
    createJobFromBooking,
    shareApplicationWithCompany,
    updateCompanyApplicationFeedback,
    getCompanyDashboard,
    getCvUnlockQuote,
    requestSubscription,
    adminConfirmSubscription,
    requestRefund,
    adminApproveRefund,
    createDispute,
    requestWalletTopup,
    adminConfirmWalletTopup,
    unlockApplication,
    getApplicationCvUrl,
    getUserCvUrl,
    getAdminFinance,
    updateCommissionSetting,
    moderateJob,
    getCvIndex,
    getCv,
    saveCv,
    deleteCv,
    readLocalCv,
    saveApplicationAssessment,
    getSavedJobs,
    toggleSavedJob,
  };
}

function statusMessages(app, adminNote = '') {
  return {
    'Đang xem xét': `Hồ sơ của bạn đang được xem xét cho vị trí "${app.jobTitle}"`,
    'Phỏng vấn': `🎉 Chúc mừng! Bạn được mời phỏng vấn vị trí "${app.jobTitle}" tại ${app.company}`,
    'Đã offer': `🏆 Chúc mừng! Bạn nhận được offer cho vị trí "${app.jobTitle}"${adminNote ? ' — ' + adminNote : ''}`,
    'Từ chối': `Rất tiếc, hồ sơ của bạn cho vị trí "${app.jobTitle}" không phù hợp lúc này.`,
  };
}

function statusToStage(status) {
  return {
    'Mới nộp': 'new',
    'Đang xem xét': 'screening',
    'Phỏng vấn': 'interview',
    'Đã offer': 'offer',
    'Từ chối': 'rejected',
  }[status] || 'new';
}

function buildNotification({ role, targetEmail = null, type = null, title, body, appId = null, jobId = null, companyId = null, jobTitle = null, userEmail = null }) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    role,
    targetEmail,
    type,
    title,
    body,
    appId,
    jobId,
    companyId,
    jobTitle,
    userEmail,
    time: new Date().toLocaleString('vi-VN'),
    read: false,
  };
}

function serializeJob(job) {
  return {
    ...job,
    tags: Array.isArray(job.tags) ? job.tags : JSON.parse(job.tags || '[]'),
    active: job.active !== false && job.active !== 0,
  };
}

function normalizeJob(row) {
  if (!row) return null;
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
    active: row.active !== 0 && row.active !== false,
  };
}

function normalizeNotification(row) {
  return { ...row, read: row.read === 1 || row.read === true };
}

function normalizeBookingRequestInput(payload = {}) {
  const packageKey = String(payload.packageKey || payload.package || 'basic').trim().toLowerCase();
  const packageLabels = { basic: 'Basic', standard: 'Standard', priority: 'Priority' };
  const quantity = Math.max(1, Number(payload.quantity || payload.postCount || 1));
  const duration = Math.max(7, Number(payload.duration || 30));
  const priceMap = { basic: 1500000, standard: 3500000, priority: 5900000 };
  const totalAmount = Number.isFinite(Number(payload.totalAmount))
    ? Math.max(0, Number(payload.totalAmount))
    : priceMap[packageKey] ? priceMap[packageKey] * quantity : 0;
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    role: payload.submittedRole === 'company' ? 'company' : 'company',
    companyName: String(payload.companyName || '').trim() || 'Doanh nghiệp chưa đặt tên',
    contactName: String(payload.contactName || payload.name || '').trim() || 'Người liên hệ',
    email: String(payload.email || payload.contactEmail || '').trim().toLowerCase(),
    phone: String(payload.phone || '').trim(),
    industry: String(payload.industry || '').trim(),
    packageKey,
    packageLabel: packageLabels[packageKey] || String(payload.packageLabel || 'Basic').trim(),
    jobTitle: String(payload.jobTitle || '').trim(),
    quantity,
    duration,
    totalAmount,
    note: String(payload.note || '').trim(),
    status: 'pending_payment',
    paymentStatus: 'waiting_transfer',
    paymentConfirmedAt: '',
    adminConfirmedAt: '',
    rejectedReason: '',
    companyId: Number(payload.companyId || 0) || null,
    jobId: Number(payload.jobId || 0) || null,
    createdAt: new Date().toLocaleString('vi-VN'),
    source: String(payload.source || 'public').trim(),
  };
}

function packageToPlan(packageKey) {
  return {
    basic: 'Starter',
    standard: 'Growth',
    priority: 'Enterprise',
  }[String(packageKey || '').toLowerCase()] || 'Starter';
}

function extractSalaryNumber(salary) {
  const nums = String(salary || '').match(/\d+/g);
  return nums ? Number(nums[0]) : 0;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function defaultDeadline(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(7, Number(days || 30)));
  return date.toLocaleDateString('vi-VN');
}

function mergeById(items = []) {
  const map = new Map();
  for (const item of items) {
    if (!item || item.id === undefined || item.id === null) continue;
    map.set(Number(item.id), item);
  }
  return [...map.values()].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

function normalizeCompany(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    status: row.status || 'active',
  };
}

function normalizeCompanyInput(company = {}, id = Date.now(), partial = false) {
  const next = {};
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'id')) next.id = Number(company.id || id);
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'name')) {
    next.name = String(company.name || '').trim() || 'Doanh nghiệp chưa đặt tên';
  }
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'slug') || Object.prototype.hasOwnProperty.call(company, 'name')) {
    next.slug = String(company.slug || slugify(next.name || company.name || '')).trim();
  }
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'industry')) next.industry = String(company.industry || '').trim();
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'location')) next.location = String(company.location || '').trim();
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'plan')) next.plan = String(company.plan || 'Starter').trim();
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'status')) next.status = normalizeCompanyStatus(company.status || 'pending');
  if (!partial || Object.prototype.hasOwnProperty.call(company, 'createdAt')) next.createdAt = company.createdAt || new Date().toLocaleString('vi-VN');
  return next;
}

function normalizeCompanyStatus(value) {
  const status = String(value || 'pending').toLowerCase().trim();
  const allowed = new Set(['pending', 'verified', 'rejected', 'suspended', 'active', 'paused', 'blocked']);
  return allowed.has(status) ? status : 'pending';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `company-${Date.now()}`;
}

function normalizeApplication(row) {
  if (!row) return null;
  let aiEvaluation = null;
  if (row.aiEvaluation) {
    try { aiEvaluation = JSON.parse(row.aiEvaluation); } catch { aiEvaluation = row.aiEvaluation; }
  }
  return {
    ...row,
    aiScore: row.aiScore === null || row.aiScore === undefined ? null : Number(row.aiScore),
    aiEvaluation,
    sharedToCompany: row.sharedToCompany === 1 || row.sharedToCompany === true,
  };
}

function normalizeIndustries(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeIndustries(parsed);
    } catch {}
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeCv(row) {
  if (!row) return null;
  return { ...row, industries: normalizeIndustries(row.industries) };
}

function redactCv(cv) {
  if (!cv) return null;
  const { base64: _base64, ...safe } = normalizeCv(cv);
  return safe;
}

function anonymizeApplicationForCompany(app, access = null) {
  const unlocked = Boolean(access);
  const candidateCode = `UV-${String(app.id || '').slice(-6).padStart(6, '0')}`;
  const base = {
    ...app,
    candidateCode,
    unlocked,
    unlockFee: access?.feeAmount || null,
    unlockedAt: access?.createdAt || null,
  };
  if (unlocked) return base;
  return {
    ...base,
    userName: candidateCode,
    userEmail: maskEmail(app.userEmail),
    phone: '',
    cvUrl: '',
    identityHidden: true,
  };
}

function maskEmail(email = '') {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return 'Ẩn email';
  return `${name.slice(0, 2)}***@${domain}`;
}

function decodeDataUrl(value = '') {
  const text = String(value || '');
  const match = text.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return { mimeType: 'application/octet-stream', buffer: Buffer.from(text, 'base64') };
  const mimeType = match[1] || 'application/octet-stream';
  const body = match[3] || '';
  const buffer = match[2] ? Buffer.from(body, 'base64') : Buffer.from(decodeURIComponent(body));
  return { mimeType, buffer };
}

function safeStorageSegment(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || `file_${Date.now()}`;
}

function clampCommissionRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return 0.015;
  if (value > 1) return Math.min(0.02, Math.max(0.01, value / 100));
  return Math.min(0.02, Math.max(0.01, value));
}

function stageStatus(stage) {
  return {
    new: 'Mới nộp',
    screening: 'Đang xem xét',
    interview: 'Phỏng vấn',
    review: 'Đang xem xét',
    offer: 'Đã offer',
    hired: 'Đã offer',
    rejected: 'Từ chối',
  }[stage] || 'Đang xem xét';
}

function formatVnd(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function buildFinanceSummary({ wallets = [], topups = [], transactions = [], revenues = [], settings = [] }) {
  const confirmedTopups = topups.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recognizedRevenue = revenues.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const packageRevenue = revenues.filter((item) => item.source === 'package_payment').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cvUnlockRevenue = revenues.filter((item) => item.source === 'cv_unlock_fee').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    wallets,
    topups,
    transactions,
    revenues,
    settings,
    summary: {
      walletTopupsNotRevenue: confirmedTopups,
      recognizedRevenue,
      packageRevenue,
      cvUnlockRevenue,
      pendingTopups: topups.filter((item) => item.status === 'pending').length,
      commissionRate: clampCommissionRate(settings.find((item) => item.id === 'default')?.cvUnlockRate),
    },
  };
}

function buildProfilePatch(patch) {
  return {
    name: patch.name || '',
    phone: patch.phone || '',
    address: patch.address || '',
    bio: patch.bio || '',
    targetPosition: patch.targetPosition || '',
    experienceLevel: patch.experienceLevel || '',
    education: patch.education || '',
    skills: patch.skills || '',
    expectedSalary: patch.expectedSalary || '',
    desiredLocations: patch.desiredLocations || '',
    workType: patch.workType || '',
    portfolio: patch.portfolio || '',
    linkedin: patch.linkedin || '',
  };
}

function encodeFilter(value) {
  return encodeURIComponent(value);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!String(stored).startsWith('pbkdf2$')) return password === stored;
  const [, roundsText, salt, hash] = stored.split('$');
  const actual = pbkdf2Sync(password, salt, Number(roundsText), 32, 'sha256');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
