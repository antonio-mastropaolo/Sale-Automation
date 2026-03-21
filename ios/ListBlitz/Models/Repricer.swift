import Foundation

struct RepriceSuggestion: Codable, Identifiable, Sendable {
    let id: String?
    let title: String?
    let currentPrice: Double?
    let suggestedPrice: Double?
    let action: String?
    let reason: String?
    let daysListed: Int?
    let platform: String?
    let views: Int?
    let likes: Int?
    let brand: String?
    let urgency: String?
    let image: String?

    var stableId: String { id ?? "unknown" }

    var priceChange: Double? {
        guard let current = currentPrice, let suggested = suggestedPrice else { return nil }
        return suggested - current
    }

    var priceChangePercent: Double? {
        guard let current = currentPrice, let change = priceChange, current > 0 else { return nil }
        return (change / current) * 100
    }

    var actionEmoji: String {
        switch action?.lowercased() {
        case "drop": "arrow.down.circle.fill"
        case "raise": "arrow.up.circle.fill"
        case "hold": "pause.circle.fill"
        case "relist": "arrow.clockwise.circle.fill"
        default: "questionmark.circle.fill"
        }
    }
}

struct RepricingResponse: Codable, Sendable {
    let suggestions: [RepriceSuggestion]
    let stats: RepricingStats?
}

struct RepricingStats: Codable, Sendable {
    let total: Int?
    let needsAction: Int?
    let highUrgency: Int?
    let avgDaysListed: Int?
    let potentialRevenue: Double?
}
