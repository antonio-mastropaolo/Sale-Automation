import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED PRICE FORMATTING TESTS
// Generates ~500 test cases per @Test × 5 functions = 2,500 cases
// Screenshot mapping: Dashboard stat values, Listing prices,
//   Sale amounts, Offer prices, Analytics revenue
// ═══════════════════════════════════════════════════════════════

@Suite("Price Formatting — Parameterized")
struct ParamPriceTests {

    // SCR-03: Dashboard revenue display
    // SCR-04: Listing card price label
    // SCR-11: Analytics stat values
    @Test("Listing price format", arguments: TestData.prices)
    func listingPriceFormat(price: Double) {
        let listing = Listing(
            id: "test", title: "Test", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: price, costPrice: nil,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        let formatted = listing.formattedPrice
        if price == 0 {
            #expect(formatted == "$0")
        } else {
            #expect(formatted.hasPrefix("$"))
            #expect(!formatted.contains("-"))
        }
    }

    // SCR-05: Listing detail profit display
    // SCR-11: Analytics profit column
    @Test("Sale price format", arguments: TestData.prices)
    func salePriceFormat(price: Double) {
        let sale = Sale(id: "t", listingId: nil, platform: nil, title: nil,
                       soldPrice: price, costPrice: nil, shippingCost: nil,
                       platformFee: nil, profit: nil, buyerName: nil, soldAt: nil, notes: nil)
        let formatted = sale.formattedPrice
        #expect(formatted.hasPrefix("$"))
    }

    // SCR-03: Dashboard avg profit
    // SCR-05: Listing detail profit
    @Test("Sale profit format", arguments: TestData.profits)
    func saleProfitFormat(profit: Double) {
        let sale = Sale(id: "t", listingId: nil, platform: nil, title: nil,
                       soldPrice: nil, costPrice: nil, shippingCost: nil,
                       platformFee: nil, profit: profit, buyerName: nil, soldAt: nil, notes: nil)
        let formatted = sale.formattedProfit
        #expect(formatted.contains("$"))
        if profit >= 0 {
            #expect(formatted.hasPrefix("+"))
        }
    }

    // SCR-12: Offer Blitz price display
    @Test("Offer price format", arguments: TestData.prices)
    func offerPriceFormat(price: Double) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: price, askingPrice: 100,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(offer.formattedOfferPrice.hasPrefix("$"))
    }

    // SCR-05: Listing detail profit margin
    @Test("Profit margin calculation", arguments: TestData.prices)
    func profitMargin(price: Double) {
        guard price > 0 else { return }
        let cost = price * 0.6
        let listing = Listing(
            id: "test", title: "Test", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: price, costPrice: cost,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        let margin = listing.profitMargin
        #expect(margin != nil)
        if let m = margin {
            #expect(m >= 0 && m <= 100)
        }
    }
}
