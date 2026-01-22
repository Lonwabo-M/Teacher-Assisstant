
import React, { useRef, useState } from 'react';
import type { ChartData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { downloadElementAsImage } from '../utils/downloadUtils';
import { Spinner } from './Spinner';
import { calculateNiceScale } from '../utils/chartUtils';

interface ChartProps {
  chartData: ChartData;
  showControls?: boolean;
}

const Chart: React.FC<ChartProps> = ({ chartData, showControls = true }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!chartContainerRef.current) return;
    setIsDownloading(true);
    try {
        await downloadElementAsImage(chartContainerRef.current, `${chartData.title.replace(/\s+/g, '_')}-chart.png`);
    } catch (error) {
      console.error("Failed to download chart:", error);
      alert("Could not download the chart.");
    } finally {
      setIsDownloading(false);
    }
  };

  const { title, data, description, type } = chartData;
  if ((type !== 'bar' && type !== 'line') || !data.datasets?.[0]?.data?.length) {
    if (!showControls) return null;
    return (
      <div className="text-center p-8 bg-slate-50 rounded-lg">
        <p className="text-slate-600">Chart type "{type}" is not supported, or data is missing.</p>
      </div>
    );
  }

  const dataset = data.datasets[0];
  const colors = ['#38bdf8', '#fbbf24', '#4ade80', '#f87171', '#a78bfa', '#2dd4bf', '#f472b6', '#818cf8', '#fb923c', '#a3e635'];

  const { chartMin, chartMax, chartRange, step } = calculateNiceScale(dataset.data);

  const yAxisLabels = () => {
    const labels = [];
    if (!isFinite(chartRange) || chartRange <= 0 || !step) return [];
    const decimals = Math.max(0, -Math.floor(Math.log10(step) + 0.0000001));
    const numLabels = Math.round(chartRange / step) + 1;

    for (let i = 0; i < numLabels; i++) {
      const value = chartMin + (i * step);
      const labelText = parseFloat(value.toPrecision(15)).toFixed(decimals);
      labels.push(<span key={i}>{labelText}</span>);
    }
    return labels.reverse();
  };

  const renderLineChart = () => {
    const svgWidth = 500;
    const svgHeight = 320;
    const padding = { top: 15, right: 15, bottom: 15, left: 15 };

    const getPoint = (value: number, index: number) => {
      const x = padding.left + (dataset.data.length > 1 ? (index / (dataset.data.length - 1)) * (svgWidth - padding.left - padding.right) : (svgWidth - padding.left - padding.right) / 2);
      const percentageFromMin = chartRange > 0 ? (value - chartMin) / chartRange : 0.5;
      const y = (1 - percentageFromMin) * (svgHeight - padding.top - padding.bottom) + padding.top;
      return { x, y };
    };

    const points = dataset.data.map(getPoint);
    const pathData = "M " + points.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ");
    const zeroLineY = getPoint(0, 0).y;
    const areaPath = `${pathData} L ${points[points.length-1].x.toFixed(2)} ${zeroLineY} L ${points[0].x.toFixed(2)} ${zeroLineY} Z`;

    return (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
        {[...Array(Math.round(chartRange/step) + 1)].map((_, i) => {
            const y = getPoint(chartMin + (step * i), 0).y;
            return <line key={i} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {chartMin <= 0 && chartMax >= 0 && <line x1={padding.left} y1={zeroLineY} x2={svgWidth - padding.right} y2={zeroLineY} stroke="#94a3b8" strokeWidth="1.5" />}
        <path d={areaPath} fill="url(#line-grad)" opacity="0.1" />
        <linearGradient id="line-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={colors[0]}/><stop offset="100%" stopColor="white"/></linearGradient>
        <path d={pathData} fill="none" stroke={colors[0]} strokeWidth="2.5" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={colors[0]} stroke="white" strokeWidth="1.5" />)}
      </svg>
    );
  };

  const renderBarChart = () => {
    const svgWidth = 500;
    const svgHeight = 320;
    const padding = { top: 25, right: 15, bottom: 15, left: 15 };
    const getY = (v: number) => (1 - ((v - chartMin) / chartRange)) * (svgHeight - padding.top - padding.bottom) + padding.top;
    const zeroLineY = getY(0);
    const bandWidth = (svgWidth - padding.left - padding.right) / dataset.data.length;

    return (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
        {[...Array(Math.round(chartRange/step) + 1)].map((_, i) => {
            const y = getY(chartMin + (step * i));
            return <line key={i} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {dataset.data.map((v, i) => {
            const h = Math.abs(getY(v) - zeroLineY);
            return <rect key={i} x={padding.left + i * bandWidth + bandWidth * 0.15} y={v >= 0 ? zeroLineY - h : zeroLineY} width={bandWidth * 0.7} height={h} fill={colors[i % colors.length]} rx="2" />;
        })}
        {chartMin <= 0 && chartMax >= 0 && <line x1={padding.left} y1={zeroLineY} x2={svgWidth - padding.right} y2={zeroLineY} stroke="#94a3b8" strokeWidth="1.5" />}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {showControls && (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
          <h2 className="text-3xl font-bold text-slate-800">Chart</h2>
          <button onClick={handleDownload} disabled={isDownloading} className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 transition-colors disabled:opacity-50">
            <div className="h-5 w-5 mr-2">{isDownloading ? <Spinner /> : <DownloadIcon />}</div>
            {isDownloading ? 'Generating...' : 'Download as PNG'}
          </button>
        </div>
      )}
      <div ref={chartContainerRef} className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="text-xl font-bold text-center text-slate-700 mb-2">{title}</h3>
        <p className="text-sm text-center text-slate-500 mb-6">{dataset.label}</p>
        <div className="w-full h-80 flex">
          <div className="w-10 flex flex-col justify-between text-[10px] text-slate-500 py-[15px]">{yAxisLabels()}</div>
          <div className="flex-grow border-l border-slate-300">{type === 'bar' ? renderBarChart() : renderLineChart()}</div>
        </div>
        <div className="flex justify-around mt-2 pl-10">
          {data.labels.map((l, i) => <span key={i} className="flex-1 text-center text-[10px] text-slate-600 px-1">{l}</span>)}
        </div>
      </div>
      {showControls && <div className="bg-sky-50 border-l-4 border-sky-500 p-4 text-sky-800 text-sm"><h4 className="font-bold">Description</h4><p>{description}</p></div>}
    </div>
  );
};

export default Chart;
