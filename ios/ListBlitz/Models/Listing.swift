import Foundation

struct Listing: Codable, Identifiable, Sendable, Hashable {
    let id: String
    var title: String
    var description: String?
    var category: String?
    var brand: String?
    var size: String?
    var condition: String?
    var price: Double?
    var costPrice: Double?
    var status: ListingStatus
    let createdAt: String?
    let updatedAt: String?
    var images: [ListingImage]?
    var platformListings: [PlatformListing]?

    var formattedPrice: String {
        guard let price else { return "—" }
        return "$\(String(format: "%.0f", price))"
    }

    var profit: Double? {
        guard let price, let costPrice else { return nil }
        return price - costPrice
    }

    var profitMargin: Double? {
        guard let price, let costPrice, price > 0 else { return nil }
        return ((price - costPrice) / price) * 100
    }

    var primaryImagePath: String? {
        images?.sorted(by: { ($0.order ?? 0) < ($1.order ?? 0) }).first?.path
    }

    var publishedPlatforms: [String] {
        platformListings?.filter { $0.status == "published" }.map { $0.platform } ?? []
    }

    static func == (lhs: Listing, rhs: Listing) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

enum ListingStatus: String, Codable, CaseIterable, Sendable {
    case draft, active, sold

    var displayName: String {
        rawValue.capitalized
    }

    var color: String {
        switch self {
        case .draft: "amber"
        case .active: "emerald"
        case .sold: "teal"
        }
    }
}

struct ListingImage: Codable, Identifiable, Sendable {
    let id: String
    let listingId: String?
    let path: String
    let order: Int?
}

struct PlatformListing: Codable, Identifiable, Sendable {
    let id: String
    let listingId: String?
    let platform: String
    let optimizedTitle: String?
    let optimizedDescription: String?
    let hashtags: [String]?
    let suggestedPrice: Double?
    let platformUrl: String?
    let status: String?
    let publishedAt: String?
}

struct CreateListingRequest: Codable {
    var title: String = ""
    var description: String = ""
    var category: String = ""
    var brand: String = ""
    var size: String = ""
    var condition: String = "Good"
    var price: Double = 0
    var costPrice: Double = 0
    var platforms: [String] = []
}

struct OptimizeResponse: Codable {
    let optimized: [PlatformOptimization]?
    let title: String?
    let description: String?
    let hashtags: [String]?
    let suggestedPrice: Double?
}

struct PlatformOptimization: Codable, Identifiable {
    let platform: String
    let title: String?
    let description: String?
    let hashtags: [String]?
    let suggestedPrice: Double?

    var id: String { platform }
}
