import { useI18n } from '../i18n';
import { User, Wallet, Activity, ShoppingBag, Smartphone, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';
import { PageHeader, StatusBanner, Badge, InProgressBadge, THEME } from './_inProgressKit';

const PRODUCTS = [
  { name: 'Tabungan Reguler', balance: 'Rp 45,2 Jt', tone: 'green' as const },
  { name: 'Deposito 6 Bulan', balance: 'Rp 250 Jt', tone: 'terra' as const },
  { name: 'Kartu Kredit Platinum', balance: 'Limit Rp 50 Jt', tone: 'violet' as const },
  { name: 'Mobile Banking', balance: '—', tone: 'teal' as const },
];

const TIMELINE = [
  { date: '28 Feb 2024', event: 'Transaksi QRIS Rp 1,2 Jt', type: 'transaction' },
  { date: '15 Feb 2024', event: 'Login Mobile Banking', type: 'digital' },
  { date: '02 Feb 2024', event: 'Pembukaan Deposito 6 Bulan', type: 'product' },
  { date: '20 Jan 2024', event: 'Kunjungan RM — Retensi', type: 'campaign' },
];

export function Customer360Profile() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="C360-01"
        title={lang === 'id' ? 'Profil Nasabah 360°' : 'Customer 360° Profile'}
        subtitle={lang === 'id'
          ? 'Tampilan menyeluruh profil, kepemilikan produk, aktivitas, dan indikator risiko nasabah.'
          : 'Holistic view of customer profile, product holdings, activity, and risk indicators.'}
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Customer 360' : 'Customer 360 Module'}
        desc={lang === 'id'
          ? 'Agregasi data 360° nasabah sedang diintegrasikan dengan backend. Profil di bawah adalah pratinjau [In Progress].'
          : 'Customer 360 data aggregation is being integrated with the backend. Profile below is an [In Progress] preview.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#8A6534] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#8A6534] text-white flex items-center justify-center text-lg font-bold">BS</div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Budi Santoso</h3>
                <p className="text-[11px] text-slate-400 font-mono">CIF: 10289 · Young Professional</p>
              </div>
            </div>
            <InProgressBadge />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> +62 812-3456-7890</p>
            <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> budi.santoso@email.com</p>
            <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Jakarta Selatan · KC Sudirman</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">Churn Index</p>
              <p className="text-lg font-black text-red-600">74%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">{lang === 'id' ? 'Profitabilitas' : 'Profitability'}</p>
              <p className="text-lg font-black" style={{ color: THEME.brand }}>Hi</p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MiniStat icon={Wallet} label={lang === 'id' ? 'Total Aset' : 'Total Assets'} value="Rp 345 Jt" color={THEME.brand} />
          <MiniStat icon={Activity} label={lang === 'id' ? 'Skor Aktivitas' : 'Activity Score'} value="82 / 100" color={THEME.emerald} />
          <MiniStat icon={ShoppingBag} label={lang === 'id' ? 'Produk Dimiliki' : 'Products Held'} value="4" color={THEME.teal} />
          <MiniStat icon={Smartphone} label={lang === 'id' ? 'Kanal Digital' : 'Digital Channels'} value="3 Aktif" color={THEME.violet} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Products */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#8A6534]" /> {lang === 'id' ? 'Kepemilikan Produk' : 'Product Holdings'}</h3>
            <InProgressBadge />
          </div>
          <div className="space-y-2">
            {PRODUCTS.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{p.balance}</span>
                  <Badge text={lang === 'id' ? 'Aktif' : 'Active'} tone={p.tone} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-[#0E7490]" /> {lang === 'id' ? 'Aktivitas Terkini' : 'Recent Activity'}</h3>
            <InProgressBadge />
          </div>
          <div className="space-y-3">
            {TIMELINE.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: THEME.teal }} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{t.event}</p>
                  <p className="text-[11px] text-slate-400">{t.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="text-xs text-red-700">
          <span className="font-bold text-red-800">{lang === 'id' ? 'Indikator Risiko: Churn Tinggi' : 'Risk Indicator: High Churn'}</span>
          <p className="mt-0.5">{lang === 'id' ? 'Aktivitas transaksi menurun 34% dalam 60 hari terakhir. Disarankan tindak lanjut retensi.' : 'Transaction activity dropped 34% in the last 60 days. Retention follow-up recommended.'}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
