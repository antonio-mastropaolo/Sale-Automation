import Foundation

struct SearchResult: Codable, Identifiable, Sendable {
    let id: String?
    let title: String?
    let price: Double?
    let platform: String?
    let images: [String]?
    let image: String?
    let url: String?
    let listingUrl: String?
    let seller: String?
    let condition: String?
    let size: String?
    let brand: String?

    var primaryImage: String? {
        images?.first ?? image
    }

    var stableId: String {
        id ?? "\(title ?? "")-\(platform ?? "")-\(price ?? 0)"
    }

    var formattedPrice: String {
        guard let price else { return "—" }
        return "$\(String(format: "%.0f", price))"
    }
}

struct SearchResponse: Codable, Sendable {
    let results: [SearchResult]?
    let total: Int?
    let query: String?
}
