create table if not exists public.users (
  email text primary key,
  name text not null,
  password text not null,
  role text not null default 'user',
  "companyId" bigint,
  "companyRole" text,
  phone text,
  address text,
  bio text,
  "targetPosition" text,
  "experienceLevel" text,
  education text,
  skills text,
  "expectedSalary" text,
  "desiredLocations" text,
  "workType" text,
  portfolio text,
  linkedin text
);

create table if not exists public.companies (
  id bigint primary key,
  name text not null,
  slug text,
  industry text,
  location text,
  plan text,
  status text default 'active',
  "createdAt" text
);

create table if not exists public.jobs (
  id bigint primary key,
  title text not null,
  company text not null,
  "companyId" bigint,
  location text not null,
  salary text,
  "salaryNum" integer default 0,
  deadline text,
  tags jsonb not null default '[]'::jsonb,
  dept text,
  qty integer default 1,
  applicants integer default 0,
  status text default 'Đang tuyển',
  active boolean default true
);

create table if not exists public.applications (
  id bigint primary key,
  "jobId" bigint not null,
  "companyId" bigint,
  "jobTitle" text not null,
  company text not null,
  location text not null,
  "userEmail" text not null,
  "userName" text not null,
  status text not null default 'Mới nộp',
  "pipelineStage" text not null default 'new',
  date text,
  "dateTs" bigint,
  "adminNote" text default '',
  "aiScore" integer,
  "aiFitLevel" text,
  "aiEvaluation" jsonb,
  "aiEvaluatedAt" text,
  "sharedToCompany" boolean default false,
  "sharedAt" text,
  "companyShareNote" text,
  "companyFeedback" text,
  "companyFeedbackAt" text
);

alter table public.applications
  add column if not exists "sharedToCompany" boolean default false;

alter table public.applications
  add column if not exists "sharedAt" text;

alter table public.applications
  add column if not exists "companyShareNote" text;

alter table public.applications
  add column if not exists "companyFeedback" text;

alter table public.applications
  add column if not exists "companyFeedbackAt" text;

create table if not exists public.saved_jobs (
  "userEmail" text not null,
  "jobId" bigint not null,
  "savedAt" text,
  primary key ("userEmail", "jobId")
);

create table if not exists public.notifications (
  id bigint primary key,
  role text not null,
  "targetEmail" text,
  type text,
  title text not null,
  body text not null,
  "appId" bigint,
  "jobId" bigint,
  "companyId" bigint,
  "jobTitle" text,
  "userEmail" text,
  time text,
  read boolean default false
);

create table if not exists public.booking_requests (
  id bigint primary key,
  role text not null default 'company',
  "companyName" text not null,
  "contactName" text not null,
  email text not null,
  phone text,
  industry text,
  "packageKey" text,
  "packageLabel" text,
  "jobTitle" text,
  quantity integer default 1,
  duration integer default 30,
  "totalAmount" bigint default 0,
  note text,
  status text default 'pending',
  "paymentStatus" text default 'waiting_transfer',
  "paymentConfirmedAt" text,
  "adminConfirmedAt" text,
  "rejectedReason" text,
  "companyId" bigint,
  "jobId" bigint,
  "createdAt" text,
  source text default 'public'
);

alter table public.booking_requests
  add column if not exists "paymentStatus" text default 'waiting_transfer';

alter table public.booking_requests
  add column if not exists "paymentConfirmedAt" text;

alter table public.booking_requests
  add column if not exists "adminConfirmedAt" text;

alter table public.booking_requests
  add column if not exists "rejectedReason" text;

alter table public.booking_requests
  add column if not exists "companyId" bigint;

alter table public.booking_requests
  add column if not exists "jobId" bigint;

create table if not exists public.cvs (
  email text primary key,
  name text not null,
  type text,
  ext text,
  size bigint,
  base64 text not null,
  "uploadedAt" text,
  industries jsonb not null default '[]'::jsonb
);

create index if not exists idx_applications_job on public.applications ("jobId");
create index if not exists idx_applications_user on public.applications ("userEmail");
create index if not exists idx_jobs_company on public.jobs ("companyId");
create index if not exists idx_applications_company on public.applications ("companyId");
create index if not exists idx_saved_jobs_user on public.saved_jobs ("userEmail");
create index if not exists idx_notifications_role on public.notifications (role);
create index if not exists idx_notifications_target on public.notifications ("targetEmail");
create index if not exists idx_booking_requests_email on public.booking_requests (email);

-- CVMS multi-company wallet/access model
-- Production data layer is Node.js + Supabase. SQLite is only a local development fallback.

alter table public.cvs alter column base64 drop not null;
alter table public.cvs add column if not exists "storageBucket" text default 'private-cvs';
alter table public.cvs add column if not exists "storagePath" text;

alter table public.applications add column if not exists "interviewAt" text;
alter table public.applications add column if not exists "interviewNote" text;

alter table public.jobs add column if not exists "moderationNote" text;

create table if not exists public.company_wallets (
  "companyId" bigint primary key references public.companies(id) on delete cascade,
  balance numeric(14,0) not null default 0 check (balance >= 0),
  currency text not null default 'VND',
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.wallet_topups (
  id bigint generated by default as identity primary key,
  "companyId" bigint not null references public.companies(id) on delete cascade,
  "requestedBy" text,
  amount numeric(14,0) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','refunded')),
  "transferNote" text,
  "confirmedBy" text,
  "confirmedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id bigint generated by default as identity primary key,
  "companyId" bigint not null references public.companies(id) on delete cascade,
  type text not null,
  amount numeric(14,0) not null,
  "balanceBefore" numeric(14,0) not null,
  "balanceAfter" numeric(14,0) not null,
  "refType" text,
  "refId" bigint,
  note text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.application_accesses (
  id bigint generated by default as identity primary key,
  "companyId" bigint not null references public.companies(id) on delete cascade,
  "applicationId" bigint not null references public.applications(id) on delete cascade,
  "feeAmount" numeric(14,0) not null,
  "commissionRate" numeric(5,4) not null check ("commissionRate" between 0.01 and 0.02),
  "balanceBefore" numeric(14,0) not null,
  "balanceAfter" numeric(14,0) not null,
  "unlockedBy" text,
  "createdAt" timestamptz not null default now(),
  unique ("companyId", "applicationId")
);

create table if not exists public.commission_settings (
  id text primary key default 'default',
  "cvUnlockRate" numeric(5,4) not null default 0.015 check ("cvUnlockRate" between 0.01 and 0.02),
  "updatedBy" text,
  "updatedAt" timestamptz not null default now()
);

insert into public.commission_settings (id, "cvUnlockRate")
values ('default', 0.015)
on conflict (id) do nothing;

create table if not exists public.platform_revenues (
  id bigint generated by default as identity primary key,
  "companyId" bigint references public.companies(id) on delete set null,
  source text not null check (source in ('package_payment','cv_unlock_fee','refund_adjustment')),
  amount numeric(14,0) not null,
  "refType" text,
  "refId" bigint,
  "recognizedAt" timestamptz not null default now(),
  note text
);

create table if not exists public.refund_requests (
  id bigint generated by default as identity primary key,
  "companyId" bigint references public.companies(id) on delete set null,
  amount numeric(14,0) not null,
  reason text,
  status text not null default 'pending',
  "createdAt" timestamptz not null default now(),
  "resolvedAt" timestamptz
);

create table if not exists public.disputes (
  id bigint generated by default as identity primary key,
  "companyId" bigint references public.companies(id) on delete set null,
  "applicationId" bigint references public.applications(id) on delete set null,
  reason text,
  status text not null default 'open',
  "createdAt" timestamptz not null default now(),
  "resolvedAt" timestamptz
);

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  "actorEmail" text,
  "actorRole" text,
  action text not null,
  "entityType" text,
  "entityId" text,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.data_access_logs (
  id bigint generated by default as identity primary key,
  "actorEmail" text,
  "companyId" bigint,
  "applicationId" bigint,
  "dataType" text not null,
  purpose text,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_wallet_topups_company on public.wallet_topups ("companyId", status);
create index if not exists idx_wallet_transactions_company on public.wallet_transactions ("companyId", "createdAt" desc);
create index if not exists idx_application_accesses_company on public.application_accesses ("companyId", "applicationId");
create index if not exists idx_platform_revenues_source on public.platform_revenues (source, "recognizedAt" desc);

insert into storage.buckets (id, name, public)
values ('private-cvs', 'private-cvs', false)
on conflict (id) do update set public = false;

drop policy if exists "service-role-private-cv-objects" on storage.objects;
create policy "service-role-private-cv-objects"
on storage.objects
for all
using (bucket_id = 'private-cvs' and auth.role() = 'service_role')
with check (bucket_id = 'private-cvs' and auth.role() = 'service_role');

alter table public.company_wallets enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.application_accesses enable row level security;
alter table public.commission_settings enable row level security;
alter table public.platform_revenues enable row level security;
alter table public.refund_requests enable row level security;
alter table public.disputes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.data_access_logs enable row level security;
alter table public.cvs enable row level security;

drop policy if exists "service-role-full-company-wallets" on public.company_wallets;
create policy "service-role-full-company-wallets" on public.company_wallets for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service-role-full-wallet-topups" on public.wallet_topups;
create policy "service-role-full-wallet-topups" on public.wallet_topups for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service-role-full-wallet-transactions" on public.wallet_transactions;
create policy "service-role-full-wallet-transactions" on public.wallet_transactions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service-role-full-application-accesses" on public.application_accesses;
create policy "service-role-full-application-accesses" on public.application_accesses for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service-role-full-platform-revenues" on public.platform_revenues;
create policy "service-role-full-platform-revenues" on public.platform_revenues for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service-role-full-private-cvs" on public.cvs;
create policy "service-role-full-private-cvs" on public.cvs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function public.confirm_wallet_topup(
  p_topup_id bigint,
  p_actor_email text
) returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topup public.wallet_topups%rowtype;
  v_wallet public.company_wallets%rowtype;
  v_after numeric(14,0);
begin
  select * into v_topup from public.wallet_topups where id = p_topup_id for update;
  if not found then
    raise exception 'Không tìm thấy yêu cầu nạp ví.';
  end if;
  if v_topup.status = 'confirmed' then
    return v_topup;
  end if;

  insert into public.company_wallets ("companyId", balance)
  values (v_topup."companyId", 0)
  on conflict ("companyId") do nothing;

  select * into v_wallet from public.company_wallets where "companyId" = v_topup."companyId" for update;
  v_after := v_wallet.balance + v_topup.amount;

  update public.company_wallets
  set balance = v_after, "updatedAt" = now()
  where "companyId" = v_topup."companyId";

  insert into public.wallet_transactions ("companyId", type, amount, "balanceBefore", "balanceAfter", "refType", "refId", note)
  values (v_topup."companyId", 'topup', v_topup.amount, v_wallet.balance, v_after, 'wallet_topup', v_topup.id, 'Nạp ví đã được admin xác nhận');

  update public.wallet_topups
  set status = 'confirmed', "confirmedBy" = p_actor_email, "confirmedAt" = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.audit_logs ("actorEmail", "actorRole", action, "entityType", "entityId", metadata)
  values (p_actor_email, 'admin', 'confirm_wallet_topup', 'wallet_topup', v_topup.id::text, jsonb_build_object('amount', v_topup.amount, 'companyId', v_topup."companyId"));

  return v_topup;
end;
$$;

create or replace function public.unlock_application_for_company(
  p_company_id bigint,
  p_application_id bigint,
  p_actor_email text
) returns public.application_accesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_wallet public.company_wallets%rowtype;
  v_access public.application_accesses%rowtype;
  v_rate numeric(5,4);
  v_fee numeric(14,0);
  v_after numeric(14,0);
begin
  select * into v_app
  from public.applications
  where id = p_application_id and "companyId" = p_company_id;
  if not found then
    raise exception 'Không tìm thấy hồ sơ thuộc doanh nghiệp này.';
  end if;

  select * into v_access
  from public.application_accesses
  where "companyId" = p_company_id and "applicationId" = p_application_id;
  if found then
    return v_access;
  end if;

  insert into public.company_wallets ("companyId", balance)
  values (p_company_id, 0)
  on conflict ("companyId") do nothing;

  select * into v_wallet
  from public.company_wallets
  where "companyId" = p_company_id
  for update;

  if v_wallet.balance <= 0 then
    raise exception 'Ví doanh nghiệp chưa có số dư để mở CV.';
  end if;

  select least(0.02, greatest(0.01, "cvUnlockRate"))
  into v_rate
  from public.commission_settings
  where id = 'default';
  if v_rate is null then
    v_rate := 0.015;
  end if;

  v_fee := greatest(1, round(v_wallet.balance * v_rate));
  if v_wallet.balance < v_fee then
    raise exception 'Số dư ví không đủ để mở CV.';
  end if;
  v_after := v_wallet.balance - v_fee;

  update public.company_wallets
  set balance = v_after, "updatedAt" = now()
  where "companyId" = p_company_id;

  insert into public.application_accesses ("companyId", "applicationId", "feeAmount", "commissionRate", "balanceBefore", "balanceAfter", "unlockedBy")
  values (p_company_id, p_application_id, v_fee, v_rate, v_wallet.balance, v_after, p_actor_email)
  returning * into v_access;

  insert into public.wallet_transactions ("companyId", type, amount, "balanceBefore", "balanceAfter", "refType", "refId", note)
  values (p_company_id, 'cv_unlock_fee', -v_fee, v_wallet.balance, v_after, 'application_access', v_access.id, 'Phí mở CV ứng viên');

  insert into public.platform_revenues ("companyId", source, amount, "refType", "refId", note)
  values (p_company_id, 'cv_unlock_fee', v_fee, 'application_access', v_access.id, 'Doanh thu phí mở CV');

  insert into public.audit_logs ("actorEmail", "actorRole", action, "entityType", "entityId", metadata)
  values (p_actor_email, 'company', 'unlock_application', 'application', p_application_id::text, jsonb_build_object('fee', v_fee, 'rate', v_rate, 'companyId', p_company_id));

  insert into public.data_access_logs ("actorEmail", "companyId", "applicationId", "dataType", purpose)
  values (p_actor_email, p_company_id, p_application_id, 'candidate_identity', 'unlock_application');

  return v_access;
end;
$$;
