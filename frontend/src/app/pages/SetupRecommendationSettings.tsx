import { useI18n } from '../i18n';
import { Sliders, Save, Cpu, ShoppingBag } from 'lucide-react';
import { PageHeader, StatusBanner, Badge, InProgressBadge, THEME } from './_inProgressKit';

const ALGORITHMS = [
  { name: 'Apriori', desc: 'Association Rule Mining', enabled: true },
  { name: 'FP-Growth', desc: 'Frequent Pattern', enabled: true },
  { name: 'Eclat', desc: 'Equivalence Class', enabled: false },
  { name: 'LLM Cold-Start', desc: 'GenAI fallback', enabled: true },
];

export function SetupRecommendationSettings() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="SET-03"
        title={lang === 'id' ? 'Pengaturan Rekomendasi' : 'Recommendation Settings'}
        subtitle={lang === 'id'
          ? 'Konfigurasi algoritma, ambang confidence/lift, dan jumlah produk yang direkomendasikan.'
          : 'Configure algorithms, confidence/lift thresholds, and number of recommended products.'}
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-semibold transition shadow-2xs">
            <Save className="w-3.5 h-3.5" /> {lang === 'id' ? 'Simpan' : 'Save'}
          </button>
        }
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Pengaturan Recommender' : 'Recommender Settings Module'}
        desc={lang === 'id'
          ? 'Parameter engine rekomendasi sedang diintegrasikan dengan backend. Kontrol di bawah adalah pratinjau [In Progress].'
          : 'Recommender engine parameters are being integrated with the backend. Controls below are an [In Progress] preview.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Cpu className="w-4 h-4 text-[#7C3AED]" /> {lang === 'id' ? 'Algoritma Aktif' : 'Active Algorithms'}</h3>
            <InProgressBadge />
          </div>
          <div className="space-y-3">
            {ALGORITHMS.map((a) => (
              <div key={a.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{a.name}</p>
                  <p className="text-[11px] text-slate-400">{a.desc}</p>
                </div>
                <Badge text={a.enabled ? (lang === 'id' ? 'Aktif' : 'Enabled') : (lang === 'id' ? 'Nonaktif' : 'Disabled')} tone={a.enabled ? 'green' : 'gray'} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Sliders className="w-4 h-4 text-[#0E7490]" /> {lang === 'id' ? 'Ambang & Parameter' : 'Thresholds & Parameters'}</h3>
            <InProgressBadge />
          </div>
          <div className="space-y-4">
            <SliderRow label={lang === 'id' ? 'Min. Confidence' : 'Min. Confidence'} value="0.55" pct={55} color={THEME.brand} />
            <SliderRow label={lang === 'id' ? 'Min. Lift' : 'Min. Lift'} value="1.2x" pct={40} color={THEME.teal} />
            <SliderRow label={lang === 'id' ? 'Produk Banking per Nasabah' : 'Banking Products per Customer'} value="3" pct={60} color={THEME.violet} />
            <SliderRow label={lang === 'id' ? 'Produk Digital per Nasabah' : 'Digital Products per Customer'} value="3" pct={60} color={THEME.emerald} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#8A6534]" /> {lang === 'id' ? 'Cakupan Produk' : 'Product Scope'}</h3>
          <InProgressBadge />
        </div>
        <div className="flex flex-wrap gap-2">
          {['Tabungan', 'Deposito', 'KPR', 'Kartu Kredit', 'Mobile Banking', 'QRIS', 'Reksadana', 'Giro', 'Asuransi', 'Obligasi'].map((p) => (
            <Badge key={p} text={p} tone="terra" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
