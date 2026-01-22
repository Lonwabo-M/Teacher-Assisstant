
/**
 * Calculates a 'nice' scale for charts based on data points.
 */
export const calculateNiceScale = (dataPoints: number[]) => {
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
  
  let range = dataMax - dataMin;
  const padding = range * 0.1;
  let chartMin = dataMin - padding;
  let chartMax = dataMax + padding;

  if (dataMin >= 0 && dataMin < range) chartMin = 0;
  if (dataMax <= 0 && Math.abs(dataMax) < range) chartMax = 0;
  
  range = chartMax - chartMin;
  
  const targetSteps = 4;
  const roughStep = range / targetSteps;

  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep;
  if (residual > 5) niceStep = 10 * magnitude;
  else if (residual > 2) niceStep = 5 * magnitude;
  else if (residual > 1) niceStep = 2 * magnitude;
  else niceStep = magnitude;

  const finalMin = Math.floor(chartMin / niceStep) * niceStep;
  const finalMax = Math.ceil(chartMax / niceStep) * niceStep;
  const finalRange = finalMax - finalMin;

  return { chartMin: finalMin, chartMax: finalMax, chartRange: finalRange, step: niceStep };
};
