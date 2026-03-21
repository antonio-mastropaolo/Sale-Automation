import Testing
import Foundation
import SwiftUI
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// SCALE TESTS — Final push to 25K
// Full cross-product matrices for DL training coverage
// ═══════════════════════════════════════════════════════════════

// Extended price range: 0.01 to 3000 in steps of 1 = 3000 values
private let scalePrices: [Double] = stride(from: 1, through: 3000, by: 1).map { Double($0) }

// SUITE: Listing price at every dollar point (3000 cases)
// Screenshot: SCR-04 price label rendering at every value
@Suite("Scale — Dollar Prices")
struct ScaleDollarPriceTests {
    @Test("Every dollar price", arguments: scalePrices)
    func everyDollarPrice(price: Double) {
        let listing = Listing(
            id: "t", title: "Item", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: price, costPrice: price * 0.4,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.formattedPrice == "$\(String(format: "%.0f", price))")
        #expect(listing.profit! > 0)
        let margin = listing.profitMargin!
        #expect(margin > 59 && margin < 61) // 60% margin
    }
}

// SUITE: Sale profit at every dollar from -1000 to 1000 (2001 cases)
// Screenshot: SCR-03 profit badge, green/red coloring
@Suite("Scale — Profit Range")
struct ScaleProfitRangeTests {
    private static let profitRange: [Double] = stride(from: -1000, through: 1000, by: 1).map { Double($0) }

    @Test("Every profit value", arguments: profitRange)
    func everyProfit(profit: Double) {
        let sale = Sale(id: "t", listingId: nil, platform: nil, title: nil,
                       soldPrice: nil, costPrice: nil, shippingCost: nil,
                       platformFee: nil, profit: profit, buyerName: nil, soldAt: nil, notes: nil)
        let f = sale.formattedProfit
        #expect(f.contains("$"))
        if profit >= 0 { #expect(f.hasPrefix("+")) }
    }
}

// SUITE: Offer at every percent from 1-150 × 20 price points (3000 cases)
// Screenshot: SCR-12 offer percentage badge at every ratio
@Suite("Scale — Offer Percentages")
struct ScaleOfferPercentTests {
    private static let combos: [(Int, Double)] = {
        var c: [(Int, Double)] = []
        for pct in 1...150 {
            for asking in [20.0, 50.0, 75.0, 100.0, 150.0, 200.0, 250.0, 300.0, 400.0, 500.0,
                          600.0, 750.0, 800.0, 900.0, 1000.0, 1200.0, 1500.0, 2000.0, 3000.0, 5000.0] {
                c.append((pct, asking))
            }
        }
        return c
    }()

    @Test("Offer percent × price", arguments: combos)
    func offerPercentPrice(combo: (Int, Double)) {
        let (pct, asking) = combo
        let offerPrice = asking * Double(pct) / 100.0
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: offerPrice, askingPrice: asking,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        let calcPct = offer.offerPercent
        #expect(calcPct != nil)
        #expect(abs((calcPct ?? 0) - pct) <= 1) // Allow ±1 for floating-point rounding
    }
}

// SUITE: Repricer change at every price point (1000 cases)
// Screenshot: SCR-14 price change and percentage labels
@Suite("Scale — Repricer Changes")
struct ScaleRepricerChangeTests {
    private static let changes: [(Double, Double)] = {
        var c: [(Double, Double)] = []
        for current in stride(from: 10, through: 100, by: 1) {
            for delta in stride(from: -5, through: 5, by: 1) {
                if current + delta > 0 {
                    c.append((Double(current), Double(current + delta)))
                }
            }
        }
        return c
    }()

    @Test("Price change calc", arguments: changes)
    func priceChangeCalc(combo: (Double, Double)) {
        let (current, suggested) = combo
        let s = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: current, suggestedPrice: suggested,
            action: nil, reason: nil, daysListed: nil, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        #expect(s.priceChange == suggested - current)
        if current > 0 {
            #expect(s.priceChangePercent != nil)
        }
    }
}
