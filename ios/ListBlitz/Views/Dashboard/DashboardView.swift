import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @State private var listings: [Listing] = []
    @State private var salesStats: SalesAggregate?
    @State private var recentSales: [Sale] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showSettings = false

    private let api = APIClient.shared

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default: return "Good night"
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Header with time-of-day greeting
                headerSection

                // 2x2 Stat Grid
                if isLoading {
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                        ForEach(0..<4, id: \.self) { _ in SkeletonStatCard() }
                    }
                } else {
                    statsGrid
                }

                // Quick Actions
                quickActions

                // Recent Listings (flush card)
                recentListingsSection

                // Recent Sales
                recentSalesSection
            }
            .padding(.horizontal)
            .padding(.bottom, 32)
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }

                    Button {
                        Task { await appState.logout() }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    userAvatar
                }
            }
        }
        .refreshable { await loadData() }
        .task { await loadData() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greeting + ",")
                .font(.subheadline)
                .foregroundStyle(Theme.textTertiary)
            Text(appState.currentUser?.displayName ?? "Seller")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    // MARK: - Stats Grid

    private var statsGrid: some View {
        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
            DashStatCard(
                title: "Revenue",
                value: "$\(String(format: "%.0f", salesStats?.totalRevenue ?? 0))",
                icon: "dollarsign.circle.fill",
                iconBg: Theme.accent,
                trend: nil
            )

            DashStatCard(
                title: "Active",
                value: "\(listings.filter { $0.status == .active }.count)",
                icon: "tag.fill",
                iconBg: Theme.iosBlue,
                trend: nil
            )

            DashStatCard(
                title: "Sales",
                value: "\(salesStats?.count ?? 0)",
                icon: "cart.fill",
                iconBg: Theme.gold,
                trend: nil
            )

            DashStatCard(
                title: "Avg Profit",
                value: "$\(String(format: "%.0f", salesStats?.avgProfitMargin ?? 0))",
                icon: "chart.line.uptrend.xyaxis",
                iconBg: Theme.success,
                trend: nil
            )
        }
    }

    // MARK: - Quick Actions

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    QuickActionPill(icon: "camera.fill", title: "Smart List", color: Theme.accent) {
                        appState.selectedTab = .listings
                    }
                    QuickActionPill(icon: "plus.circle.fill", title: "New Listing", color: Theme.iosBlue) {
                        appState.selectedTab = .listings
                    }
                    QuickActionPill(icon: "magnifyingglass", title: "Search", color: Theme.iosPurple) {
                        appState.selectedTab = .search
                    }
                    QuickActionPill(icon: "bolt.horizontal.fill", title: "Offer Blitz", color: Theme.iosOrange) {
                        appState.selectedTab = .pulse
                    }
                    QuickActionPill(icon: "dollarsign.arrow.trianglehead.counterclockwise.rotate.90", title: "Reprice", color: Theme.gold) {
                        appState.selectedTab = .listings
                    }
                }
            }
        }
    }

    // MARK: - Recent Listings (flush card style)

    private var recentListingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Listings")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                Button("See All") {
                    HapticEngine.light()
                    appState.selectedTab = .listings
                }
                .font(.caption.bold())
                .foregroundStyle(Theme.accent)
            }

            if isLoading {
                ForEach(0..<3, id: \.self) { _ in SkeletonListingCard() }
            } else if listings.isEmpty {
                EmptyStateView(
                    icon: "tag.slash",
                    title: "No listings yet",
                    message: "Create your first listing to get started"
                )
                .frame(height: 150)
            } else {
                // Flush card with thin separators
                VStack(spacing: 0) {
                    ForEach(Array(listings.prefix(5).enumerated()), id: \.element.id) { index, listing in
                        NavigationLink(value: listing) {
                            FlushListingRow(listing: listing)
                        }
                        .buttonStyle(.plain)

                        if index < min(4, listings.count - 1) {
                            Divider()
                                .background(Theme.textTertiary.opacity(0.3))
                                .padding(.leading, 80)
                        }
                    }
                }
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
            }
        }
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
        }
    }

    // MARK: - Recent Sales

    private var recentSalesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Sales")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            if recentSales.isEmpty && !isLoading {
                Text("No sales recorded yet")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(recentSales.prefix(5).enumerated()), id: \.element.id) { index, sale in
                        DashSaleRow(sale: sale)

                        if index < min(4, recentSales.count - 1) {
                            Divider()
                                .background(Theme.textTertiary.opacity(0.3))
                                .padding(.leading, 52)
                        }
                    }
                }
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
            }
        }
    }

    // MARK: - User Avatar

    private var userAvatar: some View {
        ZStack {
            Circle()
                .fill(Theme.accent.opacity(0.2))
                .frame(width: 34, height: 34)

            Text(appState.currentUser?.initials ?? "?")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.accent)
        }
    }

    // MARK: - Data Loading

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }

        async let listingsResult: [Listing] = {
            do { return try await api.get("/api/listings") }
            catch { return [] }
        }()

        async let salesResult: SalesStats = {
            do { return try await api.get("/api/sales", query: ["stats": "true"]) }
            catch { return SalesStats(sales: [], stats: nil) }
        }()

        let (l, s) = await (listingsResult, salesResult)
        listings = l.sorted { ($0.updatedAt ?? "") > ($1.updatedAt ?? "") }
        salesStats = s.stats
        recentSales = s.sales.sorted { ($0.soldAt ?? "") > ($1.soldAt ?? "") }
    }
}

// MARK: - Dashboard Stat Card

struct DashStatCard: View {
    let title: String
    let value: String
    var icon: String? = nil
    var iconBg: Color = Theme.accent
    var trend: Double? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(iconBg)
                        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                }

                Spacer()

                if let trend {
                    TrendIndicator(value: trend)
                }
            }

            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textPrimary)
                .contentTransition(.numericText())

            Text(title)
                .font(.caption)
                .foregroundStyle(Theme.textTertiary)
        }
        .cardStyle()
    }
}

// MARK: - Quick Action Pill

struct QuickActionPill: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: {
            HapticEngine.light()
            action()
        }) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption.bold())
                    .foregroundStyle(color)

                Text(title)
                    .font(.caption.bold())
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(.white.opacity(0.06), lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Flush Listing Row

struct FlushListingRow: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 12) {
            AsyncListingImage(path: listing.primaryImagePath)
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(listing.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let brand = listing.brand, !brand.isEmpty {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    if let size = listing.size, !size.isEmpty {
                        Text("·")
                            .foregroundStyle(Theme.textTertiary)
                        Text(size)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                HStack(spacing: 6) {
                    StatusBadge(status: listing.status.rawValue)

                    if let platforms = listing.platformListings, !platforms.isEmpty {
                        ForEach(platforms.prefix(2), id: \.id) { pl in
                            PlatformBadge(platform: pl.platform, compact: true)
                        }
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(listing.formattedPrice)
                    .font(.system(.body, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.accent)

                if let profit = listing.profit {
                    Text(profit >= 0 ? "+$\(String(format: "%.0f", profit))" : "-$\(String(format: "%.0f", abs(profit)))")
                        .font(.caption2.bold())
                        .foregroundStyle(profit >= 0 ? Theme.success : Theme.error)
                }
            }
        }
        .padding(12)
    }
}

// MARK: - Dashboard Sale Row

struct DashSaleRow: View {
    let sale: Sale

    var body: some View {
        HStack(spacing: 12) {
            if let platform = sale.platform {
                PlatformIcon(platform: platform, size: 36)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(sale.title ?? "Untitled")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let platform = sale.platform {
                        Text(platform.capitalized)
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                    }
                    if let date = sale.soldAt {
                        Text("·")
                            .foregroundStyle(Theme.textTertiary)
                        Text(DateHelper.timeAgo(from: date))
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(sale.formattedPrice)
                    .font(.subheadline.bold())
                    .foregroundStyle(Theme.textPrimary)

                Text(sale.formattedProfit)
                    .font(.caption.bold())
                    .foregroundStyle((sale.profit ?? 0) >= 0 ? Theme.success : Theme.error)
            }
        }
        .padding(12)
    }
}
