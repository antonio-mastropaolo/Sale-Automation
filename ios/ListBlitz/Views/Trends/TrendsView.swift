import SwiftUI

struct TrendsView: View {
    @State private var trendData: TrendResponse?
    @State private var isLoading = true
    @State private var useMockData = false

    private let api = APIClient.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    skeletonContent
                } else {
                    LazyVStack(spacing: 20) {
                        marketPulseSection
                        trendingCategoriesSection
                        hotItemsSection
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 32)
                }
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Trends")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await loadTrends() }
            .task { await loadTrends() }
        }
    }

    // MARK: - Market Pulse

    private var marketPulseSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Market Pulse")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            HStack(spacing: 14) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(Theme.accent)
                    .frame(width: 48, height: 48)
                    .background(Theme.accent.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Trending Now")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)

                    Text(trendData?.summary ?? mockTrendData.summary)
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(3)
                }
            }
            .cardStyle()
        }
    }

    // MARK: - Trending Categories

    private var trendingCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Trending Categories")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            let categories = trendData?.categories ?? mockTrendData.categories
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 10) {
                ForEach(categories) { category in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "flame.fill")
                                .font(.caption)
                                .foregroundStyle(heatColor(category.heat))

                            Text(category.name)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Theme.textPrimary)
                                .lineLimit(1)
                        }

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Theme.backgroundElevated)
                                    .frame(height: 6)

                                RoundedRectangle(cornerRadius: 3)
                                    .fill(heatColor(category.heat))
                                    .frame(width: geo.size.width * CGFloat(category.heat) / 100, height: 6)
                            }
                        }
                        .frame(height: 6)

                        Text("\(category.heat)% heat")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.textTertiary)
                    }
                    .cardStyle()
                }
            }
        }
    }

    // MARK: - Hot Items

    private var hotItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Hot Items")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            let items = trendData?.hotItems ?? mockTrendData.hotItems
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    HStack(spacing: 12) {
                        Text("#\(index + 1)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.accent)
                            .frame(width: 28)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.textPrimary)
                                .lineLimit(1)

                            if let category = item.category {
                                Text(category)
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                            }
                        }

                        Spacer()

                        Text(item.formattedPrice)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(Theme.textPrimary)

                        directionBadge(item.direction)
                    }
                    .padding(12)

                    if index < items.count - 1 {
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

    // MARK: - Skeleton

    private var skeletonContent: some View {
        LazyVStack(spacing: 20) {
            // Pulse skeleton
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: Theme.radiusMedium)
                    .fill(Theme.backgroundElevated)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.backgroundElevated)
                        .frame(height: 14)
                        .frame(maxWidth: 120)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.backgroundElevated)
                        .frame(height: 10)
                }
            }
            .cardStyle()

            // Categories skeleton
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 10) {
                ForEach(0..<4, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Theme.backgroundElevated)
                            .frame(height: 12)
                            .frame(maxWidth: 100)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.backgroundElevated)
                            .frame(height: 6)
                    }
                    .cardStyle()
                }
            }

            // Hot items skeleton
            VStack(spacing: 0) {
                ForEach(0..<5, id: \.self) { _ in
                    SkeletonListingCard()
                }
            }
        }
        .padding(.horizontal)
        .shimmering()
    }

    // MARK: - Helpers

    private func heatColor(_ heat: Int) -> Color {
        switch heat {
        case 80...: Theme.iosRed
        case 60..<80: Theme.iosOrange
        case 40..<60: Theme.gold
        default: Theme.iosGreen
        }
    }

    @ViewBuilder
    private func directionBadge(_ direction: String) -> some View {
        let isUp = direction == "up"
        HStack(spacing: 2) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 9, weight: .bold))
            Text(isUp ? "Up" : "Down")
                .font(.system(size: 10, weight: .bold))
        }
        .foregroundStyle(isUp ? Theme.success : Theme.error)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background((isUp ? Theme.success : Theme.error).opacity(0.12))
        .clipShape(Capsule())
    }

    // MARK: - Data Loading

    private func loadTrends() async {
        isLoading = trendData == nil
        do {
            let response: TrendResponse = try await api.post("/api/ai/trends", body: EmptyBody())
            trendData = response
            useMockData = false
        } catch {
            trendData = mockTrendData
            useMockData = true
        }
        isLoading = false
    }

    // MARK: - Mock Data

    private var mockTrendData: TrendResponse {
        TrendResponse(
            summary: "Vintage sportswear and Y2K fashion are surging. Archive fashion pieces seeing 40% price increases. Gorpcore demand remains strong heading into spring.",
            categories: [
                TrendCategory(id: "1", name: "Vintage Sportswear", heat: 92),
                TrendCategory(id: "2", name: "Y2K Fashion", heat: 85),
                TrendCategory(id: "3", name: "Gorpcore", heat: 78),
                TrendCategory(id: "4", name: "Archive Fashion", heat: 71),
                TrendCategory(id: "5", name: "Workwear", heat: 63)
            ],
            hotItems: [
                TrendHotItem(id: "1", name: "Nike ACG Storm-FIT Jacket", price: 185, direction: "up", category: "Gorpcore"),
                TrendHotItem(id: "2", name: "Vintage Champion Reverse Weave", price: 95, direction: "up", category: "Vintage Sportswear"),
                TrendHotItem(id: "3", name: "Carhartt WIP Detroit Jacket", price: 145, direction: "up", category: "Workwear"),
                TrendHotItem(id: "4", name: "Y2K Ed Hardy Tee", price: 65, direction: "down", category: "Y2K Fashion"),
                TrendHotItem(id: "5", name: "Raf Simons Archive Sweater", price: 320, direction: "up", category: "Archive Fashion")
            ]
        )
    }
}

// MARK: - Models

private struct TrendResponse: Codable {
    let summary: String
    let categories: [TrendCategory]
    let hotItems: [TrendHotItem]
}

private struct TrendCategory: Codable, Identifiable {
    let id: String
    let name: String
    let heat: Int
}

private struct TrendHotItem: Codable, Identifiable {
    let id: String
    let name: String
    let price: Double
    let direction: String
    var category: String?

    var formattedPrice: String {
        "$\(String(format: "%.0f", price))"
    }
}

#Preview {
    TrendsView()
}
