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
} from "recharts";
import { chartFills } from "@/lib/colors";
import { FadeInUp } from "@/components/motion";

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
    <FadeInUp delay={0.15}>
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
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 8px 24px -4px rgb(0 0 0 / 0.12)",
                background: "var(--color-card)",
                color: "var(--color-card-foreground)",
                padding: "12px 16px",
              }}
              cursor={{ fill: "var(--color-muted)", opacity: 0.3, radius: 8 }}
              animationDuration={200}
              animationEasing="ease-out"
            />
            <Legend />
            <Bar
              dataKey="Listings"
              fill={chartFills.listings}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="Published"
              fill={chartFills.published}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={100}
            />
            <Bar
              dataKey="Views"
              fill={chartFills.views}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={200}
            />
            <Bar
              dataKey="Likes"
              fill={chartFills.likes}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={300}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </FadeInUp>
  );
}
