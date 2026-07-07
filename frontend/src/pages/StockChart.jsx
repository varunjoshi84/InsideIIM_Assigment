import React, { useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'];

const GREEN = '#00C853';
const RED = '#EF4444';

/**
 * Draws the Groww-style crosshair: a vertical line + a ring marker
 * at whichever point is currently hovered/active.
 */
const crosshairPlugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    if (!active || !active.length) return;

    const { ctx, chartArea } = chart;
    const point = active[0].element;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(point.x, chartArea.top);
    ctx.lineTo(point.x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = chart.data.datasets[0].borderColor;
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * Reference dashed baseline at the first price of the visible range,
 * matching the faint horizontal guide line Groww shows.
 */
const baselinePlugin = {
  id: 'baseline',
  beforeDatasetsDraw(chart) {
    const data = chart.data.datasets[0]?.data;
    if (!data || !data.length) return;
    const y = chart.scales.y.getPixelForValue(data[0]);
    const { left, right } = chart.chartArea;

    const { ctx } = chart;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * StockChart
 *
 * history: {
 *   '1D': [{ date: '10:15 AM', price: 3040.1 }, ...],
 *   '1W': [...], '1M': [...], '3M': [...], '6M': [...],
 *   '1Y': [...], '3Y': [...], '5Y': [...], 'All': [...]
 * }
 * Each array should be pre-sorted oldest -> newest.
 */
export default function StockChart({
  companyName,
  ticker,
  exchange = 'NSE',
  history,
  loading = false,
  currency,
}) {
  const chartRef = useRef(null);

  const isINR = currency === 'INR' || exchange === 'NSE' || exchange === 'BSE' || exchange === 'NSI' || ticker?.endsWith('.NS') || ticker?.endsWith('.BO');
  const currencySymbol = isINR ? '₹' : (currency === 'USD' ? '$' : currency || '$');

  const availablePeriods = PERIODS.filter((p) => history?.[p]?.length);
  const defaultPeriod =
    (availablePeriods.includes('3Y') && '3Y') || availablePeriods[0] || '1D';

  const [period, setPeriod] = useState(defaultPeriod);
  const [hover, setHover] = useState(null);

  const data = history?.[period] || [];

  const latestPrice = data.length ? data[data.length - 1].price : null;
  const startPrice = data.length ? data[0].price : null;
  const change =
    latestPrice != null && startPrice != null ? latestPrice - startPrice : null;
  const changePercent = startPrice ? (change / startPrice) * 100 : null;
  const isUp = (change ?? 0) >= 0;
  const lineColor = isUp ? GREEN : RED;

  const displayPrice = hover ? hover.price : latestPrice;
  const displayDate = hover ? hover.date : null;

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.date),
      datasets: [
        {
          data: data.map((d) => d.price),
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.15,
          fill: false,
        },
      ],
    }),
    [data, lineColor]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context) => {
            const point = context.tooltip.dataPoints?.[0];
            if (!point) {
              setHover(null);
              return;
            }
            setHover({ price: point.raw, date: point.label });
          },
        },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      onHover: (_event, elements) => {
        if (!elements.length) setHover(null);
      },
    }),
    []
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6">
      {/* Header */}
      <span className="text-xs text-[#6B7280] font-bold tracking-wider">
        {ticker} · {exchange}
      </span>
      <h2 className="text-lg font-bold text-[#111827] mt-1 mb-2">{companyName}</h2>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-[#111827] tracking-tight">
          {displayPrice != null
            ? `${currencySymbol}${displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
            : '--'}
        </span>
        {!hover && change != null && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isUp ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20' : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
            }`}
          >
            {isUp ? '+' : ''}
            {change.toFixed(2)} ({changePercent.toFixed(2)}%)
          </span>
        )}
        <span className="text-xs text-[#6B7280] font-medium">{hover ? displayDate : period}</span>
      </div>

      {/* Chart */}
      <div
        className="h-[260px] mt-5 relative"
        onMouseLeave={() => setHover(null)}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-300 text-sm">
            Loading chart...
          </div>
        ) : data.length ? (
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[crosshairPlugin, baselinePlugin]}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 text-sm">
            No price history available
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-[#E5E7EB]">
        {PERIODS.map((p) => {
          const disabled = !history?.[p]?.length;
          const active = period === p;
          return (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => {
                setPeriod(p);
                setHover(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer
                ${
                  active
                    ? 'bg-[#111827] text-white border-[#111827] shadow-sm shadow-[#111827]/5'
                    : disabled
                    ? 'border-[#E5E7EB] text-[#E5E7EB] opacity-40 cursor-not-allowed'
                    : 'border-[#E5E7EB] text-[#6B7280] bg-white hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
