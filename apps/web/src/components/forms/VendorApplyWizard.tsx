'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { REGION_META } from '@/lib/regions';

interface MeResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    emailVerified: boolean;
  };
}

interface ApplicationResponse {
  application: {
    status: string;
    step: number;
    submittedAt: string | null;
    reviewNotes: string | null;
    reviewedAt: string | null;
  } | null;
  vendor?: Record<string, unknown> & {
    storeName?: string;
  };
}

interface BusinessFields {
  businessLegalName: string;
  businessType: 'individual' | 'company' | '';
  registrationNumber: string;
  taxId: string;
  countryOfRegistration: string;
  website: string;
}

interface StoreFields {
  storeName: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  returnPolicy: string;
  shippingPolicy: string;
}

interface OperationsFields {
  warehouseRegionKey: string;
  plannedCategories: string;
}

interface PayoutFields {
  type: 'bank' | 'paypal' | '';
  bankName: string;
  accountLast4: string;
  paypalEmail: string;
  acceptTerms: boolean;
}

const STEP_TITLES = ['Business', 'Store profile', 'Operations', 'Payout & terms'] as const;

function parseJsonField(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function VendorApplyWizard() {
  const router = useRouter();
  const [gate, setGate] = useState<'loading' | 'anonymous' | 'unverified' | 'ready'>('loading');
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [business, setBusiness] = useState<BusinessFields>({
    businessLegalName: '', businessType: '', registrationNumber: '', taxId: '',
    countryOfRegistration: '', website: '',
  });
  const [store, setStore] = useState<StoreFields>({
    storeName: '', description: '', supportEmail: '', supportPhone: '', returnPolicy: '', shippingPolicy: '',
  });
  const [operations, setOperations] = useState<OperationsFields>({ warehouseRegionKey: 'UK', plannedCategories: '' });
  const [payout, setPayout] = useState<PayoutFields>({ type: '', bankName: '', accountLast4: '', paypalEmail: '', acceptTerms: false });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const me = await api<MeResponse>('/api/v1/auth/me');
        if (!me.user.emailVerified) {
          if (!cancelled) setGate('unverified');
          return;
        }

        const data = await api<ApplicationResponse>('/api/v1/vendors/application');
        if (cancelled) return;

        if (data.application && ['UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'BANNED'].includes(data.application.status)) {
          setAppStatus(data.application.status);
          setGate('ready');
          return;
        }

        if (data.vendor) {
          const v = data.vendor;
          const payoutSaved = parseJsonField(v.payoutMethod);
          const categories = Array.isArray(v.plannedCategories)
            ? (v.plannedCategories as string[])
            : (parseJsonField(v.plannedCategories).unknown as string[] | undefined) ?? [];
          setBusiness({
            businessLegalName: String(v.businessLegalName ?? ''),
            businessType: (v.businessType as BusinessFields['businessType']) ?? '',
            registrationNumber: String(v.registrationNumber ?? ''),
            taxId: String(v.taxId ?? ''),
            countryOfRegistration: String(v.countryOfRegistration ?? ''),
            website: String(v.website ?? ''),
          });
          setStore({
            storeName: String(v.storeName && v.storeName !== 'Unnamed store' ? v.storeName : ''),
            description: String(v.description ?? ''),
            supportEmail: String(v.supportEmail ?? ''),
            supportPhone: String(v.supportPhone ?? ''),
            returnPolicy: String(v.returnPolicy ?? ''),
            shippingPolicy: String(v.shippingPolicy ?? ''),
          });
          setOperations({
            warehouseRegionKey: String(v.warehouseRegionKey ?? 'UK'),
            plannedCategories: categories.join(', '),
          });
          setPayout({
            type: (payoutSaved.type as PayoutFields['type']) ?? '',
            bankName: String(payoutSaved.bankName ?? ''),
            accountLast4: String(payoutSaved.accountLast4 ?? ''),
            paypalEmail: String(payoutSaved.paypalEmail ?? ''),
            acceptTerms: payoutSaved.acceptTerms === true,
          });
          if (data.application?.status === 'REJECTED') setReviewNotes(data.application.reviewNotes ?? null);
        }

        setStep(data.application?.status === 'REJECTED' ? Math.max(0, (data.application.step ?? 1) - 1) : data.application?.step ?? 0);
        setGate('ready');
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          if (!cancelled) setGate('anonymous');
        } else {
          if (!cancelled) setGate('ready');
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gate === 'anonymous') {
      router.replace('/auth/signin?next=/vendor/apply');
    }
  }, [gate, router]);

  const persist = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setStepError('');
    try {
      await api('/api/v1/vendors/apply', { method: 'POST', body: JSON.stringify(payload) });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save your progress. Please try again.';
      setStepError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const nextFromBusiness = async () => {
    if (!business.businessLegalName || !business.businessType || !business.registrationNumber || !business.countryOfRegistration) {
      setStepError('Please complete the required business details.');
      return;
    }
    if (await persist({ step: 1, business })) setStep(1);
  };

  const nextFromStore = async () => {
    if (store.storeName.trim().length < 2 || store.description.trim().length < 20 || !store.supportEmail) {
      setStepError('Store name, a support email and a description of at least 20 characters are required.');
      return;
    }
    if (await persist({ step: 2, store })) setStep(2);
  };

  const nextFromOperations = async () => {
    const categories = operations.plannedCategories.split(',').map(c => c.trim()).filter(Boolean);
    if (categories.length < 1 || categories.length > 10) {
      setStepError('List between 1 and 10 categories, separated by commas.');
      return;
    }
    if (await persist({ step: 3, operations: { warehouseRegionKey: operations.warehouseRegionKey, plannedCategories: categories } })) setStep(3);
  };

  const submitApplication = async () => {
    if (payout.type === 'bank' && (!payout.bankName || payout.accountLast4.length !== 4)) {
      setStepError('Bank name and the last 4 digits of the account are required.');
      return;
    }
    if (payout.type === 'paypal' && !payout.paypalEmail) {
      setStepError('PayPal email is required.');
      return;
    }
    if (!payout.type) {
      setStepError('Choose a payout method.');
      return;
    }
    if (!payout.acceptTerms) {
      setStepError('Please accept the vendor agreement to continue.');
      return;
    }

    setSubmitting(true);
    setStepError('');
    try {
      await api('/api/v1/vendors/apply', {
        method: 'POST',
        body: JSON.stringify({
          step: 4,
          payout: {
            type: payout.type,
            ...(payout.type === 'bank' ? { bankName: payout.bankName, accountLast4: payout.accountLast4 } : {}),
            ...(payout.type === 'paypal' ? { paypalEmail: payout.paypalEmail } : {}),
            acceptTerms: true,
          },
        }),
      });
      await api('/api/v1/vendors/apply/submit', { method: 'POST', body: '{}' });
      setAppStatus('UNDER_REVIEW');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Submission failed. Please try again.';
      setStepError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (gate === 'loading') {
    return <p className="text-sm text-smoke-500 py-16 text-center">Loading your application…</p>;
  }

  if (gate === 'unverified') {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-displaysm font-semibold text-charcoal">Verify your email first</h2>
        <p className="mt-2 text-sm text-smoke-600">
          Seller applications require a verified email address. Open the verification link we sent you, then come back here.
        </p>
        <Link href="/account" className="btn btn-outline mt-6 inline-block">Go to account settings</Link>
      </div>
    );
  }

  if (appStatus === 'UNDER_REVIEW') {
    return (
      <div className="card p-8 text-center" data-testid="under-review">
        <span aria-hidden="true" className="inline-grid place-items-center w-12 h-12 rounded-full bg-tealink/10 text-tealink text-xl font-bold">✓</span>
        <h2 className="text-displaysm font-semibold text-charcoal mt-4">Application received</h2>
        <p className="mt-2 text-sm text-smoke-600 max-w-md mx-auto leading-relaxed">
          Thank you — our team reviews new applications within two working days. We will email your decision; meanwhile your answers are saved.
        </p>
        <Link href="/" className="btn btn-primary mt-6 inline-block">Back to shopping</Link>
      </div>
    );
  }

  if (appStatus === 'ACTIVE') {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-displaysm font-semibold text-charcoal">Your store is live</h2>
        <p className="mt-2 text-sm text-smoke-600">Manage listings, orders and payouts in the vendor portal.</p>
        <a href={process.env.NEXT_PUBLIC_VENDOR_PORTAL_URL || '/vendor'} className="btn btn-primary mt-6 inline-block">Open vendor portal</a>
      </div>
    );
  }

  if (appStatus && appStatus !== 'REJECTED' && appStatus !== 'PENDING') {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-displaysm font-semibold text-charcoal">Application {appStatus.toLowerCase().replace('_', ' ')}</h2>
        <p className="mt-2 text-sm text-smoke-600">Contact vendor support for the current status of your store.</p>
      </div>
    );
  }

  return (
    <div data-testid="vendor-apply-wizard">
      {reviewNotes && (
        <div role="alert" className="mb-6 border border-feedback-danger/30 bg-feedback-danger/5 rounded p-4">
          <p className="text-xs font-bold text-feedback-danger uppercase tracking-wide">Previous application was declined</p>
          <p className="text-xs text-smoke-600 mt-1 leading-relaxed">{reviewNotes}</p>
          <p className="text-xs text-smoke-600 mt-1">Update your answers below and resubmit.</p>
        </div>
      )}

      <ol className="flex gap-2 mb-8" aria-label="Application progress">
        {STEP_TITLES.map((title, i) => (
          <li key={title} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-ember' : 'bg-smoke-200'}`} />
            <span className={`block text-2xs mt-1.5 font-semibold ${i <= step ? 'text-charcoal' : 'text-smoke-400'}`}>{i + 1}. {title}</span>
          </li>
        ))}
      </ol>

      {stepError && <p role="alert" className="mb-4 text-xs text-feedback-danger">{stepError}</p>}

      {step === 0 && (
        <fieldset disabled={saving} className="space-y-4">
          <legend className="text-displaysm font-semibold text-charcoal mb-4">Tell us about your business</legend>
          <Field label="Legal business name" required>
            <input className="input" value={business.businessLegalName} onChange={e => setBusiness({ ...business, businessLegalName: e.target.value })} placeholder="Grill Gear Ltd" />
          </Field>
          <Field label="Business type" required>
            <select className="input" value={business.businessType} onChange={e => setBusiness({ ...business, businessType: e.target.value as BusinessFields['businessType'] })}>
              <option value="">Select…</option>
              <option value="individual">Individual / sole trader</option>
              <option value="company">Registered company</option>
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Registration number" required>
              <input className="input" value={business.registrationNumber} onChange={e => setBusiness({ ...business, registrationNumber: e.target.value })} />
            </Field>
            <Field label="Tax ID / VAT number">
              <input className="input" value={business.taxId} onChange={e => setBusiness({ ...business, taxId: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country of registration" required>
              <input className="input" maxLength={2} value={business.countryOfRegistration} onChange={e => setBusiness({ ...business, countryOfRegistration: e.target.value.toUpperCase() })} placeholder="GB" />
            </Field>
            <Field label="Website">
              <input className="input" value={business.website} onChange={e => setBusiness({ ...business, website: e.target.value })} placeholder="https://" />
            </Field>
          </div>
          <button type="button" onClick={nextFromBusiness} disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset disabled={saving} className="space-y-4">
          <legend className="text-displaysm font-semibold text-charcoal mb-4">Set up your storefront profile</legend>
          <Field label="Store name" required>
            <input className="input" value={store.storeName} onChange={e => setStore({ ...store, storeName: e.target.value })} placeholder="Shown to shoppers" />
          </Field>
          <Field label="About your store" required hint={`${store.description.length}/2000 — minimum 20 characters`}>
            <textarea className="input min-h-[110px]" maxLength={2000} value={store.description} onChange={e => setStore({ ...store, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Support email" required>
              <input className="input" type="email" value={store.supportEmail} onChange={e => setStore({ ...store, supportEmail: e.target.value })} />
            </Field>
            <Field label="Support phone">
              <input className="input" value={store.supportPhone} onChange={e => setStore({ ...store, supportPhone: e.target.value })} />
            </Field>
          </div>
          <Field label="Return policy">
            <textarea className="input min-h-[80px]" maxLength={2000} value={store.returnPolicy} onChange={e => setStore({ ...store, returnPolicy: e.target.value })} placeholder="e.g. 30-day returns, buyer pays return postage…" />
          </Field>
          <Field label="Shipping policy">
            <textarea className="input min-h-[80px]" maxLength={2000} value={store.shippingPolicy} onChange={e => setStore({ ...store, shippingPolicy: e.target.value })} placeholder="e.g. Dispatched within 1 working day…" />
          </Field>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(0)} className="btn btn-outline">Back</button>
            <button type="button" onClick={nextFromStore} disabled={saving} className="btn btn-primary flex-1 sm:flex-none">
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset disabled={saving} className="space-y-4">
          <legend className="text-displaysm font-semibold text-charcoal mb-4">Where do you ship from?</legend>
          <Field label="Primary warehouse region" required hint="Your storefront launches here first — more regions can be added later.">
            <select className="input" value={operations.warehouseRegionKey} onChange={e => setOperations({ ...operations, warehouseRegionKey: e.target.value })}>
              {REGION_META.map(r => (
                <option key={r.key} value={r.key}>{r.flag} {r.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Product categories" required hint="Up to 10, comma-separated — used by our catalog team when reviewing your application.">
            <input className="input" value={operations.plannedCategories} onChange={e => setOperations({ ...operations, plannedCategories: e.target.value })} placeholder="kitchen, outdoor, tools" />
          </Field>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back</button>
            <button type="button" onClick={nextFromOperations} disabled={saving} className="btn btn-primary flex-1 sm:flex-none">
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset disabled={submitting} className="space-y-4">
          <legend className="text-displaysm font-semibold text-charcoal mb-4">Get paid & submit</legend>
          <Field label="Payout method" required>
            <div className="flex gap-3">
              {(['bank', 'paypal'] as const).map(t => (
                <label key={t} className={`flex-1 card p-4 cursor-pointer flex items-center gap-2 ${payout.type === t ? 'ring-2 ring-ember' : ''}`}>
                  <input
                    type="radio"
                    name="payout-type"
                    checked={payout.type === t}
                    onChange={() => setPayout({ ...payout, type: t })}
                    className="accent-[var(--color-ember)]"
                  />
                  <span className="text-sm font-semibold">{t === 'bank' ? 'Bank transfer' : 'PayPal'}</span>
                </label>
              ))}
            </div>
          </Field>
          {payout.type === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank name" required>
                <input className="input" value={payout.bankName} onChange={e => setPayout({ ...payout, bankName: e.target.value })} />
              </Field>
              <Field label="Account last 4 digits" required hint="We never ask for full account numbers online.">
                <input className="input" inputMode="numeric" maxLength={4} value={payout.accountLast4} onChange={e => setPayout({ ...payout, accountLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </Field>
            </div>
          )}
          {payout.type === 'paypal' && (
            <Field label="PayPal email" required>
              <input className="input" type="email" value={payout.paypalEmail} onChange={e => setPayout({ ...payout, paypalEmail: e.target.value })} />
            </Field>
          )}
          <Field label="Supporting documents" hint="Registration certificates or tax documents (PDF/images, up to 5 MB each). Optional — speeds up review.">
            <DocumentsUploader />
          </Field>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={payout.acceptTerms}
              onChange={() => setPayout({ ...payout, acceptTerms: !payout.acceptTerms })}
              className="w-[18px] h-[18px] mt-0.5 accent-[var(--color-ember)]"
            />
            <span className="text-xs text-smoke-600 leading-relaxed">
              I confirm the information provided is accurate and I accept the{' '}
              <Link href="/terms" className="font-medium hover:text-tealink underline underline-offset-2">Vendor Agreement</Link>{' '}
              including the flat 12% commission on each sale.
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} disabled={submitting} className="btn btn-outline">Back</button>
            <button type="button" onClick={submitApplication} disabled={submitting} className="btn btn-primary flex-1 sm:flex-none" data-testid="submit-application">
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}

function DocumentsUploader() {
  const [docs, setDocs] = useState<Array<{ name: string; size: number; uploadedAt: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api<{ documents: Array<{ name: string; size: number; uploadedAt: string }> }>('/api/v1/vendors/me/documents')
      .then(d => setDocs(d.documents))
      .catch(() => undefined);
  }, []);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setNotice('That file is larger than 5 MB.');
      return;
    }
    setUploading(true);
    setNotice(null);
    try {
      const buffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      await api('/api/v1/vendors/me/documents', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, contentType: file.type || 'application/octet-stream', dataBase64: btoa(binary) }),
      });
      setDocs(prev => [...prev, { name: file.name, size: file.size, uploadedAt: new Date().toISOString() }]);
    } catch (err) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
      setNotice(status === 503 ? 'Document storage is not available right now — you can still submit without documents.' : 'Upload failed. Try again or submit without it.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 rounded-md border border-dashed border-smoke-300 px-4 py-2.5 text-xs font-semibold text-smoke-600 cursor-pointer hover:bg-smoke-50">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="sr-only"
          disabled={uploading}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) upload(file);
          }}
        />
        {uploading ? 'Uploading…' : 'Attach a file'}
      </label>
      {docs.length > 0 && (
        <ul role="list" className="mt-2 space-y-1">
          {docs.map(d => (
            <li key={d.name + d.uploadedAt} className="text-xs text-smoke-600">
              ✓ {d.name} <span className="text-smoke-400">({d.size < 1024 * 1024 ? `${Math.round(d.size / 1024)} KB` : `${(d.size / (1024 * 1024)).toFixed(1)} MB`})</span>
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="alert" className="text-2xs text-feedback-danger mt-1.5">{notice}</p>}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-semibold mb-1.5">
        {label}
        {required && <span aria-hidden="true" className="text-feedback-danger"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-2xs text-smoke-400 mt-1">{hint}</span>}
    </div>
  );
}
