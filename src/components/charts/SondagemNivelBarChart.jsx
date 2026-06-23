import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const ROW_HEIGHT = 40;
const MIN_HEIGHT = 120;
const Y_AXIS_WIDTH = 220;
const LABEL_MAX_CHARS = 30;

/** Quebra rótulos longos em até 3 linhas para o eixo Y. */
function wrapNivelLabel(text, maxChars = LABEL_MAX_CHARS) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function sondagemNivelChartHeight(rowCount, labels = []) {
  const count = Math.max(rowCount, 1);
  const maxLines = Math.max(1, ...labels.map((l) => wrapNivelLabel(l).length));
  const rowH = ROW_HEIGHT + (maxLines - 1) * 14;
  return Math.max(MIN_HEIGHT, count * rowH + 60);
}

function NivelYAxisTick({ x, y, payload }) {
  const lines = wrapNivelLabel(payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="#444" fontSize={10} dominantBaseline="middle">
        {lines.map((ln, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 13}>
            {ln}
          </tspan>
        ))}
      </text>
    </g>
  );
}

const SondagemNivelBarChart = ({
  data,
  color = '#3498DB',
  name = 'Alunos',
  tooltipContent,
}) => {
  if (!data?.length) return null;

  const labels = data.map((d) => d.name);
  const height = sondagemNivelChartHeight(data.length, labels);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 24, top: 16, bottom: 16 }}
        barCategoryGap={12}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={Y_AXIS_WIDTH}
          interval={0}
          tick={<NivelYAxisTick />}
        />
        <Tooltip content={tooltipContent} />
        <Bar
          dataKey="value"
          name={name}
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SondagemNivelBarChart;
