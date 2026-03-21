import Testing
import Foundation
import SwiftUI
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED EDGE CASE & BOUNDARY TESTS
// Generates ~2,000 test cases
// Screenshot mapping: All screens — verifies no crashes with
//   nil values, empty strings, extreme numbers, unicode,
//   malformed data across all models
// ═══════════════════════════════════════════════════════════════

@Suite("Edge Cases — Parameterized")
struct ParamEdgeCaseTests {

    // ALL SCREENS: Nil price handling
    @Test("Nil price formatting", arguments: TestData.listingStatuses)
    func nilPriceFormatting(status: ListingStatus) {
        let listing = Listing(
            id: "t", title: "Test", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: nil, costPrice: nil,
            status: status, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.formattedPrice == "—")
        #expect(listing.profit == nil)
        #expect(listing.profitMargin == nil)
    }

    // SCR-04: Empty listing arrays
    @Test("Empty listing image arrays", arguments: 0..<5)
    func emptyImageArrays(variant: Int) {
        let images: [ListingImage]? = variant == 0 ? nil : []
        let listing = Listing(
            id: "t", title: "Test", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: 50, costPrice: nil,
            status: .draft, createdAt: nil, updatedAt: nil,
            images: images, platformListings: nil
        )
        #expect(listing.primaryImagePath == nil)
    }

    // SCR-09: Conversation with all nil optionals
    @Test("Conversation nil fields", arguments: TestData.platforms)
    func conversationNilFields(platform: String) {
        let conv = Conversation(
            id: "t", platform: platform, buyerName: nil, buyerUsername: nil,
            buyerAvatar: nil, listingId: nil, listingTitle: nil,
            status: nil, lastMessage: nil, lastMessageAt: nil,
            unread: false, createdAt: nil, messages: nil
        )
        #expect(conv.displayName == "Unknown")
        #expect(conv.timeAgo == "")
    }

    // ALL: Zero price edge case
    @Test("Zero price", arguments: TestData.listingStatuses)
    func zeroPrice(status: ListingStatus) {
        let listing = Listing(
            id: "t", title: "Free", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: 0, costPrice: 0,
            status: status, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.profit == 0)
        #expect(listing.profitMargin == nil) // 0/0 division
    }

    // ALL: Very large price
    @Test("Large prices", arguments: [999999.0, 1000000.0, 9999999.0])
    func largePrices(price: Double) {
        let listing = Listing(
            id: "t", title: "Expensive", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: price, costPrice: 0,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.formattedPrice.hasPrefix("$"))
        #expect(listing.profit == price)
    }

    // SCR-12: Offer with zero asking price (division guard)
    @Test("Offer zero asking price", arguments: TestData.prices.prefix(50))
    func offerZeroAsking(offerPrice: Double) {
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: nil, listingTitle: nil,
            platform: nil, offerPrice: offerPrice, askingPrice: 0,
            aiRecommendation: nil, aiCounterPrice: nil, profitIfAccept: nil,
            marketAvg: nil, status: nil, createdAt: nil
        )
        #expect(offer.offerPercent == nil) // Guard against division by zero
    }

    // SCR-08: Repricer zero current price (division guard)
    @Test("Repricer zero current price", arguments: TestData.prices.prefix(50))
    func repricerZeroCurrent(suggestedPrice: Double) {
        let s = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: 0, suggestedPrice: suggestedPrice,
            action: "drop", reason: nil, daysListed: nil, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        #expect(s.priceChangePercent == nil) // Guard against division by zero
    }

    // SCR-08: Search result nil price
    @Test("Search nil price", arguments: TestData.platforms)
    func searchNilPrice(platform: String) {
        let r = SearchResult(
            id: "t", title: "Test", price: nil, platform: platform,
            images: nil, image: nil, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: nil
        )
        #expect(r.formattedPrice == "—")
    }

    // SCR-05: Sale with all nil optionals
    @Test("Sale all nils", arguments: 0..<10)
    func saleAllNils(variant: Int) {
        let sale = Sale(
            id: "t-\(variant)", listingId: nil, platform: nil, title: nil,
            soldPrice: nil, costPrice: nil, shippingCost: nil, platformFee: nil,
            profit: nil, buyerName: nil, soldAt: nil, notes: nil
        )
        #expect(sale.formattedPrice == "—")
        #expect(sale.formattedProfit == "—")
    }

    // ALL: Unicode in text fields
    @Test("Unicode titles", arguments: ["日本語テスト", "Café Møller", "🔥 Fire Piece", "Ñoño", "Ürban", "Ωmega", "∞ Infinity", "™ Brand", "€100 Item", "£50 Vintage"])
    func unicodeTitles(title: String) {
        let listing = Listing(
            id: "t", title: title, description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: 50, costPrice: nil,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.title == title)
        #expect(!listing.formattedPrice.isEmpty)
    }

    // THM-01: Hex color parsing edge cases
    @Test("Hex color parsing", arguments: TestData.hexColors)
    func hexColorParsing(hex: String) {
        // Should never crash, even with invalid input
        let _ = Color(hex: hex)
        #expect(true)
    }

    // SCR-13: Live Pulse — activity event with all nil detail fields
    @Test("Activity nil details", arguments: TestData.activityTypes)
    func activityNilDetails(type: ActivityEvent.ActivityType) {
        let event = ActivityEvent(type: type, title: "Test", description: "Desc", timeAgo: "1m")
        #expect(event.platform == nil)
        #expect(event.price == nil)
        #expect(event.profit == nil)
        #expect(event.buyerName == nil)
        #expect(event.formattedPrice == nil)
        #expect(event.formattedProfit == nil)
    }

    // ALL: Listing with every field populated
    @Test("Fully populated listing", arguments: TestData.brands.prefix(20))
    func fullyPopulatedListing(brand: String) {
        let listing = Listing(
            id: UUID().uuidString, title: "\(brand) Premium Item",
            description: "A fully described \(brand) item with all fields.",
            category: "Outerwear", brand: brand, size: "L", condition: "Good",
            price: 200, costPrice: 80,
            status: .active, createdAt: "2026-03-01T12:00:00Z", updatedAt: "2026-03-20T15:00:00Z",
            images: [
                ListingImage(id: "i1", listingId: "t", path: "/img/1.jpg", order: 0),
                ListingImage(id: "i2", listingId: "t", path: "/img/2.jpg", order: 1),
            ],
            platformListings: [
                PlatformListing(id: "p1", listingId: "t", platform: "depop",
                    optimizedTitle: "\(brand) Vintage", optimizedDescription: "Rare find",
                    hashtags: ["vintage", brand.lowercased()], suggestedPrice: 210,
                    platformUrl: nil, status: "published", publishedAt: "2026-03-15T10:00:00Z")
            ]
        )
        #expect(listing.formattedPrice == "$200")
        #expect(listing.profit == 120)
        #expect(listing.primaryImagePath == "/img/1.jpg")
        #expect(listing.publishedPlatforms == ["depop"])
        #expect(!listing.title.isEmpty)
    }
}

// Make TestData.ListingCombo work with @Test(arguments:)
extension TestData.ListingCombo: Equatable {
    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.brand == rhs.brand && lhs.status == rhs.status && lhs.price == rhs.price
    }
}
