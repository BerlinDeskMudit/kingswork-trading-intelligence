import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";

interface SectorData {
  sector: string;
  value: number;
  pct: number;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#a855f7", "#f97316", "#0ea5e9"];

export default function RiskExposurePanel({ portfolioId }: { portfolioId: number }) {
  const [data, setData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("kingstop_token");
    axios
      .get(`/api/v1/analytics/sector-exposure/${portfolioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [portfolioId]);

  const highExposure = data.filter((d) => d.pct > 40);

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-4 shadow">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Sector Exposure</h2>

      {highExposure.map((d) => (
        <div key={d.sector} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg px-3 py-2 text-yellow-700 dark:text-yellow-400 text-sm">
          <AlertTriangle size={16} />
          <span><strong>{d.sector}</strong> is {d.pct.toFixed(1)}% of your portfolio — consider diversifying.</span>
        </div>
      ))}

      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="sector" width={100} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.sector} className="flex items-center gap-3 text-sm">
            <span className="w-28 text-gray-700 dark:text-gray-300 truncate">{d.sector}</span>
            <span className="w-20 text-right text-gray-500 dark:text-gray-400">₹{d.value.toLocaleString()}</span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(d.pct, 100)}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
            <span className="w-12 text-right font-medium text-gray-700 dark:text-gray-300">{d.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
