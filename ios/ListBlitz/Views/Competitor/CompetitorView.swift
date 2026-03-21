import SwiftUI

struct CompetitorView: View {
    @State private var brand = ""
    @State private var category = ""
    @State private var isAnalyzing = false
    @State private var results: CompetitorResult?
    @State private var error: Error?
    @State private var useMockData = false

    private let api = APIClient.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 20) {
                    searchForm

                    if isAnalyzing {
                        analysisLoadingView
                    } else if let results {
                        resultsSection(results)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Competitor Analysis")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Search Form

    private var searchForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Analyze Market")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    Image(systemName: "building.2.fill")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 20)

                    TextField("Brand (e.g. Nike, Carhartt)", text: $brand)
                        .textFieldStyle(.plain)
                        .foregroundStyle(Theme.textPrimary)
                        .font(.subheadline)
                }
                .padding(12)
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))

                HStack(spacing: 10) {
                    Image(systemName: "tag.fill")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 20)

                    TextField("Category (e.g. Jackets, Sneakers)", text: $category)
                        .textFieldStyle(.plain)
                        .foregroundStyle(Theme.textPrimary)
                        .font(.subheadline)
                }
                .padding(12)
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
            }

            Button {
                HapticEngine.medium()
                Task { await analyze() }
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                    Text("Analyze")
                        .fontWeight(.semibold)
                }
                .font(.subheadline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    canAnalyze
                        ? Theme.accentGradient
                        : LinearGradient(colors: [Theme.backgroundElevated, Theme.backgroundElevated], startPoint: .leading, endPoint: .trailing)
                )
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
            }
            .disabled(!canAnalyze || isAnalyzing)
        }
    }

    private var canAnalyze: Bool {
        !brand.trimmingCharacters(in: .whitespaces).isEmpty || !category.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Loading

    private var analysisLoadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .controlSize(.large)
                .tint(Theme.accent)

            Text("AI is analyzing the market...")
                .font(.subheadline)
                .foregroundStyle(Theme.textTertiary)

            Text("This may take a moment")
                .font(.caption)
                .foregroundStyle(Theme.textTertiary.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }

    // MARK: - Results

    @ViewBuilder
    private func resultsSection(_ result: CompetitorResult) -> some View {
        if useMockData {
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill")
                    .font(.caption)
                    .foregroundStyle(Theme.iosBlue)
                Text("Showing sample data. Connect to server for live analysis.")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }
            .padding(10)
            .background(Theme.iosBlue.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
        }

        // Price Range Card
        VStack(alignment: .leading, spacing: 12) {
            Label("Price Range", systemImage: "dollarsign.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)

            HStack(spacing: 0) {
                priceColumn(label: "Low", value: result.priceRange.low, color: Theme.iosGreen)
                priceColumn(label: "Average", value: result.priceRange.average, color: Theme.accent)
                priceColumn(label: "High", value: result.priceRange.high, color: Theme.iosOrange)
            }

            // Price bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.backgroundElevated)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.accentGradient)
                        .frame(width: geo.size.width * priceBarWidth(result.priceRange), height: 8)
                        .offset(x: geo.size.width * priceBarOffset(result.priceRange))
                }
            }
            .frame(height: 8)
        }
        .cardStyle()

        // Market Saturation
        VStack(alignment: .leading, spacing: 12) {
            Label("Market Saturation", systemImage: "chart.bar.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)

            HStack {
                Text(result.saturation.level.capitalized)
                    .font(.title3.bold())
                    .foregroundStyle(saturationColor(result.saturation.level))

                Spacer()

                Text("\(result.saturation.competitorCount) competitors")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.backgroundElevated)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(saturationColor(result.saturation.level))
                        .frame(width: geo.size.width * CGFloat(result.saturation.score) / 100, height: 8)
                }
            }
            .frame(height: 8)

            if let tip = result.saturation.tip {
                Text(tip)
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .cardStyle()

        // Recommended Pricing
        VStack(alignment: .leading, spacing: 12) {
            Label("Recommended Pricing", systemImage: "sparkles")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Quick Sale")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text("$\(String(format: "%.0f", result.recommended.quickSale))")
                        .font(.title2.bold())
                        .foregroundStyle(Theme.iosGreen)
                }

                Spacer()

                VStack(spacing: 4) {
                    Text("Sweet Spot")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text("$\(String(format: "%.0f", result.recommended.sweetSpot))")
                        .font(.title2.bold())
                        .foregroundStyle(Theme.accent)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Premium")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text("$\(String(format: "%.0f", result.recommended.premium))")
                        .font(.title2.bold())
                        .foregroundStyle(Theme.gold)
                }
            }
        }
        .cardStyle()

        // Keywords
        VStack(alignment: .leading, spacing: 12) {
            Label("Top Keywords", systemImage: "text.magnifyingglass")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)

            FlowLayout(spacing: 8) {
                ForEach(result.keywords, id: \.self) { keyword in
                    Text(keyword)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Theme.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Theme.accent.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Helpers

    private func priceColumn(label: String, value: Double, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(Theme.textTertiary)
            Text("$\(String(format: "%.0f", value))")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
    }

    private func priceBarWidth(_ range: CompetitorPriceRange) -> CGFloat {
        guard range.high > 0 else { return 0 }
        return CGFloat(range.average / range.high)
    }

    private func priceBarOffset(_ range: CompetitorPriceRange) -> CGFloat {
        guard range.high > 0 else { return 0 }
        return CGFloat(range.low / range.high) * 0.5
    }

    private func saturationColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "low": Theme.iosGreen
        case "medium": Theme.iosOrange
        case "high": Theme.iosRed
        default: Theme.textTertiary
        }
    }

    // MARK: - Data

    private func analyze() async {
        isAnalyzing = true
        results = nil

        let body = CompetitorRequest(
            brand: brand.trimmingCharacters(in: .whitespaces),
            category: category.trimmingCharacters(in: .whitespaces)
        )

        do {
            let response: CompetitorResult = try await api.post("/api/ai/competitor", body: body)
            results = response
            useMockData = false
            HapticEngine.success()
        } catch {
            results = mockCompetitorResult
            useMockData = true
            self.error = error
        }
        isAnalyzing = false
    }

    private var mockCompetitorResult: CompetitorResult {
        CompetitorResult(
            priceRange: CompetitorPriceRange(low: 45, average: 120, high: 285),
            saturation: CompetitorSaturation(
                level: "medium",
                score: 62,
                competitorCount: 47,
                tip: "Market has moderate competition. Differentiate with better photos and descriptions."
            ),
            recommended: CompetitorRecommended(quickSale: 75, sweetSpot: 115, premium: 195),
            keywords: ["vintage", "authentic", "deadstock", "rare", "limited edition", "y2k", "archive", "grail", "og colorway", "streetwear"]
        )
    }
}

// MARK: - Models

private struct CompetitorRequest: Encodable {
    let brand: String
    let category: String
}

private struct CompetitorResult: Codable {
    let priceRange: CompetitorPriceRange
    let saturation: CompetitorSaturation
    let recommended: CompetitorRecommended
    let keywords: [String]
}

private struct CompetitorPriceRange: Codable {
    let low: Double
    let average: Double
    let high: Double
}

private struct CompetitorSaturation: Codable {
    let level: String
    let score: Int
    let competitorCount: Int
    var tip: String?
}

private struct CompetitorRecommended: Codable {
    let quickSale: Double
    let sweetSpot: Double
    let premium: Double
}

#Preview {
    CompetitorView()
}
