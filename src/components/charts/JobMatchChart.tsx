import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Job {
  job_title: string;
  match_percentage: number;
}

interface JobMatchChartProps {
  jobs: Job[];
}

export const JobMatchChart: React.FC<JobMatchChartProps> = ({ jobs }) => {
  const data = jobs.slice(0, 5).map((job) => ({
    name: job.job_title.length > 20 ? job.job_title.substring(0, 20) + '...' : job.job_title,
    fullName: job.job_title,
    match: job.match_percentage || 0,
  }));

  const getBarColor = (match: number) => {
    if (match >= 80) return 'hsl(var(--success))';
    if (match >= 60) return 'hsl(var(--primary))';
    if (match >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{payload[0].payload.fullName}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value}% match</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No job recommendations yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <XAxis 
          type="number" 
          domain={[0, 100]} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={120}
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
        <Bar dataKey="match" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.match)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default JobMatchChart;
