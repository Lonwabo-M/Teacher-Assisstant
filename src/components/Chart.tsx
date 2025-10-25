import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import type { ChartData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';

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
      const canvas = await html2canvas(chartContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff', // Set a white background
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${chartData.title.replace(/\s+/g, '_')}-chart.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download chart:", error);
      alert("Could not download the chart.");
    } finally {
      setIsDownloading(false);
    }
  };

  const { title, data, description, type } = chartData;
  if ((type !== 'bar' && type !== 'line') || !data.datasets?.[0]?.data?.length) {
    if (!showControls) return null; // Don't render anything if embedded and invalid
    return (
      <div className="text-center p-8 bg-slate-50 rounded-lg">
        <p className="text-slate-600">Chart type "{type}" is not supported, or data is missing.</p>
      </div>
    );
  }

  const dataset = data.datasets[0];
  const colors = [
    '#38bdf8', '#fbbf24', '#4ade80', '#f87171', '#a78bfa',
    '#2dd4bf', '#f472b6', '#818cf8', '#fb923c', '#a3e635'
  ];

  // --- Chart Scale Calculation ---
  const calculateNiceScale = (dataPoints: number[]) => {
    if (!dataPoints || dataPoints.length === 0) {
      return { chartMin: 0, chartMax: 10, chartRange: 10, step: 2 };
    }

    let dataMin = Math.min(...dataPoints);
    let dataMax = Math.max(...dataPoints);

    if (dataMin === dataMax) {
      const padding = Math.abs(dataMin * 0.1) || 1;
      dataMin -= padding;
      dataMax += padding;
    }
    
    // Determine the rough range and add some padding
    let range = dataMax - dataMin;
    const padding = range * 0.1;
    let chartMin = dataMin - padding;
    let chartMax = dataMax + padding;

    // Anchor to zero if the data is all positive or all negative, but not far from zero
    if (dataMin >= 0 && dataMin < range) chartMin = 0;
    if (dataMax <= 0 && Math.abs(dataMax) < range) chartMax = 0;
    
    // Recalculate range after anchoring
    range = chartMax - chartMin;
    
    const targetSteps = 4;
    const roughStep = range / targetSteps;

    // Calculate a 'nice' step value (e.g., 1, 2, 5, 10, 20, 50...)
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;

    let niceStep;
    if (residual > 5) niceStep = 10 * magnitude;
    else if (residual > 2) niceStep = 5 * magnitude;
    else if (residual > 1) niceStep = 2 * magnitude;
    else niceStep = magnitude;

    // Adjust the final min and max to be multiples of the nice step
    const finalMin = Math.floor(chartMin / niceStep) * niceStep;
    const finalMax = Math.ceil(chartMax / niceStep) * niceStep;
    const finalRange = finalMax - finalMin;

    return { chartMin: finalMin, chartMax: finalMax, chartRange: finalRange, step: niceStep };
  };

  const { chartMin, chartMax, chartRange, step } = calculateNiceScale(dataset.data);

  const yAxisLabels = () => {
    const labels = [];
    if (!isFinite(chartRange) || chartRange <= 0 || !step) return [];

    // Determine number of decimal places from step size to avoid floating point issues
    const decimals = Math.max(0, -Math.floor(Math.log10(step) + 0.0000001));
    const numLabels = Math.round(chartRange / step) + 1;

    for (let i = 0; i < numLabels; i++) {
      const value = chartMin + (i * step);
      // Use toPrecision to handle floating point errors before rounding with toFixed
      const labelText = parseFloat(value.toPrecision(15)).toFixed(decimals);
      labels.push(<span key={i}>{labelText}</span>);
    }
    return labels.reverse();
  };
  
  // --- Chart Renderers ---

  const renderLineChart = () => {
    const svgWidth = 500;
    const svgHeight = 320;
    const padding = { top: 15, right: 15, bottom: 15, left: 15 };

    const getPoint = (value: number, index: number) => {
      const x = padding.left + (dataset.data.length > 1 ? (index / (dataset.data.length - 1)) * (svgWidth - padding.left - padding.right) : (svgWidth - padding.left - padding.right) / 2);
      
      let y;
      if (chartRange > 0) {
          const percentageFromMin = (value - chartMin) / chartRange;
          y = (1 - percentageFromMin) * (svgHeight - padding.top - padding.bottom) + padding.top;
      } else {
          y = svgHeight / 2;
      }
      return { x, y };
    };

    const points = dataset.data.map(getPoint);
    const pathData = "M " + points.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ");
    const zeroLineY = getPoint(0, 0).y;
    const areaPath = `${pathData} L ${points[points.length-1].x.toFixed(2)} ${zeroLineY} L ${points[0].x.toFixed(2)} ${zeroLineY} Z`;

    return (
        <div className="w-full h-full p-0">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
              {[...Array(Math.round(chartRange/step) + 1)].map((_, i) => {
                  const value = chartMin + (step * i);
                  if (Math.abs(value - 0) < 0.001) return null; // Don't redraw over zero line
                  const y = getPoint(value, 0).y;
                  return <line key={`grid-${i}`} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
              })}

              {chartMin <= 0 && chartMax >= 0 && (
                <line x1={padding.left} y1={zeroLineY} x2={svgWidth - padding.right} y2={zeroLineY} stroke="#94a3b8" strokeWidth="1.5" />
              )}
              
              <defs>
                <linearGradient id="positive-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[0]} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={colors[0]} stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="negative-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0"/>
                  <stop offset="100%" stopColor="#f87171" stopOpacity="0.3"/>
                </linearGradient>
                <clipPath id="clip-above">
                  <rect x="0" y="0" width={svgWidth} height={zeroLineY} />
                </clipPath>
                <clipPath id="clip-below">
                  <rect x="0" y={zeroLineY} width={svgWidth} height={svgHeight - zeroLineY} />
                </clipPath>
              </defs>
              
              <g clipPath="url(#clip-above)">
                <path d={areaPath} fill="url(#positive-gradient)" />
              </g>
              <g clipPath="url(#clip-below)">
                <path d={areaPath} fill="url(#negative-gradient)" />
              </g>

              <path d={pathData} fill="none" stroke={colors[0]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              
              {points.map((point, index) => (
                <g key={index} className="group cursor-pointer">
                  <circle cx={point.x} cy={point.y} r="4" fill={colors[0]} stroke="white" strokeWidth="1.5" className="transition-transform duration-200 group-hover:scale-125"/>
                  
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{transform: `translate(${point.x}px, ${point.y-18}px)`}}>
                     <path d="M-22,0 h12 l5,5 l5,-5 h12 v-20 h-34 z" fill="#1e293b" />
                     <text x="0" y="-8" textAnchor="middle" fill="white" className="text-sm font-bold">
                      {dataset.data[index]}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
        </div>
    );
  };

  const renderBarChart = () => {
    const svgWidth = 500;
    const svgHeight = 320;
    const padding = { top: 25, right: 15, bottom: 15, left: 15 }; // Extra top padding for value labels

    // Helper to find Y coordinate for a given data value
    const getY = (value: number) => {
        if (chartRange > 0) {
            const percentageFromMin = (value - chartMin) / chartRange;
            return (1 - percentageFromMin) * (svgHeight - padding.top - padding.bottom) + padding.top;
        }
        return svgHeight / 2;
    };
    
    const zeroLineY = getY(0);

    const barCount = dataset.data.length;
    const totalContentWidth = svgWidth - padding.left - padding.right;
    const bandWidth = barCount > 0 ? totalContentWidth / barCount : 0;
    const barWidth = bandWidth * 0.7; // 70% of the available space for the bar
    const barPadding = bandWidth * 0.3;

    return (
        <div className="w-full h-full p-0">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[...Array(Math.round(chartRange/step) + 1)].map((_, i) => {
                    const value = chartMin + (step * i);
                    if (Math.abs(value - 0) < 0.001) return null; // Don't redraw over zero line
                    const y = getY(value);
                    return <line key={`grid-${i}`} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
                })}

                {/* Zero axis line */}
                {chartMin <= 0 && chartMax >= 0 && (
                    <line x1={padding.left} y1={zeroLineY} x2={svgWidth - padding.right} y2={zeroLineY} stroke="#94a3b8" strokeWidth="1.5" />
                )}

                {/* Bars and Labels */}
                {dataset.data.map((value, index) => {
                    const barColor = colors[index % colors.length];
                    const barHeight = Math.abs(getY(value) - zeroLineY);
                    
                    const x = padding.left + (barPadding / 2) + (index * bandWidth);
                    const y = value >= 0 ? zeroLineY - barHeight : zeroLineY;

                    const valueTextY = value >= 0 ? y - 6 : y + barHeight + 14;
                    const valueTextColor = '#475569'; // slate-600

                    return (
                        <g key={index} className="group cursor-pointer">
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={barColor}
                                rx="2"
                                className="transition-opacity duration-200 group-hover:opacity-80"
                            />
                            <text
                                x={x + barWidth / 2}
                                y={valueTextY}
                                textAnchor="middle"
                                fill={valueTextColor}
                                className="text-[10px] font-semibold transition-transform duration-200 group-hover:font-bold"
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
  };

  // Embedded version for slides/worksheets
  if (!showControls) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-shrink-0">
          <h3 className="text-xl font-bold text-center text-slate-700 mb-2">{title}</h3>
          <p className="text-sm text-center text-slate-500 mb-6">{dataset.label}</p>
        </div>
        
        <div className="flex-grow w-full relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-500 py-[14px]">
            {yAxisLabels()}
          </div>
          <div className="w-full h-full border-l border-slate-300 ml-8">
            {type === 'bar' && renderBarChart()}
            {type === 'line' && renderLineChart()}
          </div>
        </div>
        
        <div className="flex-shrink-0 w-full flex justify-around mt-2 pl-10">
          {data.labels.map((label, index) => (
            <span key={index} className="flex-1 text-center text-xs text-slate-600 font-medium break-words px-1" title={label}>
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Standalone version with controls and description
  const ChartContent = (
    <div ref={chartContainerRef} className="bg-white p-6 rounded-lg border border-slate-200">
      <h3 className="text-xl font-bold text-center text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-center text-slate-500 mb-6">{dataset.label}</p>
      
      <div className="w-full h-80 relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-500 py-[14px]">
          {yAxisLabels()}
        </div>
        
        <div className="w-full h-full border-l border-slate-300 ml-8">
          {type === 'bar' && renderBarChart()}
          {type === 'line' && renderLineChart()}
        </div>
      </div>

      <div className="w-full flex justify-around mt-2 pl-10">
        {data.labels.map((label, index) => (
           <span key={index} className="flex-1 text-center text-xs text-slate-600 font-medium break-words px-1" title={label}>
              {label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
        <h2 className="text-3xl font-bold text-slate-800">Chart</h2>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:bg-slate-300 disabled:cursor-wait"
          aria-label="Download chart as PNG"
        >
          <div className="h-5 w-5 mr-2">
            {isDownloading ? (
              <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 * 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <DownloadIcon />
            )}
          </div>
          {isDownloading ? 'Generating...' : 'Download as PNG'}
        </button>
      </div>

      {ChartContent}
      
      <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-r-lg mt-6">
        <h4 className="font-bold">Chart Description</h4>
        <p className="text-sm">{description}</p>
      </div>
    </div>
  );
};

export default Chart;