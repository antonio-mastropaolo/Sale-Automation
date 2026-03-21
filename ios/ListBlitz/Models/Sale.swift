import Foundation

struct Sale: Codable, Identifiable, Sendable {
    let id: String
    let listingId: String?
    let platform: String?
    let title: String?
    let soldPrice: Double?
    let costPrice: Double?
    let shippingCost: Double?
    let platformFee: Double?
    let profit: Double?
    let buyerName: String?
    let soldAt: String?
    let notes: String?

    var formattedProfit: String {
        guard let profit else { return "—" }
        let sign = profit >= 0 ? "+" : ""
        return "\(sign)$\(String(format: "%.0f", profit))"
    }

    var formattedPrice: String {
        guard let soldPrice else { return "—" }
        return "$\(String(format: "%.0f", soldPrice))"
    }
}

struct SalesStats: Codable, Sendable {
    let sales: [Sale]
    let stats: SalesAggregate?
}

struct SalesAggregate: Codable, Sendable {
    let totalRevenue: Double?
    let totalProfit: Double?
    let totalCost: Double?
    let count: Int?
    let avgProfitMargin: Double?
}
