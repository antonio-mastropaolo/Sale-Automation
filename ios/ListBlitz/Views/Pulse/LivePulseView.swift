import SwiftUI

struct LivePulseView: View {
    @Environment(AppState.self) private var appState
    @State private var salesStats: SalesAggregate?
    @State private var recentSales: [Sale] = []
    @State private var listings: [Listing] = []
    @State private var conversations: [Conversation] = []
    @State private var activities: [ActivityEvent] = []
    @State private var isLoading = true
    @State private var pulseAnimating = true
    @State private var showOfferBlitz = false
    @State private var expandedEventIds: Set<UUID> = []

    private let api = APIClient.shared

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Header with pulsing dot
                headerSection

                // Today's summary cards (horizontal scroll)
                summaryCards

                // Quick Access: Offer Blitz
                offerBlitzBanner

                // Activity Feed
                activityFeed
            }
            .padding(.bottom, 32)
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Pulse")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    SettingsView()
                } label: {
                    Image(systemName: "gearshape")
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .navigationDestination(for: String.self) { dest in
            if dest == "analytics" {
                AnalyticsView()
            } else if dest == "offerblitz" {
                OfferBlitzView()
            } else if dest == "repricer" {
                RepricerView()
            }
        }
        .refreshable { await loadAllData() }
        .task { await loadAllData() }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text("Live Pulse")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.textPrimary)

                    // Pulsing green dot
                    Circle()
                        .fill(Theme.iosGreen)
                        .frame(width: 10, height: 10)
                        .scaleEffect(pulseAnimating ? 1.0 : 0.6)
                        .opacity(pulseAnimating ? 1.0 : 0.4)
                        .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: pulseAnimating)
                        .onAppear { pulseAnimating = true }
                }

                Text("Your real-time activity feed")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }

            Spacer()

            NavigationLink(value: "analytics") {
                Image(systemName: "chart.bar.fill")
                    .font(.body)
                    .foregroundStyle(Theme.accent)
                    .frame(width: 36, height: 36)
                    .background(Theme.accent.opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Summary Cards

    private var summaryCards: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // Revenue card (mint gradient)
                PulseSummaryCard(
                    title: "Revenue",
                    value: "$\(String(format: "%.0f", salesStats?.totalRevenue ?? 0))",
                    subtitle: "Total earned",
                    icon: "dollarsign.circle.fill",
                    gradientColors: [Theme.accent, Theme.accentSoft]
                )

                // Pending Offers card (blue gradient)
                PulseSummaryCard(
                    title: "Pending Offers",
                    value: "\(conversations.filter { $0.unread }.count)",
                    subtitle: "Need response",
                    icon: "hand.raised.fill",
                    gradientColors: [Theme.iosBlue, Theme.iosIndigo]
                )

                // Active Listings card (purple gradient)
                PulseSummaryCard(
                    title: "Active Listings",
                    value: "\(listings.filter { $0.status == .active }.count)",
                    subtitle: "Currently live",
                    icon: "tag.fill",
                    gradientColors: [Theme.iosPurple, Theme.iosPink]
                )
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Offer Blitz Banner

    private var offerBlitzBanner: some View {
        NavigationLink(value: "offerblitz") {
            HStack(spacing: 12) {
                Image(systemName: "bolt.horizontal.fill")
                    .font(.title3)
                    .foregroundStyle(Theme.iosOrange)
                    .symbolEffect(.bounce, options: .repeating.speed(0.3))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Offer Blitz")
                        .font(.subheadline.bold())
                        .foregroundStyle(Theme.textPrimary)
                    Text("Swipe through pending offers")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(Theme.textTertiary)
            }
            .padding(14)
            .background(Theme.backgroundCard)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous)
                    .stroke(Theme.iosOrange.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .padding(.horizontal)
    }

    // MARK: - Activity Feed

    private var activityFeed: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Activity")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal)

            if isLoading {
                ForEach(0..<5, id: \.self) { _ in
                    skeletonActivityRow
                }
            } else if activities.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "clock")
                        .font(.system(size: 36))
                        .foregroundStyle(Theme.textTertiary)

                    Text("No recent activity")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textTertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(activities.enumerated()), id: \.element.id) { index, event in
                        let isExpanded = expandedEventIds.contains(event.id)

                        Button {
                            HapticEngine.medium()
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                if isExpanded {
                                    expandedEventIds.remove(event.id)
                                } else {
                                    expandedEventIds.insert(event.id)
                                }
                            }
                        } label: {
                            VStack(spacing: 0) {
                                // Main row
                                HStack(spacing: 12) {
                                    Image(systemName: event.type.icon)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .frame(width: 32, height: 32)
                                        .background(event.type.color)
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                        .scaleEffect(isExpanded ? 1.15 : 1.0)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(event.title)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(Theme.textPrimary)
                                            .lineLimit(isExpanded ? 3 : 1)

                                        Text(event.description)
                                            .font(.caption)
                                            .foregroundStyle(Theme.textTertiary)
                                            .lineLimit(isExpanded ? 5 : 1)
                                    }

                                    Spacer()

                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(event.timeAgo)
                                            .font(.caption2)
                                            .foregroundStyle(Theme.textTertiary)

                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(Theme.textTertiary)
                                            .rotationEffect(.degrees(isExpanded ? 180 : 0))
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)

                                // Expanded detail panel
                                if isExpanded {
                                    expandedDetail(for: event)
                                        .transition(.asymmetric(
                                            insertion: .push(from: .top).combined(with: .opacity),
                                            removal: .push(from: .bottom).combined(with: .opacity)
                                        ))
                                }
                            }
                            .background(isExpanded ? event.type.color.opacity(0.06) : Color.clear)
                        }
                        .buttonStyle(.plain)

                        if index < activities.count - 1 {
                            Divider()
                                .background(Theme.textTertiary.opacity(0.3))
                                .padding(.leading, 56)
                        }
                    }
                }
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Expanded Detail

    private func expandedDetail(for event: ActivityEvent) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Divider().background(event.type.color.opacity(0.2))

            // Detail grid
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 8) {
                if let platform = event.platform {
                    detailCell(label: "Platform", value: platform.capitalized, color: Theme.platformColor(platform))
                }
                if let price = event.formattedPrice {
                    detailCell(label: "Amount", value: price, color: Theme.accent)
                }
                if let profit = event.formattedProfit {
                    detailCell(label: "Profit", value: profit, color: (event.profit ?? 0) >= 0 ? Theme.success : Theme.error)
                }
                if let buyer = event.buyerName {
                    detailCell(label: "Buyer", value: buyer, color: Theme.iosBlue)
                }
                if let listing = event.listingTitle {
                    detailCell(label: "Item", value: listing, color: Theme.textSecondary)
                }
                if let tracking = event.trackingNumber {
                    detailCell(label: "Tracking", value: tracking, color: Theme.iosPurple)
                }
            }

            // Type badge
            HStack {
                Text(event.type.label)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(event.type.color)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(event.type.color.opacity(0.12))
                    .clipShape(Capsule())

                Spacer()
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 12)
    }

    private func detailCell(label: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(Theme.textTertiary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(color)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Theme.backgroundElevated)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    // MARK: - Skeleton Activity Row

    private var skeletonActivityRow: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Theme.backgroundElevated)
                .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.backgroundElevated)
                    .frame(height: 12)
                    .frame(maxWidth: 150)

                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.backgroundElevated)
                    .frame(height: 10)
                    .frame(maxWidth: 100)
            }

            Spacer()

            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.backgroundElevated)
                .frame(width: 30, height: 10)
        }
        .padding(.horizontal)
        .shimmering()
    }

    // MARK: - Load All Data

    private func loadAllData() async {
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

        async let inboxResult: InboxResponse = {
            do { return try await api.get("/api/inbox") }
            catch { return InboxResponse(conversations: [], unreadCount: nil) }
        }()

        let (s, l, c) = await (salesResult, listingsResult, inboxResult)
        salesStats = s.stats
        recentSales = s.sales.sorted { ($0.soldAt ?? "") > ($1.soldAt ?? "") }
        listings = l
        conversations = c.conversations

        // Build activity feed from real data
        buildActivityFeed()
    }

    // MARK: - Build Activity Feed

    private func buildActivityFeed() {
        var events: [ActivityEvent] = []

        // Sales events — with full detail fields
        for sale in recentSales.prefix(10) {
            events.append(ActivityEvent(
                type: .sale,
                title: "Sold: \(sale.title ?? "Item")",
                description: "\(sale.formattedPrice) on \(sale.platform?.capitalized ?? "Platform")",
                timeAgo: sale.soldAt.flatMap { DateHelper.timeAgo(from: $0) } ?? "",
                platform: sale.platform,
                price: sale.soldPrice,
                profit: sale.profit,
                buyerName: sale.buyerName,
                listingTitle: sale.title
            ))
        }

        // Message events — with detail fields
        for conv in conversations.prefix(5) where conv.unread {
            events.append(ActivityEvent(
                type: .message,
                title: "New message from \(conv.displayName)",
                description: conv.lastMessage ?? "Sent a message",
                timeAgo: conv.timeAgo,
                platform: conv.platform,
                buyerName: conv.displayName,
                listingTitle: conv.listingTitle
            ))
        }

        // Sort by recency (interleave for visual variety)
        activities = events.prefix(15).shuffled()

        // Placeholder if empty
        if activities.isEmpty {
            activities = [
                ActivityEvent(type: .sale, title: "No recent sales", description: "Sales will appear here", timeAgo: ""),
                ActivityEvent(type: .message, title: "No new messages", description: "Messages will appear here", timeAgo: ""),
            ]
        }
    }
}

// MARK: - Pulse Summary Card

struct PulseSummaryCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let gradientColors: [Color]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.9))
                Spacer()
            }

            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .contentTransition(.numericText())

            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.9))
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))
            }
        }
        .frame(width: 160)
        .padding(16)
        .background(
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
    }
}
