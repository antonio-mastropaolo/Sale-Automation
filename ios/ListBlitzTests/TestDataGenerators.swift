import Foundation
@testable import ListBlitz

/// Generates large-scale test data for parameterized testing.
/// Each generator produces arrays used by @Test(arguments:) to create thousands of test cases.
enum TestData {

    // MARK: - Price Values (500 values)
    // Covers: zero, cents, round dollars, common retail prices, premium, max boundary
    static let prices: [Double] = {
        var p: [Double] = [0, 0.01, 0.1, 0.49, 0.5, 0.99, 1, 1.5, 2, 3, 4, 5, 7, 8, 9, 10]
        p += stride(from: 11, through: 100, by: 1).map { Double($0) }
        p += stride(from: 105, through: 500, by: 5).map { Double($0) }
        p += stride(from: 510, through: 1000, by: 10).map { Double($0) }
        p += stride(from: 1050, through: 5000, by: 50).map { Double($0) }
        p += stride(from: 5100, through: 10000, by: 100).map { Double($0) }
        p += [15000, 20000, 25000, 50000, 75000, 99999, 100000, 500000, 999999]
        return p
    }()

    // MARK: - Profit Values (200 values)
    static let profits: [Double] = {
        var p: [Double] = []
        p += stride(from: -500, through: -1, by: 5).map { Double($0) }
        p += [0]
        p += stride(from: 1, through: 500, by: 5).map { Double($0) }
        p += [-1000, -999, 1000, 5000, 10000]
        return p
    }()

    // MARK: - Platforms (8)
    static let platforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"]

    // MARK: - Platform Variations (32) — includes case variations
    static let platformVariations: [String] = {
        let base = platforms
        let upper = base.map { $0.uppercased() }
        let capitalized = base.map { $0.capitalized }
        let mixed = ["Facebook Marketplace", "Vestiaire Collective", "DEPOP", "Grailed"]
        return base + upper + capitalized + mixed
    }()

    // MARK: - Statuses
    static let statuses = ["draft", "active", "sold", "published", "failed", "pending", "cancelled"]

    // MARK: - Listing Status Enum
    static let listingStatuses: [ListingStatus] = ListingStatus.allCases

    // MARK: - Brands (50)
    static let brands = [
        "Nike", "Adidas", "Stussy", "Supreme", "Carhartt", "Carhartt WIP", "The North Face",
        "Patagonia", "Arc'teryx", "Polo Ralph Lauren", "Tommy Hilfiger", "Calvin Klein",
        "Levi's", "Wrangler", "Dickies", "Timberland", "New Balance", "Asics", "Puma",
        "Reebok", "Converse", "Vans", "Jordan", "Yeezy", "Balenciaga", "Gucci", "Prada",
        "Louis Vuitton", "Burberry", "Versace", "Fendi", "Off-White", "A Bathing Ape",
        "Palace", "Stone Island", "CP Company", "Acne Studios", "Comme des Garcons",
        "Raf Simons", "Rick Owens", "Maison Margiela", "Helmut Lang", "Dries Van Noten",
        "Jil Sander", "Issey Miyake", "Kapital", "Visvim", "Needles", "Undercover", "Sacai"
    ]

    // MARK: - Categories (15)
    static let categories = [
        "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
        "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
        "Vintage", "Designer", "Sportswear", "Swimwear", "Other"
    ]

    // MARK: - Sizes (20)
    static let sizes = [
        "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL",
        "6", "7", "8", "9", "10", "10.5", "11", "12", "13",
        "28", "30", "32", "34", "36", "38", "40",
        "OS", "One Size", "N/A", ""
    ]

    // MARK: - Conditions (6)
    static let conditions = ["New with Tags", "New without Tags", "Like New", "Good", "Fair", "Poor"]

    // MARK: - Offer Price Pairs (900) — (offerPrice, askingPrice)
    static let offerPricePairs: [(Double, Double)] = {
        var pairs: [(Double, Double)] = []
        let askingPrices: [Double] = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000]
        let percentages: [Double] = stride(from: 0.1, through: 1.5, by: 0.05).map { $0 }
        for asking in askingPrices {
            for pct in percentages {
                pairs.append((asking * pct, asking))
            }
        }
        return pairs
    }()

    // MARK: - Date Strings (100)
    static let dateStrings: [String] = {
        var dates: [String] = []
        let calendar = Calendar.current
        let now = Date()
        for minutesAgo in [0, 1, 5, 10, 30] {
            if let d = calendar.date(byAdding: .minute, value: -minutesAgo, to: now) {
                dates.append(ISO8601DateFormatter().string(from: d))
            }
        }
        for hoursAgo in [1, 2, 3, 6, 12, 23] {
            if let d = calendar.date(byAdding: .hour, value: -hoursAgo, to: now) {
                dates.append(ISO8601DateFormatter().string(from: d))
            }
        }
        for daysAgo in stride(from: 1, through: 60, by: 1) {
            if let d = calendar.date(byAdding: .day, value: -daysAgo, to: now) {
                dates.append(ISO8601DateFormatter().string(from: d))
            }
        }
        // Invalid dates
        dates += ["", "invalid", "2026", "not-a-date", "2026-13-01", "null"]
        // Various formats
        dates += [
            "2026-03-20T14:30:00.000Z",
            "2026-01-01T00:00:00.000Z",
            "2025-12-31T23:59:59.999Z",
            "2024-06-15T12:00:00Z",
        ]
        return dates
    }()

    // MARK: - Search Queries (100)
    static let searchQueries = [
        "nike", "vintage nike", "Y2K", "archive raf", "stussy", "jordan 1",
        "supreme box logo", "carhartt wip", "north face", "patagonia fleece",
        "", " ", "a", "ab", "abc", "🔥", "café", "tëst", "日本語",
        "UPPERCASE", "lowercase", "MiXeD cAsE",
        "nike air max 97", "jordan retro", "vintage 90s",
        "size L", "brand:nike", "price:100",
        String(repeating: "a", count: 200),  // long query
        "   spaces   ", "special!@#$%chars",
        "vintage nike acg fleece half zip pullover gorpcore",
    ] + TestData.brands.prefix(50).map { $0.lowercased() }
    + TestData.categories.map { $0.lowercased() }

    // MARK: - User Names (50)
    static let userNames = [
        "antonio", "admin", "", "a", "ab",
        "John Doe", "Jane Smith", "Mike Johnson",
        "vintage_seller_2024", "streetwear_sam", "mike_vintage",
        "user@email.com", "🎸rock", "café_owner",
        "ThisIsAVeryLongUsernameForTesting",
        "a b c", "  spaces  ", "ALLCAPS", "alllower",
    ] + TestData.brands.prefix(30).map { "seller_\($0.lowercased().replacingOccurrences(of: " ", with: "_"))" }

    // MARK: - Activity Event Types (5)
    static let activityTypes: [ActivityEvent.ActivityType] = [.sale, .offer, .message, .priceAlert, .shipping]

    // MARK: - Listing Combinations for Filter Testing (brand × status)
    struct ListingCombo: Sendable {
        let brand: String
        let status: ListingStatus
        let price: Double
        let title: String
    }

    static let listingCombos: [ListingCombo] = {
        var combos: [ListingCombo] = []
        for brand in brands.prefix(10) {
            for status in listingStatuses {
                for price in [10.0, 25.0, 35.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 1000.0] {
                    combos.append(ListingCombo(
                        brand: brand,
                        status: status,
                        price: price,
                        title: "\(brand) Item $\(Int(price))"
                    ))
                }
            }
        }
        return combos
    }()

    // MARK: - Hex Color Strings (50)
    static let hexColors = [
        "000000", "FFFFFF", "FF0000", "00FF00", "0000FF",
        "34D399", "059669", "0A84FF", "30D158", "FF9F0A",
        "FF453A", "FFD60A", "BF5AF2", "FF375F", "64D2FF",
        "5E5CE6", "1C1C1E", "2C2C2E", "3A3A3C",
        "FFF", "000", "F00", "0F0", "00F",  // 3-digit
        "#34D399", "#FF0000", "#000",  // with hash
        "invalid", "", "GGGGGG", "12345", "1234567890",  // invalid
    ]

    // MARK: - Repricer Price Pairs (600) — (currentPrice, suggestedPrice)
    static let repricerPairs: [(Double, Double)] = {
        var pairs: [(Double, Double)] = []
        let bases: [Double] = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000]
        for base in bases {
            for drop in stride(from: 0.5, through: 0.95, by: 0.05) {
                pairs.append((base, base * drop))
            }
            pairs.append((base, base))
            for raise in stride(from: 1.05, through: 1.5, by: 0.05) {
                pairs.append((base, base * raise))
            }
        }
        return pairs
    }()
}
