import SwiftUI

struct AnalyticsView: View {
    @State private var salesStats: SalesAggregate?
    @State private var recentSales: [Sale] = []
    @State private var listings: [Listing] = []
    @State private var isLoading = true
    @State private var selectedPeriod: Period = .month

    private let api = APIClient.shared

    enum Period: String, CaseIterable {
        case week = "7D"
        case month = "30D"
        case quarter = "90D"
        case all = "All"
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Period Selector
                Picker("Period", selection: $selectedPeriod) {
                    ForEach(Period.allCases, id: \.self) { period in
                        Text(period.rawValue).tag(period)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Key Metrics
                if isLoading {
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                        ForEach(0..<4, id: \.self) { _ in SkeletonStatCard() }
                    }
                    .padding(.horizontal)
                } else {
                    metricsGrid
                }

                // Revenue Chart Placeholder
                revenueSection

                // Platform Breakdown
                platformBreakdown

                // Top Sellers
                topSellersSection

                // Inventory Summary
                inventorySection
            }
            .padding(.bottom, 32)
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Analytics")
        .refreshable { await loadData() }
        .task { await loadData() }
    }

    // MARK: - Metrics Grid

    private var metricsGrid: some View {
        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
            DashStatCard(
                title: "Total Revenue",
                value: "$\(String(format: "%.0f", salesStats?.totalRevenue ?? 0))",
                icon: "dollarsign.circle.fill",
                iconBg: Theme.accent
            )

            DashStatCard(
                title: "Net Profit",
                value: "$\(String(format: "%.0f", salesStats?.totalProfit ?? 0))",
                icon: "chart.line.uptrend.xyaxis",
                iconBg: Theme.success
            )

            DashStatCard(
                title: "Items Sold",
                value: "\(salesStats?.count ?? 0)",
                icon: "cart.fill",
                iconBg: Theme.gold
            )

            DashStatCard(
                title: "Avg Sale Price",
                value: "$\(String(format: "%.0f", salesStats?.avgProfitMargin ?? 0))",
                icon: "tag.fill",
                iconBg: Theme.iosBlue
            )
        }
        .padding(.horizontal)
    }

    // MARK: - Revenue Section

    private var revenueSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Revenue Trend")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
                .padding(.horizontal)

            if recentSales.isEmpty {
                Text("No sales data yet")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else {
                MiniBarChart(sales: recentSales)
                    .frame(height: 140)
                    .padding(.horizontal)
            }
        }
        .cardStyle()
        .padding(.horizontal)
    }

    // MARK: - Platform Breakdown

    private var platformBreakdown: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sales by Platform")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            let grouped = Dictionary(grouping: recentSales) { $0.platform ?? "Unknown" }
            let sorted = grouped.sorted { ($0.value.count) > ($1.value.count) }

            if sorted.isEmpty {
                Text("No platform data")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(sorted.enumerated()), id: \.element.key) { index, item in
                        let (platform, sales) = item
                        HStack(spacing: 12) {
                            PlatformIcon(platform: platform, size: 32)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(platform.capitalized)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(Theme.textPrimary)
                                Text("\(sales.count) sales")
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                            }

                            Spacer()

                            let revenue = sales.compactMap(\.soldPrice).reduce(0, +)
                            Text("$\(String(format: "%.0f", revenue))")
                                .font(.subheadline.bold())
                                .foregroundStyle(Theme.accent)
                        }
                        .padding(.vertical, 8)

                        if index < sorted.count - 1 {
                            Divider()
                                .background(Theme.textTertiary.opacity(0.3))
                                .padding(.leading, 44)
                        }
                    }
                }
            }
        }
        .cardStyle()
        .padding(.horizontal)
    }

    // MARK: - Top Sellers

    private var topSellersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top Sellers")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            let topSales = recentSales
                .sorted { ($0.soldPrice ?? 0) > ($1.soldPrice ?? 0) }
                .prefix(5)

            if topSales.isEmpty {
                Text("No sales yet")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ForEach(Array(topSales)) { sale in
                    DashSaleRow(sale: sale)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Inventory

    private var inventorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Inventory Summary")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            let draft = listings.filter { $0.status == .draft }.count
            let active = listings.filter { $0.status == .active }.count
            let sold = listings.filter { $0.status == .sold }.count
            let total = listings.count

            HStack(spacing: 16) {
                InventoryMetric(label: "Total", value: "\(total)", color: Theme.textSecondary)
                InventoryMetric(label: "Draft", value: "\(draft)", color: Theme.iosYellow)
                InventoryMetric(label: "Active", value: "\(active)", color: Theme.iosGreen)
                InventoryMetric(label: "Sold", value: "\(sold)", color: Theme.iosTeal)
            }

            // Progress bar
            if total > 0 {
                GeometryReader { geo in
                    HStack(spacing: 2) {
                        if draft > 0 {
                            Rectangle()
                                .fill(Theme.iosYellow)
                                .frame(width: geo.size.width * CGFloat(draft) / CGFloat(total))
                        }
                        if active > 0 {
                            Rectangle()
                                .fill(Theme.iosGreen)
                                .frame(width: geo.size.width * CGFloat(active) / CGFloat(total))
                        }
                        if sold > 0 {
                            Rectangle()
                                .fill(Theme.iosTeal)
                                .frame(width: geo.size.width * CGFloat(sold) / CGFloat(total))
                        }
                    }
                    .clipShape(Capsule())
                }
                .frame(height: 8)
            }
        }
        .cardStyle()
        .padding(.horizontal)
    }

    // MARK: - Load Data

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }

        async let salesResult: SalesStats = {
            do { return try await api.get("/api/sales", query: ["stats": "true"], skipCache: true) }
            catch { return SalesStats(sales: [], stats: nil) }
        }()

        async let listingsResult: [Listing] = {
            do { return try await api.get("/api/listings") }
            catch { return [] }
        }()

        let (s, l) = await (salesResult, listingsResult)
        salesStats = s.stats
        recentSales = s.sales
        listings = l
    }
}

// MARK: - Inventory Metric

struct InventoryMetric: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(color)
                .contentTransition(.numericText())
            Text(label)
                .font(.caption2)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Mini Bar Chart

struct MiniBarChart: View {
    let sales: [Sale]

    var body: some View {
        let grouped = groupSalesByDay()
        let maxValue = grouped.map(\.value).max() ?? 1

        HStack(alignment: .bottom, spacing: 4) {
            ForEach(grouped, id: \.label) { item in
                VStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Theme.accent.gradient)
                        .frame(height: max(4, CGFloat(item.value / maxValue) * 100))

                    Text(item.label)
                        .font(.system(size: 8))
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
        .padding(.vertical, 8)
    }

    private func groupSalesByDay() -> [(label: String, value: Double)] {
        let calendar = Calendar.current
        let now = Date()
        var result: [(label: String, value: Double)] = []

        for daysAgo in stride(from: 6, through: 0, by: -1) {
            guard let date = calendar.date(byAdding: .day, value: -daysAgo, to: now) else { continue }
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEE"
            let label = dayFormatter.string(from: date)

            let daySales = sales.filter { sale in
                guard let soldAt = sale.soldAt, let saleDate = DateHelper.parse(soldAt) else { return false }
                return calendar.isDate(saleDate, inSameDayAs: date)
            }
            let revenue = daySales.compactMap(\.soldPrice).reduce(0, +)
            result.append((label: label, value: revenue))
        }

        return result
    }
}
