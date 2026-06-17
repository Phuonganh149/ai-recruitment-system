import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createStore } from './db-adapter.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
await loadEnv();

const port = Number(process.env.PORT || 4173);
const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const sessions = new Map();
const oauthStates = new Map();
const cvFileTokens = new Map();
const rateBuckets = new Map();
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Điền API/OAuth key trực tiếp tại đây nếu bạn không muốn dùng .env.
// Khuyến nghị thật: vẫn nên để key trong .env để tránh lộ khi share code.
const CODE_KEYS = {
  GROQ_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GITHUB_CLIENT_ID: '',
  GITHUB_CLIENT_SECRET: '',
  FACEBOOK_CLIENT_ID: '',
  FACEBOOK_CLIENT_SECRET: '',
};

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const secretConfig = {
  groqApiKey: process.env.GROQ_API_KEY || CODE_KEYS.GROQ_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || CODE_KEYS.ANTHROPIC_API_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID || CODE_KEYS.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || CODE_KEYS.GOOGLE_CLIENT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID || CODE_KEYS.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || CODE_KEYS.GITHUB_CLIENT_SECRET,
  facebookClientId: process.env.FACEBOOK_CLIENT_ID || CODE_KEYS.FACEBOOK_CLIENT_ID,
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET || CODE_KEYS.FACEBOOK_CLIENT_SECRET,
};

const defaultCompanies = [
  { id: 1, name: 'CVMS Technology', slug: 'cvms-technology', industry: 'Công nghệ & Dịch vụ số', location: 'Hà Nội', plan: 'Enterprise', status: 'active' },
  { id: 2, name: 'Nova Retail', slug: 'nova-retail', industry: 'Bán lẻ & Thương mại', location: 'Hồ Chí Minh', plan: 'Growth', status: 'active' },
  { id: 3, name: 'Mekong Logistics', slug: 'mekong-logistics', industry: 'Vận hành & Logistics', location: 'Cần Thơ', plan: 'Growth', status: 'active' },
  { id: 4, name: 'Bright EduCare', slug: 'bright-educare', industry: 'Giáo dục & Đào tạo', location: 'Đà Nẵng', plan: 'Starter', status: 'active' },
  { id: 5, name: 'Aster Finance', slug: 'aster-finance', industry: 'Tài chính & Kế toán', location: 'Hà Nội', plan: 'Starter', status: 'active' },
];

const defaultJobs = [
  { id: 1, title: 'Chuyên viên Marketing Nội dung', company: 'CVMS Marketing', location: 'Hà Nội', salary: '12-16 tr', salaryNum: 12, deadline: '25/07/2026', tags: ['Marketing', 'Content', 'SEO', 'Toàn thời gian'], dept: 'Marketing', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 2, title: 'Nhân viên Kinh doanh B2B', company: 'CVMS Commercial', location: 'Hồ Chí Minh', salary: '10-18 tr + hoa hồng', salaryNum: 10, deadline: '30/07/2026', tags: ['Kinh doanh', 'Sales', 'CRM', 'Toàn thời gian'], dept: 'Kinh doanh', qty: 5, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 3, title: 'Kế toán Tổng hợp', company: 'CVMS Finance', location: 'Hà Nội', salary: '13-18 tr', salaryNum: 13, deadline: '18/07/2026', tags: ['Tài chính', 'Kế toán', 'Excel', 'Thuế'], dept: 'Tài chính - Kế toán', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 4, title: 'Chuyên viên Tuyển dụng', company: 'CVMS Human Resources', location: 'Đà Nẵng', salary: '11-15 tr', salaryNum: 11, deadline: '22/07/2026', tags: ['Nhân sự', 'Tuyển dụng', 'Phỏng vấn'], dept: 'Nhân sự', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 5, title: 'Nhân viên Chăm sóc Khách hàng', company: 'CVMS Service Center', location: 'Cần Thơ', salary: '8-12 tr', salaryNum: 8, deadline: '20/07/2026', tags: ['Dịch vụ khách hàng', 'CSKH', 'Giao tiếp', 'Ca xoay'], dept: 'Dịch vụ khách hàng', qty: 6, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 6, title: 'Chuyên viên Logistics', company: 'CVMS Supply Chain', location: 'Hồ Chí Minh', salary: '12-17 tr', salaryNum: 12, deadline: '28/07/2026', tags: ['Logistics', 'Vận hành', 'Kho vận', 'Excel'], dept: 'Vận hành - Logistics', qty: 3, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 7, title: 'UI/UX Designer', company: 'CVMS Digital', location: 'Đà Nẵng', salary: '14-20 tr', salaryNum: 14, deadline: '24/07/2026', tags: ['Thiết kế', 'Figma', 'UX Research', 'Product'], dept: 'Thiết kế - Sáng tạo', qty: 1, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 8, title: 'Pháp chế Doanh nghiệp', company: 'CVMS Legal', location: 'Hà Nội', salary: '16-24 tr', salaryNum: 16, deadline: '05/08/2026', tags: ['Pháp lý', 'Hợp đồng', 'Compliance'], dept: 'Pháp lý - Tuân thủ', qty: 1, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 9, title: 'Nhân viên Hành chính Văn phòng', company: 'CVMS Operations', location: 'Hà Nội', salary: '8-11 tr', salaryNum: 8, deadline: '17/07/2026', tags: ['Hành chính', 'Văn phòng', 'Mua sắm'], dept: 'Hành chính', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 10, title: 'Chuyên viên Đào tạo Nội bộ', company: 'CVMS Academy', location: 'Hồ Chí Minh', salary: '12-18 tr', salaryNum: 12, deadline: '26/07/2026', tags: ['Giáo dục', 'Đào tạo', 'L&D', 'Thuyết trình'], dept: 'Giáo dục - Đào tạo', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 11, title: 'Nhân viên QA/QC Sản xuất', company: 'CVMS Manufacturing', location: 'Bình Dương', salary: '10-14 tr', salaryNum: 10, deadline: '02/08/2026', tags: ['Sản xuất', 'QA/QC', 'Quy trình', 'ISO'], dept: 'Sản xuất - Kỹ thuật', qty: 4, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 12, title: 'Chuyên viên Truyền thông Nội bộ', company: 'CVMS Communications', location: 'Hà Nội', salary: '11-16 tr', salaryNum: 11, deadline: '29/07/2026', tags: ['Truyền thông', 'Sự kiện', 'Content'], dept: 'Marketing', qty: 1, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 13, title: 'Business Analyst', company: 'CVMS Business Solutions', location: 'Hồ Chí Minh', salary: '18-28 tr', salaryNum: 18, deadline: '08/08/2026', tags: ['Phân tích nghiệp vụ', 'Quy trình', 'Stakeholder'], dept: 'Phân tích nghiệp vụ', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 14, title: 'Data Analyst', company: 'CVMS Analytics', location: 'Hà Nội', salary: '16-24 tr', salaryNum: 16, deadline: '31/07/2026', tags: ['Dữ liệu', 'SQL', 'Power BI', 'Dashboard'], dept: 'Dữ liệu - Phân tích', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 15, title: 'Frontend Developer', company: 'CVMS Technology', location: 'Hà Nội', salary: '18-26 tr', salaryNum: 18, deadline: '27/07/2026', tags: ['Công nghệ thông tin', 'React', 'TypeScript'], dept: 'Công nghệ thông tin', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 16, title: 'Điều phối Dự án', company: 'CVMS PMO', location: 'Đà Nẵng', salary: '12-18 tr', salaryNum: 12, deadline: '03/08/2026', tags: ['Quản lý dự án', 'PMO', 'Điều phối'], dept: 'Quản lý dự án', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 17, title: 'Chuyên viên Mua hàng', company: 'CVMS Procurement', location: 'Hồ Chí Minh', salary: '11-16 tr', salaryNum: 11, deadline: '06/08/2026', tags: ['Mua hàng', 'Đàm phán', 'Nhà cung cấp'], dept: 'Mua hàng', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 18, title: 'Nhân viên Thiết kế Đồ họa', company: 'CVMS Creative', location: 'Hà Nội', salary: '10-15 tr', salaryNum: 10, deadline: '23/07/2026', tags: ['Thiết kế', 'Photoshop', 'Illustrator', 'Branding'], dept: 'Thiết kế - Sáng tạo', qty: 2, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 19, title: 'Chuyên viên Kiểm soát Nội bộ', company: 'CVMS Finance', location: 'Hà Nội', salary: '15-22 tr', salaryNum: 15, deadline: '10/08/2026', tags: ['Kiểm soát nội bộ', 'Rủi ro', 'Quy trình'], dept: 'Tài chính - Kế toán', qty: 1, applicants: 0, status: 'Đang tuyển', active: true },
  { id: 20, title: 'Thực tập sinh Nhân sự', company: 'CVMS Human Resources', location: 'Hồ Chí Minh', salary: '3-5 tr', salaryNum: 3, deadline: '15/08/2026', tags: ['Nhân sự', 'Thực tập', 'Tuyển dụng'], dept: 'Nhân sự', qty: 4, applicants: 0, status: 'Đang tuyển', active: true },
];

applyDemoCompanyOwnership(defaultJobs, defaultCompanies);

const store = await createStore(root, defaultJobs, defaultCompanies);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    if ((req.url || '').startsWith('/api/')) {
      if (!checkRateLimit(req, res)) return;
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Internal server error', detail: error.message });
  }
}).listen(port, () => {
  console.log(`CVMS backend + web: http://localhost:${port}`);
  console.log(`Database provider: ${store.provider}${store.dbPath ? ` (${store.dbPath})` : ''}`);
});


function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
}

function checkRateLimit(req, res) {
  const method = req.method || 'GET';
  if (!WRITE_METHODS.has(method) && !(req.url || '').includes('/api/auth/login')) return true;
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').toString().split(',')[0].trim();
  const now = Date.now();
  const windowMs = 60_000;
  const isAuthRoute = (req.url || '').includes('/api/auth/login') || (req.url || '').includes('/api/auth/register');
  const max = isAuthRoute ? 10 : 90;
  const key = `${ip}:${(req.url || '').split('?')[0]}:${method}`;
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > max) {
    sendJson(res, 429, { error: 'B?n thao t?c qu? nhanh. Vui l?ng th? l?i sau ?t ph?t.' });
    return false;
  }
  return true;
}

async function loadEnv() {
  try {
    const raw = await readFile(join(root, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...parts] = trimmed.split('=');
      if (!process.env[key]) process.env[key] = parts.join('=').trim();
    }
  } catch {
    // .env is optional
  }
}

function applyDemoCompanyOwnership(jobs, companies) {
  const byId = Object.fromEntries(companies.map((company) => [company.id, company]));
  const deptCompanyMap = {
    'Công nghệ thông tin': 1,
    'Dữ liệu - Phân tích': 1,
    'Phân tích nghiệp vụ': 1,
    'Quản lý dự án': 1,
    'Marketing': 2,
    'Kinh doanh': 2,
    'Thiết kế - Sáng tạo': 2,
    'Dịch vụ khách hàng': 2,
    'Vận hành - Logistics': 3,
    'Sản xuất - Kỹ thuật': 3,
    'Mua hàng': 3,
    'Hành chính': 3,
    'Giáo dục - Đào tạo': 4,
    'Nhân sự': 4,
    'Tài chính - Kế toán': 5,
    'Pháp lý - Tuân thủ': 5,
  };
  for (const job of jobs) {
    const companyId = deptCompanyMap[job.dept] || 1;
    const company = byId[companyId] || byId[1];
    job.companyId = company.id;
    job.company = company.name;
  }
}

async function normalizeJobPayloadForPlatform(res, body = {}, partial = false) {
  const payload = { ...body };
  const rawCompanyId = payload.companyId === undefined || payload.companyId === null || payload.companyId === ''
    ? 0
    : Number(payload.companyId);
  if (rawCompanyId) {
    const company = await store.getCompany(rawCompanyId);
    if (!company) {
      sendJson(res, 400, { error: 'Doanh nghiệp tuyển dụng không tồn tại.' });
      return null;
    }
    payload.companyId = company.id;
    payload.company = company.name;
    return payload;
  }
  if (!partial) {
    sendJson(res, 400, { error: 'Vui lòng chọn doanh nghiệp tuyển dụng.' });
    return null;
  }
  return payload;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? await readJson(req) : {};
  const authUser = await getAuthUser(req);

  if (method === 'GET' && path === '/api/health') return sendJson(res, 200, { ok: true, database: store.provider });
  if (method === 'GET' && path === '/api/public-config') return sendJson(res, 200, { supabaseUrl, supabaseAnonKey });
  const cvFile = path.match(/^\/api\/cv-files\/([a-f0-9]+)$/);
  if (method === 'GET' && cvFile) return serveLocalCvFile(res, cvFile[1]);
  if (method === 'POST' && path === '/api/chat') return chatWithAi(res, body);

  if (method === 'GET' && path === '/api/companies') return sendJson(res, 200, { companies: await store.getCompanies() });
  if (method === 'POST' && path === '/api/companies') {
    if (!requireRole(res, authUser, 'admin')) return;
    return sendJson(res, 200, { company: await store.addCompany(body) });
  }
  const companyPatch = path.match(/^\/api\/companies\/(\d+)$/);
  if (method === 'PATCH' && companyPatch) {
    if (!requireRole(res, authUser, 'admin')) return;
    return sendJson(res, 200, { company: await store.updateCompany(Number(companyPatch[1]), body) });
  }

  if (method === 'GET' && path === '/api/jobs') {
    const companyId = Number(url.searchParams.get('companyId') || 0);
    const jobs = await store.getJobs();
    return sendJson(res, 200, { jobs: companyId ? jobs.filter((job) => Number(job.companyId) === companyId) : jobs });
  }
  if (method === 'POST' && path === '/api/jobs') {
    if (authUser?.role === 'admin') return sendJson(res, 403, { error: 'Admin nền tảng không tạo tin thay doanh nghiệp. Doanh nghiệp tự đăng tin trong Company Portal.' });
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, { job: await store.addCompanyJob(authUser, body) });
  }

  const jobClose = path.match(/^\/api\/jobs\/(\d+)\/close$/);
  if (method === 'POST' && jobClose) {
    if (authUser?.role === 'admin') return sendJson(res, 403, { error: 'Admin không đóng tin thay doanh nghiệp, chỉ kiểm duyệt tin.' });
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, { job: await store.updateCompanyJobStatus(authUser, Number(jobClose[1]), 'close') });
  }

  const jobPatch = path.match(/^\/api\/jobs\/(\d+)$/);
  if (method === 'PATCH' && jobPatch) {
    if (authUser?.role === 'admin') return sendJson(res, 403, { error: 'Admin không sửa tin thay doanh nghiệp, chỉ kiểm duyệt tin.' });
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, { job: await store.updateCompanyJob(authUser, Number(jobPatch[1]), body) });
  }

  if (method === 'GET' && path === '/api/applications') {
    if (!requireUser(res, authUser)) return;
    const applications = await store.getApplications();
    return sendJson(res, 200, {
      applications: authUser.role === 'admin'
        ? applications
        : applications.filter((app) => app.userEmail === authUser.email),
    });
  }
  if (method === 'POST' && path === '/api/applications') {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, await store.applyJob({ ...body, userEmail: authUser.email, userName: authUser.name }));
  }

  if (method === 'GET' && path === '/api/saved-jobs') {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, { savedJobs: await store.getSavedJobs(authUser.email) });
  }

  const savedJobToggle = path.match(/^\/api\/saved-jobs\/(\d+)\/toggle$/);
  if (method === 'POST' && savedJobToggle) {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, await store.toggleSavedJob(authUser.email, Number(savedJobToggle[1])));
  }

  const appStatus = path.match(/^\/api\/applications\/(\d+)\/status$/);
  if (method === 'PATCH' && appStatus) {
    if (authUser?.role === 'admin') return sendJson(res, 403, { error: 'Admin nền tảng không quản lý pipeline thay doanh nghiệp.' });
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, { application: await store.updateCompanyPipelineStage(authUser, Number(appStatus[1]), statusToStage(body.status), { interviewNote: body.adminNote || '' }) });
  }

  const appPipeline = path.match(/^\/api\/applications\/(\d+)\/pipeline$/);
  if (method === 'PATCH' && appPipeline) {
    if (authUser?.role === 'admin') return sendJson(res, 403, { error: 'Admin nền tảng không quản lý pipeline thay doanh nghiệp.' });
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, { application: await store.updateCompanyPipelineStage(authUser, Number(appPipeline[1]), body.stage, body) });
  }

  const appShareCompany = path.match(/^\/api\/applications\/(\d+)\/share-company$/);
  if (method === 'POST' && appShareCompany) {
    return sendJson(res, 403, { error: 'Đã bỏ luồng admin chia sẻ CV. Hồ sơ được gửi trực tiếp về doanh nghiệp sở hữu tin.' });
  }

  const appCompanyFeedback = path.match(/^\/api\/applications\/(\d+)\/company-feedback$/);
  if (method === 'PATCH' && appCompanyFeedback) {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      return sendJson(res, 200, { ok: true, application: await store.updateCompanyApplicationFeedback(Number(appCompanyFeedback[1]), authUser, body.feedback || '') });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && path === '/api/applications/ai-assess-batch') {
    if (!requireRole(res, authUser, 'admin')) return;
    return assessApplicationsBatch(res, body);
  }

  if (method === 'POST' && path === '/api/company-bookings') {
    // Server-side validation các trường bắt buộc
    const missingFields = [];
    if (!String(body.companyName || '').trim()) missingFields.push('tên doanh nghiệp');
    if (!String(body.contactName || '').trim()) missingFields.push('người liên hệ');
    if (!String(body.email || '').trim()) missingFields.push('email');
    if (!String(body.phone || '').trim()) missingFields.push('số điện thoại');
    if (missingFields.length > 0) {
      return sendJson(res, 400, { ok: false, msg: `Vui lòng điền đủ: ${missingFields.join(', ')}.` });
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim())) {
      return sendJson(res, 400, { ok: false, msg: 'Địa chỉ email không hợp lệ.' });
    }
    const booking = await store.addBookingRequest({
      ...body,
      submittedBy: authUser?.email || body.submittedBy || '',
      submittedRole: authUser?.role || body.submittedRole || 'company',
    });
    return sendJson(res, 200, { ok: true, booking });
  }

  const bookingPayment = path.match(/^\/api\/company-bookings\/(\d+)\/payment$/);
  if (method === 'PATCH' && bookingPayment) {
    const email = authUser?.email || body.email || '';
    if (!email) return sendJson(res, 400, { error: 'Vui lòng gửi email để xác nhận thanh toán.' });
    try {
      const booking = await store.confirmBookingPayment(Number(bookingPayment[1]), email);
      return sendJson(res, 200, { ok: true, booking });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  const bookingAdminConfirm = path.match(/^\/api\/company-bookings\/(\d+)\/admin-confirm$/);
  if (method === 'PATCH' && bookingAdminConfirm) {
    if (!requireRole(res, authUser, 'admin')) return;
    try {
      const booking = await store.adminConfirmBookingPayment(Number(bookingAdminConfirm[1]));
      return sendJson(res, 200, { ok: true, booking });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  const bookingCreateJob = path.match(/^\/api\/company-bookings\/(\d+)\/create-job$/);
  if (method === 'POST' && bookingCreateJob) {
    return sendJson(res, 403, { error: 'Admin không tạo tin từ booking nữa. Admin chỉ xác nhận gói; doanh nghiệp tự đăng tin.' });
  }

  const bookingReject = path.match(/^\/api\/company-bookings\/(\d+)\/reject$/);
  if (method === 'PATCH' && bookingReject) {
    if (!requireRole(res, authUser, 'admin')) return;
    try {
      const booking = await store.rejectBookingRequest(Number(bookingReject[1]), body.reason || '');
      return sendJson(res, 200, { ok: true, booking });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && path === '/api/company-bookings') {
    if (!requireRole(res, authUser, 'admin')) return;
    return sendJson(res, 200, { bookings: await store.getBookingRequests() });
  }

  if (method === 'GET' && path === '/api/company/dashboard') {
    if (!requireRole(res, authUser, 'company')) return;
    return sendJson(res, 200, await store.getCompanyDashboard(authUser));
  }

  if (method === 'POST' && path === '/api/company/jobs') {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      return sendJson(res, 200, { ok: true, job: await store.addCompanyJob(authUser, body) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const companyJobPatch = path.match(/^\/api\/company\/jobs\/(\d+)$/);
  if (method === 'PATCH' && companyJobPatch) {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      return sendJson(res, 200, { ok: true, job: await store.updateCompanyJob(authUser, Number(companyJobPatch[1]), body) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const companyJobStatus = path.match(/^\/api\/company\/jobs\/(\d+)\/status$/);
  if (method === 'PATCH' && companyJobStatus) {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      return sendJson(res, 200, { ok: true, job: await store.updateCompanyJobStatus(authUser, Number(companyJobStatus[1]), body.status || body.action) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && path === '/api/company/cv-unlock-quote') {
    if (!requireRole(res, authUser, 'company')) return;
    try { return sendJson(res, 200, { ok: true, quote: await store.getCvUnlockQuote(authUser) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (method === 'POST' && path === '/api/company/subscriptions') {
    if (!requireRole(res, authUser, 'company')) return;
    try { return sendJson(res, 200, { ok: true, subscription: await store.requestSubscription(authUser, body.planId || body.packageKey) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (method === 'POST' && path === '/api/company/refunds') {
    if (!requireRole(res, authUser, 'company')) return;
    try { return sendJson(res, 200, { ok: true, refund: await store.requestRefund(authUser, body) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (method === 'POST' && path === '/api/company/disputes') {
    if (!requireRole(res, authUser, 'company')) return;
    try { return sendJson(res, 200, { ok: true, dispute: await store.createDispute(authUser, body) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (method === 'POST' && path === '/api/company/wallet-topups') {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      if (!body?.confirmed) return sendJson(res, 400, { error: 'Vui l?ng x?c nh?n giao d?ch n?p v? tr??c khi g?i.' });
      return sendJson(res, 200, { ok: true, topup: await store.requestWalletTopup(authUser, body) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const companyUnlock = path.match(/^\/api\/company\/applications\/(\d+)\/unlock$/);
  if (method === 'POST' && companyUnlock) {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      if (!body?.confirmed) return sendJson(res, 400, { error: 'Vui l?ng x?c nh?n ph? m? CV tr??c khi tr? v?.' });
      const access = await store.unlockApplication(authUser, Number(companyUnlock[1]));
      return sendJson(res, 200, { ok: true, access });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const companyCvUrl = path.match(/^\/api\/company\/applications\/(\d+)\/cv-url$/);
  if (method === 'GET' && companyCvUrl) {
    if (!requireRole(res, authUser, 'company')) return;
    try {
      const result = await store.getApplicationCvUrl(authUser, Number(companyCvUrl[1]));
      return sendJson(res, 200, { ok: true, ...withLocalCvUrl(req, result) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && path === '/api/admin/finance') {
    if (!requireRole(res, authUser, 'admin')) return;
    return sendJson(res, 200, await store.getAdminFinance());
  }
  const adminTopupConfirm = path.match(/^\/api\/admin\/wallet-topups\/(\d+)\/confirm$/);
  if (method === 'PATCH' && adminTopupConfirm) {
    if (!requireRole(res, authUser, 'admin')) return;
    try {
      return sendJson(res, 200, { ok: true, topup: await store.adminConfirmWalletTopup(Number(adminTopupConfirm[1]), authUser) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  const adminSubConfirm = path.match(/^\/api\/admin\/subscriptions\/(\d+)\/confirm$/);
  if (method === 'PATCH' && adminSubConfirm) {
    if (!requireRole(res, authUser, 'admin')) return;
    try { return sendJson(res, 200, { ok: true, subscription: await store.adminConfirmSubscription(Number(adminSubConfirm[1]), authUser) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  const adminRefundApprove = path.match(/^\/api\/admin\/refunds\/(\d+)\/approve$/);
  if (method === 'PATCH' && adminRefundApprove) {
    if (!requireRole(res, authUser, 'admin')) return;
    try { return sendJson(res, 200, { ok: true, refund: await store.adminApproveRefund(Number(adminRefundApprove[1]), authUser) }); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (method === 'PATCH' && path === '/api/admin/commission') {
    if (!requireRole(res, authUser, 'admin')) return;
    try {
      return sendJson(res, 200, { ok: true, setting: await store.updateCommissionSetting(body.rate, authUser) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const adminModerateJob = path.match(/^\/api\/admin\/jobs\/(\d+)\/moderate$/);
  if (method === 'PATCH' && adminModerateJob) {
    if (!requireRole(res, authUser, 'admin')) return;
    try {
      return sendJson(res, 200, { ok: true, job: await store.moderateJob(authUser, Number(adminModerateJob[1]), body.decision || 'approve', body.note || '') });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && path === '/api/notifications') {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, { notifications: await store.getNotifications(authUser.role, authUser.email, authUser.companyId) });
  }
  if (method === 'POST' && path === '/api/notifications/read') {
    if (!requireUser(res, authUser)) return;
    await store.markNotificationsRead(authUser.role, authUser.email, authUser.companyId);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/auth/register') {
    const result = await store.register({ ...body, ip: getClientIp(req), userAgent: req.headers['user-agent'] || '' });
    return sendJson(res, result?.ok ? 200 : 400, result);
  }
  if (method === 'POST' && path === '/api/auth/login') {
    const auth = await verifySupabaseToken(getBearerToken(req));
    if (!auth.ok) return sendJson(res, 401, { ok: false, code: 'invalid_token', msg: 'Token Supabase Auth kh?ng h?p l? ho?c ?? h?t h?n.' });
    const result = typeof store.loginFromAuth === 'function'
      ? await store.loginFromAuth({ authPayload: auth.user, ip: getClientIp(req), userAgent: req.headers['user-agent'] || '' })
      : await store.login({ authUserId: auth.user.id, email: auth.user.email });
    const status = result?.ok ? 200 : result?.code === 'email_not_confirmed' ? 403 : 401;
    return sendJson(res, status, result);
  }
  const oauthStart = path.match(/^\/api\/auth\/oauth\/(google|github|facebook)\/start$/);
  if (method === 'GET' && oauthStart) return startOAuth(req, res, oauthStart[1]);
  const oauthCallback = path.match(/^\/api\/auth\/oauth\/(google|github|facebook)\/callback$/);
  if (method === 'GET' && oauthCallback) return finishOAuth(req, res, url, oauthCallback[1]);
  if (method === 'POST' && path === '/api/auth/logout') {
    destroySession(req);
    return sendJson(res, 200, { ok: true });
  }
  if (method === 'GET' && path === '/api/auth/me') {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, { ok: true, user: authUser });
  }
  if (method === 'PATCH' && path === '/api/users/profile') {
    if (!requireUser(res, authUser)) return;
    return sendJson(res, 200, { user: await store.updateProfile(authUser.email, { ...body, email: authUser.email }) });
  }

  if (method === 'GET' && path === '/api/cvs') {
    if (!requireRole(res, authUser, 'admin')) return;
    return sendJson(res, 403, { error: 'Admin kh?ng ???c xem danh s?ch CV m?c ??nh. Ch? metadata ph?c v? audit ???c truy c?p qua b?o c?o quy?n.' });
  }
  const cvPath = path.match(/^\/api\/cvs\/(.+)$/);
  if (cvPath && method === 'GET') {
    if (!requireUser(res, authUser)) return;
    const email = decodeURIComponent(cvPath[1]);
    if (!canAccessEmail(authUser, email)) return sendJson(res, 403, { error: 'Forbidden' });
    const cv = await store.getCv(email);
    const urlResult = authUser.role === 'user' && authUser.email === email && typeof store.getUserCvUrl === 'function' ? await store.getUserCvUrl(authUser, email) : {};
    return sendJson(res, 200, { cv, ...withLocalCvUrl(req, urlResult) });
  }
  if (cvPath && method === 'PUT') {
    if (!requireUser(res, authUser)) return;
    const email = decodeURIComponent(cvPath[1]);
    if (!canAccessEmail(authUser, email)) return sendJson(res, 403, { error: 'Forbidden' });
    const cvError = validateCvPayload(body);
    if (cvError) return sendJson(res, 400, { error: cvError });
    return sendJson(res, 200, { cv: await store.saveCv(email, body) });
  }
  if (cvPath && method === 'DELETE') {
    if (!requireUser(res, authUser)) return;
    const email = decodeURIComponent(cvPath[1]);
    if (!canAccessEmail(authUser, email)) return sendJson(res, 403, { error: 'Forbidden' });
    await store.deleteCv(email);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/analyze-cv') {
    if (!requireUser(res, authUser)) return;
    return analyzeCv(res, body);
  }

  sendJson(res, 404, { error: 'API route not found' });
}


function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

function getOrigin(req) {
  return `http://${req.headers.host}`;
}

function withLocalCvUrl(req, result = {}) {
  if (!result?.storagePath || typeof store.readLocalCv !== 'function') return result;
  const token = randomBytes(16).toString('hex');
  cvFileTokens.set(token, { storagePath: result.storagePath, expiresAt: Date.now() + 10 * 60 * 1000 });
  return { ...result, url: `${getOrigin(req)}/api/cv-files/${token}` };
}

async function serveLocalCvFile(res, token) {
  const record = cvFileTokens.get(token);
  if (!record || record.expiresAt < Date.now()) {
    cvFileTokens.delete(token);
    return sendJson(res, 403, { error: 'CV link expired or invalid' });
  }
  try {
    const bytes = await store.readLocalCv(record.storagePath);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
    });
    res.end(bytes);
  } catch (error) {
    sendJson(res, 404, { error: 'CV file not found' });
  }
}

function statusToStage(status) {
  return {
    'Mới nộp': 'new',
    'Đang xem xét': 'screening',
    'Phỏng vấn': 'interview',
    'Đã offer': 'offer',
    'Từ chối': 'rejected',
  }[status] || 'screening';
}

function getOAuthConfig(provider) {
  if (provider === 'google') {
    return {
      clientId: secretConfig.googleClientId,
      clientSecret: secretConfig.googleClientSecret,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }
  if (provider === 'facebook') {
    return {
      clientId: secretConfig.facebookClientId,
      clientSecret: secretConfig.facebookClientSecret,
      authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
      scope: 'email,public_profile',
    };
  }
  return {
    clientId: secretConfig.githubClientId,
    clientSecret: secretConfig.githubClientSecret,
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'user:email',
  };
}

function startOAuth(req, res, provider) {
  const config = getOAuthConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    return sendHtml(res, 500, oauthErrorHtml(`${provider} OAuth chưa cấu hình Client ID/Secret trong serve.mjs hoặc .env.`));
  }
  const role = new URL(req.url, getOrigin(req)).searchParams.get('role') === 'company' ? 'company' : 'user';
  const state = randomBytes(16).toString('hex');
  oauthStates.set(state, { provider, createdAt: Date.now(), role });
  const redirectUri = `${getOrigin(req)}/api/auth/oauth/${provider}/callback`;
  const target = new URL(config.authUrl);
  target.searchParams.set('client_id', config.clientId);
  target.searchParams.set('redirect_uri', redirectUri);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('scope', config.scope);
  target.searchParams.set('state', state);
  if (provider === 'google') target.searchParams.set('prompt', 'select_account');
  res.writeHead(302, { Location: target.toString() });
  res.end();
}

async function finishOAuth(req, res, url, provider) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = state ? oauthStates.get(state) : null;
  if (!code || !saved || saved.provider !== provider) {
    return sendHtml(res, 400, oauthErrorHtml('Phiên OAuth không hợp lệ hoặc đã hết hạn.'));
  }
  oauthStates.delete(state);

  try {
    const profile = provider === 'google'
      ? await fetchGoogleProfile(req, code)
      : provider === 'facebook'
        ? await fetchFacebookProfile(req, code)
        : await fetchGithubProfile(req, code);
    if (!profile.email) return sendHtml(res, 400, oauthErrorHtml('Không lấy được email từ nhà cung cấp OAuth.'));
    const result = await store.oauthLogin({ ...profile, role: saved.role || 'user' });
    result.token = createSession(result.user);
    return sendHtml(res, 200, oauthSuccessHtml(result.user, result.token));
  } catch (error) {
    return sendHtml(res, 500, oauthErrorHtml(`OAuth lỗi: ${error.message}`));
  }
}

async function fetchFacebookProfile(req, code) {
  const redirectUri = `${getOrigin(req)}/api/auth/oauth/facebook/callback`;
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', secretConfig.facebookClientId);
  tokenUrl.searchParams.set('client_secret', secretConfig.facebookClientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  const token = await tokenRes.json();
  if (!tokenRes.ok || token.error) throw new Error(token.error?.message || 'Facebook token error');
  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', token.access_token);
  const infoRes = await fetch(profileUrl);
  const info = await infoRes.json();
  if (!infoRes.ok || info.error) throw new Error(info.error?.message || 'Facebook profile error');
  return { email: String(info.email || '').toLowerCase(), name: info.name || info.email || 'Facebook User', provider: 'facebook' };
}

async function fetchGoogleProfile(req, code) {
  const redirectUri = `${getOrigin(req)}/api/auth/oauth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: secretConfig.googleClientId,
      client_secret: secretConfig.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(token.error_description || token.error || 'Google token error');
  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const info = await infoRes.json();
  if (!infoRes.ok) throw new Error(info.error_description || info.error || 'Google profile error');
  return { email: String(info.email || '').toLowerCase(), name: info.name || info.email, provider: 'google' };
}

async function fetchGithubProfile(req, code) {
  const redirectUri = `${getOrigin(req)}/api/auth/oauth/github/callback`;
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code,
      client_id: secretConfig.githubClientId,
      client_secret: secretConfig.githubClientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok || token.error) throw new Error(token.error_description || token.error || 'GitHub token error');
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json' };
  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/emails', { headers }),
  ]);
  const user = await userRes.json();
  const emails = await emailsRes.json();
  if (!userRes.ok) throw new Error(user.message || 'GitHub profile error');
  const primary = Array.isArray(emails) ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified) : null;
  return {
    email: String(primary?.email || user.email || '').toLowerCase(),
    name: user.name || user.login || primary?.email || 'GitHub User',
    provider: 'github',
  };
}

function oauthSuccessHtml(user, token) {
  return `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('cvms_user', ${JSON.stringify(JSON.stringify(user))});
    localStorage.setItem('cvms_token', ${JSON.stringify(token)});
    location.replace(${JSON.stringify(user.role === 'admin' ? '/admin/pages/dashboard.html' : user.role === 'company' ? '/company/pages/dashboard.html' : '/user/pages/dashboard.html')});
  </script><p>Đăng nhập thành công, đang chuyển trang...</p>`;
}

function oauthErrorHtml(message) {
  return `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:32px"><h2>OAuth chưa sẵn sàng</h2><p>${escapeHtml(message)}</p><a href="/login.html">Quay lại đăng nhập</a></body>`;
}

function createSession(user) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { user, createdAt: Date.now() });
  return token;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function verifySupabaseToken(token) {
  if (!token || !supabaseUrl || !supabaseAnonKey) return { ok: false };
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
    });
    const user = await response.json().catch(() => null);
    if (!response.ok || !user?.id) return { ok: false };
    return { ok: true, user };
  } catch {
    return { ok: false };
  }
}

async function getAuthUser(req) {
  const auth = await verifySupabaseToken(getBearerToken(req));
  if (!auth.ok) return null;
  return typeof store.getUserByAuthId === 'function' ? await store.getUserByAuthId(auth.user.id) : null;
}

function destroySession(req) {
  const token = getBearerToken(req);
  if (token) sessions.delete(token);
}

function requireUser(res, user) {
  if (user) return true;
  sendJson(res, 401, { error: 'Authentication required' });
  return false;
}

function requireRole(res, user, role) {
  if (!requireUser(res, user)) return false;
  if (user.role === role) return true;
  sendJson(res, 403, { error: 'Forbidden' });
  return false;
}

function canAccessEmail(user, email) {
  return user.role === 'admin' || user.email === email;
}

async function chatWithAi(res, body) {
  const message = String(body.message || '').trim();
  const apiKey = String(secretConfig.groqApiKey || '').trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const mode = body.mode === 'admin_cv_manage' ? 'admin_cv_manage' : 'user_career';

  if (!message) return sendJson(res, 400, { error: 'Tin nhắn trống' });

  const jobs = await store.getJobs();
  const applications = await store.getApplications();
  const companies = await store.getCompanies();
  const intent = detectIntent(message);
  const category = detectCategory(message);
  const context = buildChatContext(jobs, applications, companies, intent, category, mode);

  if (!apiKey) {
    return sendJson(res, 200, {
      reply: buildFallbackChatReply({ message, jobs, applications, companies, intent, category, mode }),
      intent,
      category,
      mode,
      fallback: true,
      warning: 'Chưa cấu hình GROQ_API_KEY nên chatbot đang dùng phản hồi dự phòng từ dữ liệu CVMS.',
      model_info: { chat_model: 'local-fallback', database: store.provider }
    });
  }

  const systemPrompt = mode === 'admin_cv_manage'
    ? `Bạn là AI quản lý CV cho Admin nền tảng CVMS. Nhiệm vụ chính: hỗ trợ lọc, so sánh, đánh giá, chấm điểm CV/ứng viên theo vị trí tuyển dụng, tiêu chí tuyển dụng và dữ liệu toàn hệ thống nhiều doanh nghiệp.
Trả lời bằng tiếng Việt, thực tế, có cấu trúc rõ:
- Điểm phù hợp: 0-100
- Mức phù hợp: Rất phù hợp / Phù hợp / Cân nhắc / Chưa phù hợp
- Lý do chính
- Điểm mạnh liên quan vị trí
- Rủi ro hoặc thông tin cần làm rõ
- Câu hỏi phỏng vấn gợi ý
- Đề xuất bước tiếp theo
Nếu thiếu CV hoặc thiếu mô tả vị trí, hãy yêu cầu admin cung cấp thêm, nhưng vẫn đưa checklist đánh giá cần có.`
    : `Bạn là chatbot tư vấn nghề nghiệp cho ứng viên CVMS. Trả lời bằng tiếng Việt, thân thiện, thực tế và đa ngành.
Bạn có thể tư vấn mọi ngành nghề: công nghệ, marketing, kinh doanh, tài chính, kế toán, nhân sự, thiết kế, vận hành, logistics, giáo dục, y tế, pháp lý, sản xuất, dịch vụ và các lĩnh vực khác.
Phạm vi hỗ trợ gồm: chọn ngành, tìm việc, so sánh nghề, kỹ năng cần học, mức lương tham khảo, chuẩn bị phỏng vấn, lộ trình phát triển, chuyển ngành, và góp ý CV/hồ sơ ứng tuyển.
Không trả lời như admin nội bộ, không tiết lộ dữ liệu ứng viên khác, không tự quyết định tuyển/loại ứng viên.`;
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    ...history.slice(-8).map((item) => ({
      role: item.role === 'model' ? 'assistant' : 'user',
      content: item.parts?.[0]?.text || item.content || ''
    })).filter((item) => item.content),
    {
      role: 'user',
      content: `[DỮ LIỆU HỆ THỐNG CVMS]\n${context}\n\n[CÂU HỎI]\n${message}`
    }
  ];

  try {
    const upstream = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages,
        temperature: 0.6,
        max_tokens: 900
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return sendJson(res, 200, {
        reply: buildFallbackChatReply({ message, jobs, applications, companies, intent, category, mode }),
        intent,
        category,
        mode,
        fallback: true,
        warning: `Groq API đang lỗi (${data.error?.message || data.error || upstream.status}). Chatbot đã dùng phản hồi dự phòng.`,
        model_info: { chat_model: 'local-fallback', database: store.provider }
      });
    }
    return sendJson(res, 200, {
      reply: data.choices?.[0]?.message?.content || 'Không có phản hồi.',
      intent,
      category,
      mode,
      confidence: { intent: 88, category: 84 },
      rag_used: true,
      model_info: { chat_model: groqModel, database: store.provider }
    });
  } catch (error) {
    return sendJson(res, 200, {
      reply: buildFallbackChatReply({ message, jobs, applications, companies, intent, category, mode }),
      intent,
      category,
      mode,
      fallback: true,
      warning: `Không gọi được Groq API (${error.message}). Chatbot đã dùng phản hồi dự phòng.`,
      model_info: { chat_model: 'local-fallback', database: store.provider }
    });
  }
}

function detectIntent(text) {
  const value = text.toLowerCase();
  const plain = normalizeSearchText(text);
  if (/(lương|salary|thu nhập|mức lương)/i.test(value) || /\b(luong|salary|thu nhap|muc luong)\b/i.test(plain)) return 'hoi_luong';
  if (/(cv|hồ sơ|resume|phân tích|sửa cv)/i.test(value) || /\b(cv|ho so|resume|phan tich|sua cv)\b/i.test(plain)) return 'hoi_cv';
  if (/(phỏng vấn|interview|câu hỏi)/i.test(value) || /\b(phong van|interview|cau hoi)\b/i.test(plain)) return 'hoi_phongvan';
  if (/(kỹ năng|skill|cần học|yêu cầu)/i.test(value) || /\b(ky nang|skill|can hoc|yeu cau)\b/i.test(plain)) return 'hoi_kynang';
  if (/(xu hướng|hot|ngành nào)/i.test(value) || /\b(xu huong|hot|nganh nao)\b/i.test(plain)) return 'hoi_xhuong';
  return 'tim_viec';
}

function detectCategory(text) {
  const value = text.toLowerCase();
  const plain = normalizeSearchText(text);
  if (/(dev|developer|lập trình|frontend|backend|data|ai|python|node|react|it|công nghệ)/i.test(value) || /\b(dev|developer|lap trinh|frontend|backend|data|ai|python|node|react|it|cong nghe)\b/i.test(plain)) return 'cong_nghe';
  if (/(kế toán|kiểm toán|tài chính|ngân hàng|finance)/i.test(value) || /\b(ke toan|kiem toan|tai chinh|ngan hang|finance)\b/i.test(plain)) return 'tai_chinh';
  if (/(marketing|sales|kinh doanh|e-commerce|thương mại)/i.test(value) || /\b(marketing|sales|kinh doanh|e commerce|thuong mai)\b/i.test(plain)) return 'kinh_doanh';
  if (/(nhân sự|hr|tuyển dụng)/i.test(value) || /\b(nhan su|hr|tuyen dung)\b/i.test(plain)) return 'nhan_su';
  if (/(thiết kế|design|ui|ux|figma|sáng tạo|creative)/i.test(value) || /\b(thiet ke|design|ui|ux|figma|sang tao|creative)\b/i.test(plain)) return 'thiet_ke';
  if (/(logistics|chuỗi cung ứng|supply|vận hành|operation|ops|kho|vận tải)/i.test(value) || /\b(logistics|chuoi cung ung|supply|van hanh|operation|ops|kho|van tai)\b/i.test(plain)) return 'van_hanh_logistics';
  if (/(giáo dục|teacher|giảng viên|đào tạo|training)/i.test(value) || /\b(giao duc|teacher|giang vien|dao tao|training)\b/i.test(plain)) return 'giao_duc';
  if (/(y tế|bác sĩ|dược|điều dưỡng|health|medical)/i.test(value) || /\b(y te|bac si|duoc|dieu duong|health|medical)\b/i.test(plain)) return 'y_te';
  if (/(pháp lý|luật|legal|compliance)/i.test(value) || /\b(phap ly|luat|legal|compliance)\b/i.test(plain)) return 'phap_ly';
  if (/(sản xuất|manufacturing|qa|qc|bảo trì|cơ khí|điện)/i.test(value) || /\b(san xuat|manufacturing|qa|qc|bao tri|co khi|dien)\b/i.test(plain)) return 'san_xuat_ky_thuat';
  return 'chung';
}

function buildChatContext(jobs, applications, companies, intent, category, mode = 'user_career') {
  const activeJobs = jobs.filter((job) => job.active !== false).slice(0, 8);
  const jobLines = activeJobs.map((job) => `- ${job.title} | ${job.company} | ${job.location} | ${job.salary || 'Thỏa thuận'} | ${job.applicants || 0} ứng viên`).join('\n');
  const companyLines = companies.slice(0, 8).map((company) => `- ${company.name} | ${company.industry || 'Chưa rõ ngành'} | ${company.location || 'Chưa rõ địa điểm'} | ${company.status || 'active'}`).join('\n');
  const totalApps = applications.length;
  const interviewCount = applications.filter((app) => ['Phỏng vấn', 'Đã offer'].includes(app.status)).length;
  const base = [
    `Chế độ chatbot: ${mode === 'admin_cv_manage' ? 'Admin quản lý CV' : 'Ứng viên tư vấn nghề nghiệp đa ngành'}`,
    `Intent dự đoán: ${intent}`,
    `Nhóm ngành dự đoán: ${category}`,
    `Tổng doanh nghiệp trên nền tảng: ${companies.length}`,
    `Doanh nghiệp tiêu biểu:\n${companyLines || 'Chưa có doanh nghiệp'}`,
    `Tổng vị trí đang hiển thị: ${activeJobs.length}`,
    `Danh sách việc làm:\n${jobLines || 'Chưa có việc làm'}`
  ];
  if (mode === 'admin_cv_manage') {
    base.splice(4, 0, `Tổng đơn ứng tuyển: ${totalApps}`, `Đơn đã vào phỏng vấn/offer: ${interviewCount}`);
  }
  return base.join('\n');
}

function buildFallbackChatReply({ message, jobs, applications, companies, intent, category, mode }) {
  const relevantJobs = rankJobsForQuestion(jobs, message, category).slice(0, 4);
  const jobLines = relevantJobs.map((job) => `- ${job.title} tại ${job.company}, ${job.location}, lương ${job.salary || 'thỏa thuận'}, hạn ${job.deadline || 'chưa cập nhật'}`).join('\n');
  const fallbackNote = 'Lưu ý: đây là phản hồi dự phòng khi chưa cấu hình GROQ_API_KEY hoặc API AI đang lỗi.';

  if (mode === 'admin_cv_manage') {
    const totalApps = applications.length;
    const activeJobs = jobs.filter((job) => job.active !== false).length;
    return [
      fallbackNote,
      '',
      `Tổng quan CVMS hiện có ${activeJobs} vị trí đang tuyển, ${companies.length} doanh nghiệp và ${totalApps} đơn ứng tuyển.`,
      jobLines ? `Các vị trí nên ưu tiên kiểm tra:\n${jobLines}` : 'Chưa có vị trí đang tuyển phù hợp để gợi ý.',
      '',
      'Checklist xử lý CV trong 3 ngày:',
      '1. Đối chiếu CV với vị trí ứng tuyển, kỹ năng bắt buộc và địa điểm.',
      '2. Chấm mức phù hợp theo 4 nhóm: kinh nghiệm, kỹ năng, lương mong muốn, rủi ro thiếu thông tin.',
      '3. Ghi câu hỏi phỏng vấn ngắn cho các điểm chưa rõ.',
      '4. Cập nhật trạng thái ứng viên trong pipeline.'
    ].join('\n');
  }

  if (intent === 'hoi_luong') {
    return [
      fallbackNote,
      '',
      jobLines ? `Một số mức lương đang hiển thị trong CVMS:\n${jobLines}` : 'CVMS chưa có dữ liệu lương phù hợp với câu hỏi này.',
      'Bạn nên so sánh thêm theo kinh nghiệm, địa điểm, yêu cầu kỹ năng và hình thức làm việc trước khi quyết định ứng tuyển.'
    ].join('\n');
  }

  if (intent === 'hoi_kynang' || intent === 'hoi_phongvan') {
    return [
      fallbackNote,
      '',
      jobLines ? `Các vị trí liên quan trong CVMS:\n${jobLines}` : 'Chưa tìm thấy vị trí khớp rõ với ngành bạn hỏi.',
      '',
      'Gợi ý chuẩn bị:',
      '1. Đọc kỹ kỹ năng trong mô tả việc làm.',
      '2. Chuẩn bị ví dụ dự án hoặc kinh nghiệm thật cho từng kỹ năng.',
      '3. Tập trả lời câu hỏi về điểm mạnh, điểm yếu, lý do ứng tuyển và mức lương mong muốn.',
      '4. Cập nhật CV theo đúng vị trí trước khi nộp.'
    ].join('\n');
  }

  if (intent === 'hoi_cv') {
    return [
      fallbackNote,
      '',
      'Checklist cải thiện CV:',
      '1. Đưa vị trí mục tiêu lên phần đầu CV.',
      '2. Viết kinh nghiệm theo kết quả đo được thay vì chỉ liệt kê nhiệm vụ.',
      '3. Làm nổi bật kỹ năng khớp với tin tuyển dụng.',
      '4. Giữ CV gọn, dễ đọc và kiểm tra lỗi chính tả.',
      jobLines ? `Bạn có thể chỉnh CV theo các vị trí đang tuyển:\n${jobLines}` : ''
    ].filter(Boolean).join('\n');
  }

  return [
    fallbackNote,
    '',
    jobLines ? `Một số việc làm phù hợp trong CVMS:\n${jobLines}` : 'Hiện chưa tìm thấy vị trí khớp rõ với câu hỏi của bạn.',
    'Bạn có thể hỏi cụ thể hơn về vị trí, địa điểm, mức lương, kỹ năng, CV hoặc phỏng vấn để chatbot lọc sát hơn.'
  ].join('\n');
}

function rankJobsForQuestion(jobs, message, category) {
  const query = normalizeSearchText(message);
  const categoryWords = normalizeSearchText(category).split(/\s+/).filter(Boolean);
  return jobs
    .filter((job) => job.active !== false)
    .map((job) => {
      const haystack = normalizeSearchText([
        job.title,
        job.company,
        job.location,
        job.salary,
        job.dept,
        ...(Array.isArray(job.tags) ? job.tags : [])
      ].join(' '));
      const queryScore = query.split(/\s+/).filter((word) => word.length >= 3 && haystack.includes(word)).length;
      const categoryScore = categoryWords.filter((word) => word.length >= 3 && haystack.includes(word)).length;
      return { job, score: queryScore + categoryScore };
    })
    .sort((a, b) => b.score - a.score || Number(b.job.salaryNum || 0) - Number(a.job.salaryNum || 0))
    .map((item) => item.job);
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function assessApplicationsBatch(res, body = {}) {
  const force = body.force === true;
  const limit = Math.max(1, Math.min(50, Number(body.limit || 25)));
  const [applications, jobs] = await Promise.all([store.getApplications(), store.getJobs()]);
  const targets = [];

  for (const app of applications) {
    if (!force && app.aiEvaluatedAt) continue;
    const cv = await store.getCv(app.userEmail);
    if (!cv) continue;
    targets.push({ app, cv });
    if (targets.length >= limit) break;
  }

  const assessed = [];
  const errors = [];
  for (const item of targets) {
    try {
      const assessment = await assessCandidateApplication(item.app, item.cv, jobs);
      const saved = await store.saveApplicationAssessment(item.app.id, assessment);
      assessed.push(saved);
    } catch (error) {
      errors.push({ appId: item.app.id, userEmail: item.app.userEmail, error: error.message });
    }
  }

  return sendJson(res, 200, {
    ok: true,
    assessedCount: assessed.length,
    skippedCount: applications.length - targets.length,
    assessed,
    errors,
  });
}

async function assessCandidateApplication(app, cv, jobs) {
  const fallback = buildFallbackAssessment(app, cv, jobs);
  if (!secretConfig.anthropicApiKey) return fallback;

  const ext = String(cv.ext || '').toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
  const isPDF = ext === 'pdf';
  if (!isImage && !isPDF) return fallback;

  const job = jobs.find((item) => Number(item.id) === Number(app.jobId)) || {};
  const targetIndustries = (cv.industries || []).join(', ') || 'chưa chọn';
  const jobContext = [
    `Vị trí: ${app.jobTitle || job.title || ''}`,
    `Phòng ban/ngành: ${job.dept || ''}`,
    `Công ty: ${app.company || job.company || ''}`,
    `Địa điểm: ${app.location || job.location || ''}`,
    `Tags/yêu cầu: ${(job.tags || []).join(', ')}`,
  ].join('\n');
  const base64Data = String(cv.base64 || '').split(',')[1] || '';
  if (!base64Data) return fallback;

  const content = isImage
    ? [
      { type: 'image', source: { type: 'base64', media_type: cv.type || 'image/jpeg', data: base64Data } },
      { type: 'text', text: `Hãy chấm CV ứng viên theo bối cảnh tuyển dụng:\n${jobContext}\nNgành CV chọn: ${targetIndustries}` },
    ]
    : [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
      { type: 'text', text: `Hãy chấm CV ứng viên theo bối cảnh tuyển dụng:\n${jobContext}\nNgành CV chọn: ${targetIndustries}` },
    ];

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': secretConfig.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        system: `Bạn là AI quản lý CV cho admin tuyển dụng. Trả về JSON thuần:
{
  "aiScore": 0,
  "aiFitLevel": "Rất phù hợp|Phù hợp|Cân nhắc|Chưa phù hợp",
  "summary": "",
  "strengths": [],
  "risks": [],
  "questions": [],
  "nextStep": ""
}
Chấm dựa trên mức khớp giữa CV và vị trí, không thiên vị ngành CNTT.`,
        messages: [{ role: 'user', content }],
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) return fallback;
    const text = (data.content || []).map((part) => part.text || '').join('\n').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return normalizeAssessment(parsed, fallback);
  } catch {
    return fallback;
  }
}

function buildFallbackAssessment(app, cv, jobs) {
  const job = jobs.find((item) => Number(item.id) === Number(app.jobId)) || {};
  const industries = normalizeIndustries(cv.industries || []);
  const jobText = `${job.dept || ''} ${app.jobTitle || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  const exactIndustry = industries.some((item) => jobText.includes(String(item).toLowerCase().split('/')[0].trim()));
  const tokenMatches = industries.reduce((count, item) => {
    const tokens = String(item).toLowerCase().split(/[\\/,-\s]+/).filter((token) => token.length >= 4);
    return count + (tokens.some((token) => jobText.includes(token)) ? 1 : 0);
  }, 0);
  const score = Math.max(35, Math.min(92, 52 + (exactIndustry ? 24 : 0) + tokenMatches * 8 + (cv.name ? 4 : 0)));
  const level = score >= 80 ? 'Rất phù hợp' : score >= 65 ? 'Phù hợp' : score >= 50 ? 'Cân nhắc' : 'Chưa phù hợp';
  return {
    aiScore: score,
    aiFitLevel: level,
    aiEvaluatedAt: new Date().toLocaleString('vi-VN'),
    aiEvaluation: {
      source: secretConfig.anthropicApiKey ? 'fallback_after_ai_error' : 'fallback_no_ai_key',
      summary: `Chấm nhanh dựa trên ngành CV đã chọn và vị trí "${app.jobTitle}".`,
      strengths: exactIndustry ? ['Ngành CV đã chọn khớp với vị trí ứng tuyển.'] : ['Ứng viên đã có CV để nhà tuyển dụng xem xét.'],
      risks: exactIndustry ? ['Cần đọc nội dung CV để xác nhận kinh nghiệm thực tế.'] : ['Ngành CV chọn chưa khớp rõ với vị trí, cần kiểm tra kỹ nội dung CV.'],
      questions: ['Kinh nghiệm gần nhất có liên quan trực tiếp tới vị trí này không?', 'Ứng viên có thể chứng minh kỹ năng chính qua dự án/kết quả nào?'],
      nextStep: score >= 65 ? 'Đưa vào danh sách xem xét/phỏng vấn sơ bộ.' : 'Cần HR đọc CV chi tiết trước khi chuyển vòng.',
      cvIndustries: industries,
    },
  };
}

function normalizeAssessment(parsed, fallback) {
  const score = Number.isFinite(Number(parsed.aiScore)) ? Number(parsed.aiScore) : fallback.aiScore;
  return {
    aiScore: Math.max(0, Math.min(100, Math.round(score))),
    aiFitLevel: parsed.aiFitLevel || fallback.aiFitLevel,
    aiEvaluatedAt: new Date().toLocaleString('vi-VN'),
    aiEvaluation: {
      source: 'anthropic',
      summary: parsed.summary || fallback.aiEvaluation.summary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : fallback.aiEvaluation.strengths,
      risks: Array.isArray(parsed.risks) ? parsed.risks : fallback.aiEvaluation.risks,
      questions: Array.isArray(parsed.questions) ? parsed.questions : fallback.aiEvaluation.questions,
      nextStep: parsed.nextStep || fallback.aiEvaluation.nextStep,
    },
  };
}

async function analyzeCv(res, body) {
  if (!secretConfig.anthropicApiKey) {
    return sendJson(res, 200, {
      content: [{ type: 'text', text: JSON.stringify(buildAnalyzeCvFallback(body), null, 2) }],
      fallback: true,
      note: 'ANTHROPIC_API_KEY chưa cấu hình nên hệ thống trả về đánh giá sơ bộ thay vì đọc nội dung file trực tiếp.',
    });
  }
  const nextBody = {
    ...body,
    system: body.system || `Bạn là chuyên gia HR đa ngành. Phân tích CV cho nhiều lĩnh vực, không chỉ CNTT. Hãy nhận diện ngành phù hợp, kỹ năng chuyển đổi, kinh nghiệm, học vấn, điểm mạnh/yếu, mức độ phù hợp theo từng ngành mục tiêu và gợi ý cải thiện cụ thể.`,
  };
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': secretConfig.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(nextBody),
  });
  const data = await upstream.json();
  sendJson(res, upstream.status, data);
}

function buildAnalyzeCvFallback(body = {}) {
  const messageText = JSON.stringify(body.messages || '').toLowerCase();
  const isAdminPrompt = /đánh giá|chấm|tuyển dụng|admin|phỏng vấn|vị trí/.test(messageText);
  if (isAdminPrompt) {
    return {
      ho_ten: null,
      sdt: null,
      email: null,
      ngay_sinh: null,
      dia_chi: null,
      ky_nang_chinh: [],
      diem_manh: ['Đã có CV/file hồ sơ để HR xem xét.'],
      diem_yeu: ['Chưa đọc được nội dung CV trực tiếp vì thiếu ANTHROPIC_API_KEY.'],
      kinh_nghiem_lam_viec: [],
      hoc_van: [],
      nam_kinh_nghiem: null,
      linh_vuc_chinh: null,
      diem_phu_hop_cv_job: 55,
      muc_do_phu_hop: 'Cân nhắc',
      ket_luan_tuyen_dung: 'Đây là đánh giá sơ bộ. Cần cấu hình ANTHROPIC_API_KEY để AI đọc PDF/ảnh CV và chấm chính xác hơn.',
      ly_do_phu_hop: ['Ứng viên đã nộp CV và có thể được đưa vào danh sách đọc thủ công.'],
      diem_can_lam_ro: ['Kinh nghiệm gần nhất có liên quan tới vị trí không?', 'Kỹ năng chính có bằng chứng qua dự án/kết quả không?'],
      cau_hoi_phong_van_goi_y: ['Bạn hãy mô tả kinh nghiệm phù hợp nhất với vị trí này.', 'Kết quả nổi bật nhất bạn từng đạt được là gì?'],
      de_xuat_vong_tiep_theo: 'HR nên mở CV để đọc chi tiết hoặc bổ sung ANTHROPIC_API_KEY để AI phân tích file tự động.',
      nganh_phu_hop: [],
      ky_nang_chuyen_nganh: [],
      tom_tat: 'Chưa thể trích xuất nội dung CV trực tiếp, chỉ có thể đánh giá sơ bộ.',
      muc_luong_de_xuat: null,
    };
  }
  return {
    tom_tat: 'Đã nhận file CV. Vì chưa có ANTHROPIC_API_KEY, hệ thống chưa đọc được nội dung file trực tiếp.',
    goi_y_cai_thien: [
      'Đưa phần mục tiêu nghề nghiệp và vị trí mong muốn lên đầu CV.',
      'Viết kinh nghiệm theo công thức: nhiệm vụ - công cụ/kỹ năng - kết quả đo được.',
      'Thêm 5-8 kỹ năng chính liên quan tới ngành muốn ứng tuyển.',
      'Bổ sung thành tích có số liệu nếu có.',
    ],
    diem_can_kiem_tra: [
      'Thông tin liên hệ có đầy đủ không?',
      'CV có khớp với ngành/vị trí ứng tuyển không?',
      'Kinh nghiệm gần nhất có được mô tả rõ không?',
    ],
  };
}

async function serveStatic(req, res) {
  const file = resolvePath(req.url || '/');
  if (!file) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(file);
    const finalFile = info.isDirectory() ? join(file, 'index.html') : file;
    const type = types[extname(finalFile).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    createReadStream(finalFile).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const full = normalize(join(root, relativePath));
  const rel = relative(root, full);
  if (rel === '..' || rel.startsWith(`..${separator()}`) || isAbsolute(rel)) return null;
  return full;
}

function separator() {
  return process.platform === 'win32' ? '\\' : '/';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 12 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}


function validateCvPayload(body = {}) {
  const name = String(body.name || '').trim();
  const ext = String(body.ext || name.split('.').pop() || '').toLowerCase();
  const type = String(body.type || '').toLowerCase();
  const size = Number(body.size || 0);
  const allowedExt = new Set(['pdf']);
  const allowedMime = new Set(['application/pdf']);
  if (!allowedExt.has(ext) || !allowedMime.has(type)) return 'Ch? cho ph?p upload CV d?ng PDF.';
  if (!size || size > 5 * 1024 * 1024) return 'CV ph?i nh? h?n ho?c b?ng 5MB.';
  if (!String(body.dataUrl || body.base64 || '').startsWith('data:application/pdf')) return 'File CV kh?ng ??ng ??nh d?ng PDF.';
  return '';
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
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
