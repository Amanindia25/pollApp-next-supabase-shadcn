"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

const LEGEND_COLORS = ['#000000', '#333333', '#666666', '#999999', '#cccccc'];

interface PollChartProps {
  options: Array<{ text: string; votes: number }>;
  chartType?: 'bar' | 'pie';
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'];

export function PollChart({ options, chartType = 'bar' }: PollChartProps) {
  const [selectedChart, setSelectedChart] = useState<'bar' | 'pie'>(chartType);
  
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  
  const data = options.map(option => ({
    name: option.text.length > 20 ? option.text.substring(0, 20) + '...' : option.text,
    fullName: option.text,
    votes: option.votes,
    percentage: totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Poll Results</CardTitle>
        <CardDescription>
          Total votes: {totalVotes}
        </CardDescription>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedChart('bar')}
            className={`px-3 py-1 rounded text-sm ${
              selectedChart === 'bar' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setSelectedChart('pie')}
            className={`px-3 py-1 rounded text-sm ${
              selectedChart === 'pie' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Pie Chart
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {selectedChart === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [`${value} votes`, 'Votes']}
                  labelFormatter={(label) => data.find(d => d.name === label)?.fullName || label}
                />
                <Bar dataKey="votes" fill="#3b82f6" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="votes"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} votes`, 'Votes']}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: index % 2 === 0 ? '#000000' : '#333333' }}
                />
                <span className="text-black">{item.fullName}</span>
              </div>
              <span className="font-medium text-black">{item.votes} ({item.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}