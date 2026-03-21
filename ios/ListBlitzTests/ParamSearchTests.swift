import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED SEARCH TESTS
// Generates ~800 test cases
// Screenshot mapping: SCR-08 Search results grid — title display,
//   price label, platform badge overlay, image loading
// ═══════════════════════════════════════════════════════════════

@Suite("Search — Parameterized")
struct ParamSearchTests {

    // SCR-08: Search result price display
    @Test("Search result price", arguments: TestData.prices.prefix(200))
    func searchResultPrice(price: Double) {
        let result = SearchResult(
            id: "r", title: "Test", price: price, platform: "depop",
            images: nil, image: nil, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: nil
        )
        #expect(result.formattedPrice.hasPrefix("$"))
    }

    // SCR-08: Platform filter on results
    @Test("Search filter by platform", arguments: TestData.platforms)
    func filterByPlatform(platform: String) {
        let results = TestData.platforms.map { p in
            SearchResult(
                id: "r-\(p)", title: "\(p) item", price: 50, platform: p,
                images: nil, image: nil, url: nil, listingUrl: nil,
                seller: nil, condition: nil, size: nil, brand: nil
            )
        }
        let filtered = results.filter { $0.platform?.lowercased() == platform }
        #expect(filtered.count == 1)
    }

    // SCR-08: Image source handling
    @Test("Primary image from images array", arguments: 0..<10)
    func primaryImageFromArray(imageCount: Int) {
        let images = (0..<imageCount).map { "https://example.com/img\($0).jpg" }
        let result = SearchResult(
            id: "r", title: "Test", price: 50, platform: "depop",
            images: images, image: nil, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: nil
        )
        if imageCount > 0 {
            #expect(result.primaryImage == "https://example.com/img0.jpg")
        } else {
            #expect(result.primaryImage == nil)
        }
    }

    // SCR-08: Image fallback to single image field
    @Test("Primary image fallback", arguments: ["https://img.jpg", nil] as [String?])
    func primaryImageFallback(image: String?) {
        let result = SearchResult(
            id: "r", title: "Test", price: 50, platform: "depop",
            images: nil, image: image, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: nil
        )
        #expect(result.primaryImage == image)
    }

    // SCR-08: Stable ID generation
    @Test("Stable ID with id", arguments: TestData.brands.prefix(30))
    func stableIdWithId(brand: String) {
        let result = SearchResult(
            id: "r-\(brand)", title: brand, price: 50, platform: "depop",
            images: nil, image: nil, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: brand
        )
        #expect(result.stableId == "r-\(brand)")
    }

    // SCR-08: Stable ID without id
    @Test("Stable ID without id", arguments: TestData.brands.prefix(30))
    func stableIdWithoutId(brand: String) {
        let result = SearchResult(
            id: nil, title: brand, price: 50, platform: "depop",
            images: nil, image: nil, url: nil, listingUrl: nil,
            seller: nil, condition: nil, size: nil, brand: brand
        )
        #expect(result.stableId.contains(brand))
    }

    // SCR-08: Search result with all fields populated
    @Test("Full search result", arguments: TestData.platforms)
    func fullSearchResult(platform: String) {
        let result = SearchResult(
            id: "full-\(platform)", title: "Nike Vintage \(platform)",
            price: 85, platform: platform,
            images: ["https://img1.jpg", "https://img2.jpg"],
            image: nil, url: "https://example.com",
            listingUrl: "https://\(platform).com/item/123",
            seller: "vintage_seller", condition: "Good", size: "L", brand: "Nike"
        )
        #expect(result.primaryImage == "https://img1.jpg")
        #expect(result.formattedPrice == "$85")
        #expect(result.stableId == "full-\(platform)")
    }
}
