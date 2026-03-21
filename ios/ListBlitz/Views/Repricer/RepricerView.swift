import SwiftUI

struct RepricerView: View {
    @State private var suggestions: [RepriceSuggestion] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var selectedAction: String? = nil

    private let api = APIClient.shared

    var body: some View {
        VStack(spacing: 0) {
            // Action Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(title: "All", isSelected: selectedAction == nil) {
                        selectedAction = nil
                    }
                    ForEach(["drop", "raise", "hold", "relist"], id: \.self) { action in
                        FilterChip(
                            title: action.capitalized,
                            isSelected: selectedAction == action,
                            count: suggestions.filter { $0.action == action }.count
                        ) {
                            selectedAction = action
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }

            if isLoading {
                LoadingView(message: "Analyzing prices with AI...")
            } else if let error {
                ErrorView(error: error) { await loadSuggestions() }
            } else if filteredSuggestions.isEmpty {
                EmptyStateView(
                    icon: "dollarsign.arrow.trianglehead.counterclockwise.rotate.90",
                    title: "No Suggestions",
                    message: "Add active listings to get AI repricing suggestions"
                )
            } else {
                ScrollView {
                    // Summary Stats
                    summaryStats
                        .padding(.horizontal)
                        .padding(.top, 8)

                    LazyVStack(spacing: 10) {
                        ForEach(filteredSuggestions, id: \.stableId) { suggestion in
                            RepriceSuggestionCard(suggestion: suggestion)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 100)
                }
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Smart Repricer")
        .refreshable { await loadSuggestions() }
        .task { await loadSuggestions() }
    }

    // MARK: - Summary Stats

    private var summaryStats: some View {
        HStack(spacing: 12) {
            MiniStat(
                label: "Drop",
                value: suggestions.filter { $0.action == "drop" }.count,
                color: Theme.error
            )
            MiniStat(
                label: "Raise",
                value: suggestions.filter { $0.action == "raise" }.count,
                color: Theme.success
            )
            MiniStat(
                label: "Hold",
                value: suggestions.filter { $0.action == "hold" }.count,
                color: Theme.info
            )
            MiniStat(
                label: "Relist",
                value: suggestions.filter { $0.action == "relist" }.count,
                color: Theme.warning
            )
        }
    }

    private var filteredSuggestions: [RepriceSuggestion] {
        guard let action = selectedAction else { return suggestions }
        return suggestions.filter { $0.action == action }
    }

    private func loadSuggestions() async {
        isLoading = suggestions.isEmpty
        do {
            let response: RepricingResponse = try await api.get("/api/repricing", skipCache: true)
            suggestions = response.suggestions
            error = nil
        } catch {
            self.error = error
        }
        isLoading = false
    }
}

// MARK: - Mini Stat

struct MiniStat: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(color)
                .contentTransition(.numericText())
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

// MARK: - Reprice Suggestion Card

struct RepriceSuggestionCard: View {
    let suggestion: RepriceSuggestion

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack {
                Image(systemName: suggestion.actionEmoji)
                    .foregroundStyle(actionColor)
                    .font(.title3)

                VStack(alignment: .leading, spacing: 1) {
                    Text(suggestion.title ?? "Untitled")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        if let days = suggestion.daysListed {
                            Text("\(days)d listed")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }
                        if let views = suggestion.views {
                            Text("\(views) views")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }
                        if let likes = suggestion.likes {
                            Text("\(likes) likes")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }
                    }
                }

                Spacer()

                // Price Change
                VStack(alignment: .trailing, spacing: 2) {
                    if let current = suggestion.currentPrice {
                        Text("$\(String(format: "%.0f", current))")
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                            .strikethrough()
                    }

                    if let suggested = suggestion.suggestedPrice {
                        Text("$\(String(format: "%.0f", suggested))")
                            .font(.headline.bold())
                            .foregroundStyle(actionColor)
                    }

                    if let pct = suggestion.priceChangePercent {
                        Text("\(pct >= 0 ? "+" : "")\(String(format: "%.0f", pct))%")
                            .font(.caption2.bold())
                            .foregroundStyle(pct >= 0 ? Theme.success : Theme.error)
                    }
                }
            }

            // Reason
            if let reason = suggestion.reason {
                Text(reason)
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(2)
            }

            // Action Badge
            HStack {
                Text(suggestion.action?.uppercased() ?? "")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(actionColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(actionColor.opacity(0.12))
                    .clipShape(Capsule())

                if let platform = suggestion.platform {
                    PlatformBadge(platform: platform, compact: true)
                }

                Spacer()
            }
        }
        .padding(14)
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                .stroke(actionColor.opacity(0.15), lineWidth: 1)
        )
    }

    private var actionColor: Color {
        switch suggestion.action?.lowercased() {
        case "drop": Theme.error
        case "raise": Theme.success
        case "hold": Theme.info
        case "relist": Theme.warning
        default: Theme.textTertiary
        }
    }
}
