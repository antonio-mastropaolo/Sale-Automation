"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { chartFills } from "@/lib/colors";

interface PlatformStat {
  platform: string;
  listings: number;
  published: number;
  views: number;
  likes: number;
  sales: number;
  revenue: number;
}

export function AnalyticsChart({ data }: { data: PlatformStat[] }) {
  const chartData = data.map((d) => ({
    name: d.platform.charAt(0).toUpperCase() + d.platform.slice(1),
    Listings: d.listings,
    Published: d.published,
    Views: d.views,
    Likes: d.likes,
  }));

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              background: "var(--color-card)",
              color: "var(--color-card-foreground)",
            }}
          />
          <Legend />
          <Bar dataKey="Listings" fill={chartFills.listings} radius={[6, 6, 0, 0]} />
          <Bar dataKey="Published" fill={chartFills.published} radius={[6, 6, 0, 0]} />
          <Bar dataKey="Views" fill={chartFills.views} radius={[6, 6, 0, 0]} />
          <Bar dataKey="Likes" fill={chartFills.likes} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
