import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    var icon: String? = nil
    var trend: Double? = nil
    var color: Color = Theme.accent

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption)
                        .foregroundStyle(color)
                }
                Text(title)
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)

                Spacer()

                if let trend {
                    TrendIndicator(value: trend)
                }
            }

            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textPrimary)
                .contentTransition(.numericText())

            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .cardStyle()
    }
}

struct TrendIndicator: View {
    let value: Double

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: value >= 0 ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 9, weight: .bold))
            Text("\(String(format: "%.0f", abs(value)))%")
                .font(.system(size: 10, weight: .bold, design: .rounded))
        }
        .foregroundStyle(value >= 0 ? Theme.success : Theme.error)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background((value >= 0 ? Theme.success : Theme.error).opacity(0.12))
        .clipShape(Capsule())
    }
}

#Preview {
    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
        StatCard(title: "Revenue", value: "$12,450", icon: "dollarsign.circle", trend: 12.5)
        StatCard(title: "Active Listings", value: "48", icon: "tag.fill", color: .blue)
        StatCard(title: "Sales", value: "23", subtitle: "This month", icon: "cart.fill")
        StatCard(title: "Avg Profit", value: "$34", icon: "chart.line.uptrend.xyaxis", trend: -5.2)
    }
    .padding()
    .background(Theme.backgroundPrimary)
}
