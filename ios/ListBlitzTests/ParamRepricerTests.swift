import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED REPRICER TESTS
// Generates ~600 test cases
// Screenshot mapping: SCR-08 Repricer cards — price change display,
//   percentage badge, action icon, urgency badge
// ═══════════════════════════════════════════════════════════════

@Suite("Repricer — Parameterized")
struct ParamRepricerTests {

    // SCR-08: Price change calculation
    @Test("Price change calc", arguments: TestData.repricerPairs)
    func priceChange(pair: (Double, Double)) {
        let (current, suggested) = pair
        let suggestion = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: current, suggestedPrice: suggested,
            action: "drop", reason: nil, daysListed: nil, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        let change = suggestion.priceChange
        #expect(change != nil)
        if let c = change {
            let expected = suggested - current
            #expect(abs(c - expected) < 0.01)
        }
    }

    // SCR-08: Price change percentage
    @Test("Price change percent", arguments: TestData.repricerPairs)
    func priceChangePercent(pair: (Double, Double)) {
        let (current, suggested) = pair
        guard current > 0 else { return }
        let suggestion = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: current, suggestedPrice: suggested,
            action: "drop", reason: nil, daysListed: nil, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        let pct = suggestion.priceChangePercent
        #expect(pct != nil)
    }

    // SCR-08: Action icon mapping
    @Test("Action emoji mapping", arguments: ["drop", "raise", "hold", "relist", "unknown", nil] as [String?])
    func actionEmoji(action: String?) {
        let suggestion = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: 100, suggestedPrice: 90,
            action: action, reason: nil, daysListed: nil, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        let emoji = suggestion.actionEmoji
        #expect(!emoji.isEmpty)
        if action == "drop" { #expect(emoji == "arrow.down.circle.fill") }
        if action == "raise" { #expect(emoji == "arrow.up.circle.fill") }
        if action == "hold" { #expect(emoji == "pause.circle.fill") }
        if action == "relist" { #expect(emoji == "arrow.clockwise.circle.fill") }
    }

    // SCR-08: Repricer × Platform combinations
    @Test("Repricer per platform", arguments: TestData.platforms)
    func repricerPerPlatform(platform: String) {
        let suggestion = RepriceSuggestion(
            id: "t-\(platform)", title: "Item", currentPrice: 100, suggestedPrice: 85,
            action: "drop", reason: "Market comp", daysListed: 14, platform: platform,
            views: 50, likes: 3, brand: "Nike", urgency: "high", image: nil
        )
        #expect(suggestion.platform == platform)
        #expect(suggestion.stableId == "t-\(platform)")
    }
}
