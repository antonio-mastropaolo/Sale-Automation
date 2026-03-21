import Testing
import Foundation
@testable import ListBlitz

@Suite("Listings")
struct ListingsTests {

    private var listings: [Listing] {
        get throws {
            try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        }
    }

    @Test func filterByStatusActive() throws {
        let active = try listings.filter { $0.status == .active }
        #expect(active.count == 1)
        #expect(active[0].title == "Vintage Nike ACG Fleece")
    }

    @Test func filterByStatusDraft() throws {
        let drafts = try listings.filter { $0.status == .draft }
        #expect(drafts.count == 1)
        #expect(drafts[0].title == "Jordan 1 Retro High OG")
    }

    @Test func sortByPriceHighToLow() throws {
        let sorted = try listings.sorted { ($0.price ?? 0) > ($1.price ?? 0) }
        #expect(sorted[0].price == 220.0)
        #expect(sorted[1].price == 85.0)
    }

    @Test func sortByPriceLowToHigh() throws {
        let sorted = try listings.sorted { ($0.price ?? 0) < ($1.price ?? 0) }
        #expect(sorted[0].price == 85.0)
        #expect(sorted[1].price == 220.0)
    }

    @Test func searchByTitle() throws {
        let query = "nike"
        let results = try listings.filter { $0.title.lowercased().contains(query) }
        #expect(results.count == 1)
        #expect(results[0].title.contains("Nike"))
    }

    @Test func searchByBrand() throws {
        let query = "nike"
        let results = try listings.filter { $0.brand?.lowercased().contains(query) ?? false }
        #expect(results.count == 2)  // both are Nike
    }

    @Test func profitCalculation() throws {
        let listing = try listings[0]
        #expect(listing.profit == 45.0)

        let listing2 = try listings[1]
        #expect(listing2.profit == 90.0)  // 220 - 130
    }

    @Test func profitMarginCalculation() throws {
        let listing = try listings[0]
        let margin = try #require(listing.profitMargin)
        // 45/85 * 100 = 52.94%
        #expect(abs(margin - 52.94) < 0.1)
    }

    @Test func primaryImageFromOrderedImages() throws {
        let listing = try listings[0]
        #expect(listing.primaryImagePath == "/uploads/photo1.jpg")
    }

    @Test func emptyImagesReturnNilPrimary() throws {
        let listing = try listings[1]
        #expect(listing.primaryImagePath == nil)
    }

    @Test func publishedPlatforms() throws {
        let listing = try listings[0]
        #expect(listing.publishedPlatforms == ["depop"])

        let listing2 = try listings[1]
        #expect(listing2.publishedPlatforms.isEmpty)
    }

    @Test func hashableEquality() throws {
        let a = try listings[0]
        let b = try listings[0]
        #expect(a == b)

        let c = try listings[1]
        #expect(a != c)
    }
}
