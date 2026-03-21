import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED OFFER CALCULATION TESTS
// Generates ~2,000 test cases
// Screenshot mapping: SCR-12 Offer Blitz cards — price display,
//   offer percentage badge, profit calculation, AI recommendation
// ═══════════════════════════════════════════════════════════════

@Suite("Offer Calculations — Parameterized")
struct ParamOfferTests {

    // SCR-12: Offer percentage badge color
    @Test("Offer percent calculation", arguments: TestData.offerPricePairs)
    func offerPercent(pair: (Double, Double)) {
        let (offerPrice, askingPrice) = pair
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: offerPrice, askingPrice: askingPrice,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: "pending", createdAt: nil
        )
        if askingPrice > 0 {
            let pct = offer.offerPercent
            #expect(pct != nil)
            if let p = pct {
                let expected = Int((offerPrice / askingPrice) * 100)
                #expect(p == expected)
            }
        }
    }

    // SCR-12: Formatted offer price on card
    @Test("Offer formatted prices", arguments: TestData.offerPricePairs)
    func offerFormattedPrices(pair: (Double, Double)) {
        let (offerPrice, askingPrice) = pair
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: offerPrice, askingPrice: askingPrice,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(offer.formattedOfferPrice.hasPrefix("$"))
        #expect(offer.formattedAskingPrice.hasPrefix("$"))
    }

    // SCR-12: AI recommendation badge
    @Test("Offer AI recommendations", arguments: ["accept", "counter", "decline", nil, "", "unknown"] as [String?])
    func aiRecommendation(rec: String?) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: 50, askingPrice: 100,
            aiRecommendation: rec, aiCounterPrice: 75, profitIfAccept: 10,
            marketAvg: "$80", status: "pending", createdAt: nil
        )
        #expect(offer.aiRecommendation == rec)
    }

    // SCR-12: Pending status check
    @Test("Offer isPending", arguments: ["pending", "accepted", "countered", "declined", nil, ""] as [String?])
    func isPending(status: String?) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: 50, askingPrice: 100,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: status, createdAt: nil
        )
        #expect(offer.isPending == (status?.lowercased() == "pending"))
    }

    // SCR-12: Buyer display name fallback chain
    @Test("Offer buyer display", arguments: TestData.userNames)
    func buyerDisplay(name: String) {
        let offer = Offer(
            id: "t", buyerName: name.isEmpty ? nil : name, buyerUsername: "fallback",
            listingTitle: nil, platform: nil, offerPrice: 50, askingPrice: 100,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(!offer.displayBuyer.isEmpty)
        #expect(!offer.buyerInitial.isEmpty)
    }

    // SCR-12: Profit display on offer card
    @Test("Offer profit format", arguments: TestData.profits)
    func offerProfit(profit: Double) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: nil, askingPrice: nil,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: profit,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(offer.formattedProfit.contains("$"))
    }

    // SCR-12: Counter price formatting
    @Test("Counter price format", arguments: TestData.prices.prefix(200))
    func counterPriceFormat(price: Double) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: nil, askingPrice: nil,
            aiRecommendation: nil, aiCounterPrice: price, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(offer.formattedCounterPrice.hasPrefix("$"))
    }

    // SCR-12: Offer × Platform combinations
    @Test("Offer on each platform", arguments: TestData.platforms)
    func offerPerPlatform(platform: String) {
        let offer = Offer(
            id: "t-\(platform)", buyerName: nil, buyerUsername: "buyer",
            listingTitle: "Item on \(platform)", platform: platform,
            offerPrice: 50, askingPrice: 100,
            aiRecommendation: "accept", aiCounterPrice: 75, profitIfAccept: 10,
            marketAvg: "$80", status: "pending", createdAt: nil
        )
        #expect(offer.platform == platform)
        #expect(Theme.platformColor(platform) != .clear)
    }
}
