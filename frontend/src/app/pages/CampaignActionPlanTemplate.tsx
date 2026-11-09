import { useState, useEffect, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { ClipboardList, Plus, Trash2, Save, UserCheck, Loader2, ArrowLeft } from 'lucide-react';

interface HotTargetCustomer {
  cif: string;
  name: string;
  churn: number;
  profit: string;
  value: string;
  branch: string;
  cluster: string;      // segmentation cluster code, e.g. 'cluster_0'
  action: string;       // 'Human Approach' | 'Special Approach' (recommendation type)
}

// Customer 360 profile from bag_demo (cluster_result + mv_h).
interface CustomerProfile {
  cif: string;
  usia: number | null;
  gender: string | null;
  kota: string | null;
  statusMb: string | null;
  saldoTotal: number | null;
  jumlahProduk: number | null;
  rataTrxBln: number | null;
  products: string[];
  strategies?: Array<{
    label: string; labelEn: string;
    program: string | null; programEn: string | null;
    alasan: string | null; alasanEn: string | null;
    channel: string | null; channelEn: string | null;
    programDesc: string | null; programDescEn: string | null;
  }>;
}

// One editable follow-up parameter row (same shape as the Hot Target page).
interface FollowUpRow {
  id?: number;
  parameterName: string;
  value: string;
  unit: string;
  isActive?: boolean;
  executionDate?: string;
}

// Suggested parameter names for the editable combo box (datalist).
const PARAM_SUGGESTIONS: string[] = [
  'Cashback QRIS',
  'Cashback belanja e-commerce partner',
  'Bebas biaya transfer antarbank',
  'Kuota transfer gratis / bulan',
  'Bonus suku bunga tabungan digital',
  'Bonus suku bunga tabungan',
  'Reward transaksi investasi pertama',
  'Special rate deposito',
  'Rate',
  'Setoran minimum',
  'Bebas biaya administrasi',
  'Hadiah pencapaian target',
];
const UNIT_SUGGESTIONS: string[] = ['%', 'Rp', 'bulan', 'x'];

// Persona cluster code -> label (ID / EN)
const PERSONA_LABELS: Record<string, { id: string; en: string }> = {
  cluster_0: { id: 'Pelajar Muda & Produktif', en: 'Young & Productive Students' },
  cluster_1: { id: 'Senior & Aman', en: 'Senior & Security-Focused' },
  cluster_2: { id: 'Pengusaha Kecil & Berorientasi Pertumbuhan', en: 'Growth-Oriented Small Business Owners' },
  cluster_3: { id: 'Nasabah Rentan & Membutuhkan Bantuan', en: 'Vulnerable Customers Needing Support' },
};

function personaLabel(cluster: string | null | undefined, lang: string): string {
  if (!cluster) return 'N/A';
  const p = PERSONA_LABELS[cluster];
  if (!p) return cluster; // show raw if it's already a human label
  return lang === 'id' ? p.id : p.en;
}

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Map raw MB status (active_mb / inactive_mb / non_mb) to a friendly label.
function mbStatusLabel(raw: string | null | undefined): string {
  switch ((raw || '').toLowerCase()) {
    case 'active_mb': return 'active';
    case 'inactive_mb': return 'inactive';
    case 'non_mb': return 'unregister';
    default: return raw || '-';
  }
}

export function CampaignActionPlanTemplate() {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  // The target customer is passed from the Detail Action Plan (promo-engine) page
  // via URL query params and/or localStorage. No in-page selector anymore.
  const [customer, setCustomer] = useState<HotTargetCustomer | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const savedJson = localStorage.getItem('selected_hot_target_customer');
      const saved: any = savedJson ? JSON.parse(savedJson) : null;

      const cif = sp.get('cif') || saved?.cif || '';
      if (!cif) { setCustomer(null); return; }

      setCustomer({
        cif,
        name: sp.get('name') || saved?.name || `Nasabah ${cif}`,
        churn: saved?.churn ?? 0,
        profit: saved?.profit || 'Lo',
        value: sp.get('aum') || saved?.value || '-',
        branch: sp.get('branch') || saved?.branch || 'Kantor Pusat Jakarta',
        cluster: saved?.cluster || '',
        action: sp.get('action') || saved?.action || '',
      });
    } catch (e) {
      console.error('Error reading selected customer:', e);
      setCustomer(null);
    }
  }, []);

  // Customer 360 profile (from bag_demo cluster_result + mv_h), by CIF.
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  useEffect(() => {
    const cifNow = customer?.cif;
    if (!cifNow) { setProfile(null); return; }
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch(`/api/v1/executive/bag-matrix/customer-profile?cif=${encodeURIComponent(cifNow)}`, { headers: authHeaders() });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && body.success && body.data) setProfile(body.data);
      } catch (err) {
        console.error('Failed to load customer profile:', err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customer?.cif]);

  // The cluster key used to load follow-up settings. The saved customer carries
  // either a raw cluster code ('cluster_0') or a human label; map back if needed.
  const clusterKey = (() => {
    if (!customer?.cluster) return '';
    if (PERSONA_LABELS[customer.cluster]) return customer.cluster;
    // try to resolve a label back to a cluster key
    const hit = Object.keys(PERSONA_LABELS).find(
      (k) => PERSONA_LABELS[k].id === customer.cluster || PERSONA_LABELS[k].en === customer.cluster
    );
    return hit || customer.cluster;
  })();

  // ---- Follow-up settings (same editor as the Bisnis Strategi page) ----
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [execDate, setExecDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Load the cluster's follow-up settings as the starting point for this customer.
  const cif = customer?.cif || '';
  useEffect(() => {
    if (!clusterKey) { setRows([]); return; }
    let cancelled = false;
    const mapRows = (data: any[]): FollowUpRow[] =>
      data.map((d: any) => ({
        id: d.id,
        parameterName: d.parameterName ?? '',
        value: d.value ?? '',
        unit: d.unit ?? '',
        isActive: d.isActive,
        executionDate: d.executionDate ?? '',
      }));
    async function fetchScope(withCif: boolean): Promise<any[] | null> {
      const qs = `cluster=${encodeURIComponent(clusterKey)}` + (withCif ? `&cif=${encodeURIComponent(cif)}` : '');
      const res = await fetch(`/api/v1/executive/follow-up-settings?${qs}`, { headers: authHeaders() });
      if (!res.ok) return null;
      const body = await res.json();
      return body.success && Array.isArray(body.data) ? body.data : null;
    }
    async function load() {
      setLoading(true);
      setSaved(false);
      try {
        // Prefer this customer's own saved settings; if none, start from the
        // cluster template so the RM has sensible defaults to adjust.
        let raw = cif ? await fetchScope(true) : null;
        if (!raw || raw.length === 0) {
          raw = (await fetchScope(false)) ?? [];
        }
        if (!cancelled) {
          setRows(mapRows(raw));
          const first = raw[0];
          setExecDate(first?.executionDate ?? '');
          setIsActive(first ? first.isActive !== false : true);
        }
      } catch (err) {
        console.error('Failed to load follow-up settings:', err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clusterKey, cif]);

  const addRow = () => setRows((p) => [...p, { parameterName: '', value: '', unit: '' }]);
  const removeRow = (idx: number) => setRows((p) => p.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof FollowUpRow, val: string) =>
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

  // Save a per-customer override, scoped by cif so it does not overwrite the
  // cluster-level template.
  const save = async () => {
    if (!customer) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        cluster: clusterKey,
        branch: null,
        cif: customer.cif,
        executionDate: execDate || null,
        items: rows
          .filter((r) => r.parameterName.trim() !== '')
          .map((r, i) => ({
            parameterName: r.parameterName.trim(),
            value: r.value,
            unit: r.unit,
            sortOrder: i,
            isActive: isActive,
            executionDate: execDate || null,
          })),
      };
      const res = await fetch('/api/v1/executive/follow-up-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save follow-up settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Churn ratio bar colour by severity.
  const churn = customer?.churn ?? 0;
  const churnColor = churn >= 70 ? 'text-red-600' : churn >= 40 ? 'text-amber-600' : 'text-emerald-600';
  const churnBar = churn >= 70 ? 'bg-red-500' : churn >= 40 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEn ? 'Customer Recommendation Setting' : 'Setting Rekomendasi per Customer'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEn
              ? 'Configure retention action plan details for the selected Hot Target customer.'
              : 'Konfigurasi detail rekomendasi aksi retensi untuk nasabah terpilih dari Matriks Hot Target.'}
          </p>
        </div>
        {/* Small spinner at top-right while the customer profile loads. */}
        {profileLoading && <Loader2 className="w-5 h-5 animate-spin text-[#8A6534] mt-1 shrink-0" />}
      </div>

      {!customer ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-400">
          {isEn
            ? 'No customer selected. Open this page from the Detail Action Plan customer list.'
            : 'Belum ada nasabah terpilih. Buka halaman ini dari daftar nasabah di Detail Rencana Aksi.'}
        </div>
      ) : (
        <>
          {/* Customer profile card */}
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-[#8A6534]" />
              <h3 className="text-sm font-bold text-slate-800">
                {isEn ? 'Customer Data' : 'Data Nasabah'}
              </h3>
            </div>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-lg">CIF: {customer.cif}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-600">
                  <span>{isEn ? 'Branch' : 'Cabang'}: <b className="text-slate-800">{customer.branch}</b></span>
                  <span>TRB: <b className="text-slate-900">{customer.value}</b></span>
                  <span>Cluster: <b className="text-[#6B4E2E]">{personaLabel(clusterKey, lang)}</b></span>
                </div>
              </div>

              {/* Churn risk ratio */}
              <div className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    {isEn ? 'Churn Risk Ratio' : 'Tingkat Risiko Churn'}
                  </span>
                  <span className={`text-lg font-extrabold ${churnColor}`}>{churn}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${churnBar} transition-all`} style={{ width: `${Math.min(100, Math.max(0, churn))}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {churn >= 70
                    ? (isEn ? 'High priority' : 'Prioritas tinggi')
                    : churn >= 40
                    ? (isEn ? 'Medium priority' : 'Prioritas sedang')
                    : (isEn ? 'Low priority' : 'Prioritas rendah')}
                </p>
              </div>
            </div>
          </section>

          {/* Customer 360 profile — from bag_demo (cluster_result + mv_h). */}
          {profile && (
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <UserCheck className="w-5 h-5 text-[#8A6534]" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isEn ? 'Customer Profile' : 'Profil Nasabah'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                {/* left column */}
                <div className="space-y-3">
                  <ProfileRow label={isEn ? 'Age' : 'Usia'} value={profile.usia != null ? `${profile.usia} ${isEn ? 'yr' : 'th'}` : '-'} />
                  <ProfileRow label="Gender" value={profile.gender || '-'} />
                  <ProfileRow label={isEn ? 'City' : 'Kota'} value={profile.kota || '-'} />
                  <ProfileRow
                    label="Status MB"
                    valueNode={
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-[#8A6534]/10 text-[#6B4E2E] border border-[#8A6534]/20">
                        {mbStatusLabel(profile.statusMb)}
                      </span>
                    }
                  />
                </div>
                {/* right column */}
                <div className="space-y-3">
                  <ProfileRow
                    label={isEn ? 'Total Balance' : 'Saldo Total'}
                    value={profile.saldoTotal != null ? `Rp ${Math.round(profile.saldoTotal).toLocaleString('id-ID')}` : '-'}
                  />
                  <ProfileRow label={isEn ? 'Products Held' : 'Jumlah Produk'} value={profile.jumlahProduk != null ? String(profile.jumlahProduk) : '-'} />
                  <ProfileRow
                    label={isEn ? 'Avg Txn / Month' : 'Rata Trx/bln'}
                    value={profile.rataTrxBln != null ? profile.rataTrxBln.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '-'}
                  />
                </div>
              </div>

              {/* Product badges */}
              {profile.products && profile.products.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-slate-100">
                  {profile.products.map((p) => (
                    <span key={p} className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Business Strategy — Special / Human (or retention variants), from
              the persona strategy tables. Each strategy shows up to 4 bullets. */}
          {profile?.strategies && profile.strategies.length > 0 && (
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <ClipboardList className="w-5 h-5 text-[#8A6534]" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isEn ? 'Business Strategy' : 'Strategi Bisnis'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.strategies.map((s, i) => {
                  const label = isEn ? (s.labelEn || s.label) : s.label;
                  // Chosen program + its reason, per CIF (cluster_result). EN
                  // falls back to ID until the *_en columns are populated.
                  const program = (isEn ? (s.programEn || s.program) : s.program) || '';
                  const alasan = (isEn ? (s.alasanEn || s.alasan) : s.alasan) || '';
                  const channel = (isEn ? (s.channelEn || s.channel) : s.channel) || '';
                  const programDesc = (isEn ? (s.programDescEn || s.programDesc) : s.programDesc) || '';
                  // The reason uses a pipe ('|') delimiter -> one bullet per segment.
                  const alasanPoints = alasan
                    .split('|')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  // The program description is also pipe ('|') delimited -> one bullet per segment.
                  const programDescPoints = programDesc
                    .split('|')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  if (!program && alasanPoints.length === 0 && !channel && programDescPoints.length === 0) return null;
                  return (
                    <div key={i} className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4">
                      <span className="inline-block text-[11px] font-bold text-[#8A6534] bg-[#8A6534]/10 border border-[#8A6534]/20 px-2 py-0.5 rounded-md mb-2.5">
                        {label}
                      </span>
                      {program && (
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">{program}</p>
                      )}
                      {channel && (
                        <div className="mt-2.5">
                          <p className="text-xs font-bold text-slate-500 mb-1">Channel:</p>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{channel}</p>
                        </div>
                      )}
                      {programDescPoints.length > 0 && (
                        <div className="mt-2.5">
                          <p className="text-xs font-bold text-slate-500 mb-1.5">Program:</p>
                          <div className="space-y-1.5">
                            {programDescPoints.map((pt, j) => (
                              <div key={j} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8A6534] shrink-0 mt-[7px]" />
                                <p className="flex-1 pt-0.5">{pt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {alasanPoints.length > 0 && (
                        <div className="mt-2.5">
                          <p className="text-xs font-bold text-slate-500 mb-1.5">{isEn ? 'Reason:' : 'Alasan:'}</p>
                          <div className="space-y-1.5">
                            {alasanPoints.map((pt, j) => (
                              <div key={j} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8A6534] shrink-0 mt-[7px]" />
                                <p className="flex-1 pt-0.5">{pt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Follow-up Settings card removed per request. */}
          {false && (
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#8A6534]" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isEn ? 'Follow-up Settings' : 'Setting Tindak Lanjut'}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {customer.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {isEn
                ? 'Adjust the offer parameters specifically for this customer (e.g. raise the savings rate).'
                : 'Sesuaikan parameter penawaran khusus untuk nasabah ini (mis. naikkan suku bunga tabungan).'}
            </p>

            {/* Shared execution date + active flag */}
            <div className="flex items-center gap-4 flex-wrap mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  {isEn ? 'Execution Date' : 'Tanggal Eksekusi'}
                </label>
                <input
                  type="date"
                  value={execDate}
                  onChange={(e) => setExecDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  {isEn ? 'Active' : 'Aktif'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${isActive ? 'bg-[#8A6534]' : 'bg-slate-300'}`}
                  title={isActive ? (isEn ? 'Active' : 'Aktif') : (isEn ? 'Inactive' : 'Nonaktif')}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isActive ? (isEn ? 'Active' : 'Aktif') : (isEn ? 'Inactive' : 'Nonaktif')}
                </span>
              </div>
            </div>

            <datalist id="apt-param-suggestions">
              {PARAM_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
            <datalist id="apt-unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
            </datalist>

            <div className="hidden md:flex items-center gap-2 px-1 mb-1.5">
              <span className="flex-1 text-[11px] font-semibold text-slate-400 uppercase">
                {isEn ? 'Parameter' : 'Parameter'}
              </span>
              <span className="w-28 text-[11px] font-semibold text-slate-400 uppercase">
                {isEn ? 'Value' : 'Nilai'}
              </span>
              <span className="w-20 text-[11px] font-semibold text-slate-400 uppercase">
                {isEn ? 'Unit' : 'Satuan'}
              </span>
              <span className="w-8" />
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  {isEn ? 'Loading...' : 'Memuat...'}
                </p>
              ) : rows.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  {isEn
                    ? 'No parameters yet. Click "Add Parameter" to add one.'
                    : 'Belum ada parameter. Klik "Tambah Parameter" untuk menambahkan.'}
                </p>
              ) : (
                rows.map((row, idx) => (
                  <div key={row.id ?? `new-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      list="apt-param-suggestions"
                      value={row.parameterName}
                      onChange={(e) => updateRow(idx, 'parameterName', e.target.value)}
                      placeholder={isEn ? 'Parameter name' : 'Nama parameter'}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateRow(idx, 'value', e.target.value)}
                      placeholder={isEn ? 'Value' : 'Nilai'}
                      className="w-28 px-3 py-2 text-sm font-bold text-[#8A6534] text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
                    />
                    <input
                      type="text"
                      list="apt-unit-suggestions"
                      value={row.unit}
                      onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                      placeholder={isEn ? 'Unit' : 'Satuan'}
                      className="w-20 px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      title={isEn ? 'Delete' : 'Hapus'}
                      className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mt-4">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#8A6534] border border-[#8A6534]/30 bg-[#8A6534]/5 rounded-lg hover:bg-[#8A6534] hover:text-white transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? 'Add Parameter' : 'Tambah Parameter'}
              </button>

              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs font-semibold text-emerald-600">
                    {isEn ? 'Saved' : 'Tersimpan'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#8A6534] hover:bg-[#6f5029] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? (isEn ? 'Saving...' : 'Menyimpan...') : (isEn ? 'Save' : 'Simpan')}
                </button>
              </div>
            </div>
          </section>
          )}

          {/* Back to the Promo Engine (CPI matrix) page. */}
          <div className="flex items-center mt-2">
            <button
              type="button"
              onClick={() => { window.location.href = '/cpi-matrix/promo-engine'; }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back' : 'Kembali'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// One label/value row in the Customer 360 profile panel.
function ProfileRow({ label, value, valueNode }: { label: string; value?: string; valueNode?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-2">
      <span className="text-xs text-slate-500">{label}</span>
      {valueNode ?? <span className="text-sm font-bold text-slate-900">{value}</span>}
    </div>
  );
}
