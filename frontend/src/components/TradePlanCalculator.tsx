import { useEffect, useState } from "react";
import axios from "axios";
import { Save, TrendingUp, TrendingDown } from "lucide-react";

interface TradePlan {
  id?: number;
  ticker: string;
  entry: number;
  target: number;
  stopLoss: number;
  quantity: number;
  accountSize: number;
  riskPct: number;
}

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("kingstop_token")}` } });

const num = (v: string) => parseFloat(v) || 0;

export default function TradePlanCalculator() {
  const [form, setForm] = useState<TradePlan>({
    ticker: "", entry: 0, target: 0, stopLoss: 0, quantity: 0, accountSize: 100000, riskPct: 2,
  });
  const [saved, setSaved] = useState<TradePlan[]>([]);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof TradePlan, v: string) => setForm((f) => ({ ...f, [k]: k === "ticker" ? v : num(v) }));

  const { entry, target, stopLoss, quantity, accountSize, riskPct } = form;
  const rr = entry && stopLoss && entry !== stopLoss ? ((target - entry) / (entry - stopLoss)).toFixed(2) : "—";
  const riskAmt = accountSize * riskPct / 100;
  const suggestedQty = entry && stopLoss && entry !== stopLoss ? (riskAmt / Math.abs(entry - stopLoss)).toFixed(0) : "—";
  const potentialProfit = ((target - entry) * quantity).toFixed(2);
  const potentialLoss = ((entry - stopLoss) * quantity).toFixed(2);

  const fetchPlans = () =>
    axios.get("/api/v1/trading-tools/trade-plan", auth()).then((r) => setSaved(r.data)).catch(() => {});

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post("/api/v1/trading-tools/trade-plan", form, auth());
      fetchPlans();
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof TradePlan, placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type={key === "ticker" ? "text" : "number"}
        value={form[key] as string | number}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  const stat = (label: string, value: string, color = "text-gray-700 dark:text-gray-200") => (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Trade Plan Calculator</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {field("Ticker", "ticker", "e.g. RELIANCE")}
        {field("Entry Price", "entry")}
        {field("Target Price", "target")}
        {field("Stop Loss", "stopLoss")}
        {field("Quantity", "quantity")}
        {field("Account Size (₹)", "accountSize")}
        {field("Risk % per Trade", "riskPct")}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-0.5">
        {stat("Risk/Reward Ratio", rr, parseFloat(rr) >= 2 ? "text-green-600" : "text-yellow-600")}
        {stat("Risk Amount", `₹${riskAmt.toFixed(2)}`)}
        {stat("Suggested Qty", suggestedQty)}
        {stat("Potential Profit", `₹${potentialProfit}`, "text-green-600")}
        {stat("Potential Loss", `₹${potentialLoss}`, "text-red-500")}
        {stat("Breakeven", entry ? `₹${entry}` : "—")}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.ticker}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        <Save size={15} /> {saving ? "Saving..." : "Save Plan"}
      </button>

      {saved.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Saved Plans</h3>
          {saved.map((p, i) => (
            <div key={p.id ?? i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <span className="font-semibold text-indigo-600 w-24">{p.ticker}</span>
              <span className="text-gray-500">Entry: ₹{p.entry}</span>
              <span className="flex items-center gap-1 text-green-600"><TrendingUp size={13} />₹{p.target}</span>
              <span className="flex items-center gap-1 text-red-500"><TrendingDown size={13} />₹{p.stopLoss}</span>
              <span className="text-gray-400">Qty: {p.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
