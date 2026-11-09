import { useI18n } from '../i18n';
import { Download } from 'lucide-react';

const BRANCHES = ['Jakarta Pusat', 'Bandung', 'Surabaya', 'Medan', 'Denpasar'];
const FIRST = ['Andi', 'Bagus', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kartika', 'Lina', 'Maya', 'Nanda', 'Oki', 'Putri', 'Rian', 'Sari', 'Tono', 'Wulan'];
const LAST = ['Pratama', 'Wijaya', 'Santoso', 'Kusuma', 'Halim', 'Nugroho', 'Saputra', 'Anggraini', 'Hidayat', 'Permana'];
const CORP = ['PT Maju Bersama', 'CV Sinar Abadi', 'PT Karya Nusantara', 'PT Boga Rasa', 'CV Tekno Mandiri', 'PT Sentosa Jaya'];

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
const rng = seededRandom(77);

const CUSTOMERS = Array.from({ length: 25 }, (_, i) => {
  const isCorp = rng() < 0.3;
  const name = isCorp
    ? CORP[Math.floor(rng() * CORP.length)]
    : `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
  const profitRp = Math.round((180 - i * 5.5 + rng() * 20) * 10) / 10;
  const tier = profitRp >= 120 ? 'Hi' : profitRp >= 70 ? 'Med' : 'Lo';
  return {
    id: `CUS${10300 + i}`,
    name,
    type: isCorp ? 'Korporat' : 'Individu',
    branch: BRANCHES[Math.floor(rng() * BRANCHES.length)],
    profitRp,
    tier,
  };
}).sort((a, b) => b.profitRp - a.profitRp);

function TierBadge({ tier }: { tier: string }) {
  const cls = tier === 'Hi' ? 'bg-green-50 text-green-700' : tier === 'Med' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{tier}</span>;
}

export function ProfitabilityList() {
  const { lang } = useI18n();

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Daftar Profitabilitas Nasabah' : 'Customer Profitability List'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Nasabah tersortir profit per cabang.'
              : 'Customers sorted by profit per branch.'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition">
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>

      {/* Branch selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-500 font-medium">{lang === 'id' ? 'Cabang' : 'Branch'}</label>
        <select className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
          <option>{lang === 'id' ? 'Semua Cabang' : 'All Branches'}</option>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Nasabah' : 'Customer'}</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Tipe' : 'Type'}</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Cabang' : 'Branch'}</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Tier Profit' : 'Profit Tier'}</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">Profitability</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer">
                <td className="py-2 px-4 font-medium text-slate-800">{c.name}</td>
                <td className="py-2 px-4 text-slate-500">{c.type}</td>
                <td className="py-2 px-4 text-slate-600">{c.branch}</td>
                <td className="py-2 px-4"><TierBadge tier={c.tier} /></td>
                <td className="py-2 px-4 text-right font-bold text-slate-900">Rp {c.profitRp.toFixed(1)} jt</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
