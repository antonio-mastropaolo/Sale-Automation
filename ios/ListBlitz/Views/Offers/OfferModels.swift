import Foundation

struct Offer: Identifiable, Sendable {
    let id: String
    let buyerName: String?
    let buyerUsername: String?
    let listingTitle: String?
    let platform: String?
    let offerPrice: Double?
    let askingPrice: Double?
    let aiRecommendation: String?
    let aiCounterPrice: Double?
    let profitIfAccept: Double?
    let marketAvg: String?
    let status: String?
    let createdAt: String?

    var displayBuyer: String {
        buyerName ?? buyerUsername ?? "Unknown Buyer"
    }

    var buyerInitial: String {
        String(displayBuyer.prefix(1)).uppercased()
    }

    var formattedOfferPrice: String {
        guard let price = offerPrice else { return "--" }
        return "$\(String(format: "%.0f", price))"
    }

    var formattedAskingPrice: String {
        guard let price = askingPrice else { return "--" }
        return "$\(String(format: "%.0f", price))"
    }

    var formattedCounterPrice: String {
        guard let price = aiCounterPrice else { return "--" }
        return "$\(String(format: "%.0f", price))"
    }

    var formattedProfit: String {
        guard let profit = profitIfAccept else { return "--" }
        let sign = profit >= 0 ? "+" : ""
        return "\(sign)$\(String(format: "%.0f", profit))"
    }

    var offerPercent: Int? {
        guard let offer = offerPrice, let asking = askingPrice, asking > 0 else { return nil }
        return Int((offer / asking) * 100)
    }

    var isPending: Bool {
        status?.lowercased() == "pending"
    }
}

// MARK: - API Response Decoding (handles nested `ai` object)

struct APIOfferResponse: Codable, Sendable {
    let id: String
    let buyer: String?
    let listingTitle: String?
    let listingPrice: Double?
    let platform: String?
    let offerPrice: Double?
    let status: String?
    let receivedAt: String?
    let ai: AIRecommendation?

    struct AIRecommendation: Codable, Sendable {
        let recommendation: String?
        let suggestedCounter: Double?
        let profitAtOffer: Double?
        let marketAvg: Double?
    }

    func toOffer() -> Offer {
        Offer(
            id: id,
            buyerName: nil,
            buyerUsername: buyer,
            listingTitle: listingTitle,
            platform: platform,
            offerPrice: offerPrice,
            askingPrice: listingPrice,
            aiRecommendation: ai?.recommendation,
            aiCounterPrice: ai?.suggestedCounter,
            profitIfAccept: ai?.profitAtOffer,
            marketAvg: ai?.marketAvg.map { "$\(String(format: "%.0f", $0))" },
            status: status,
            createdAt: receivedAt
        )
    }
}

struct APIOffersResponse: Codable, Sendable {
    let offers: [APIOfferResponse]?

    func toOffers() -> [Offer] {
        offers?.map { $0.toOffer() } ?? []
    }
}

// Legacy wrapper for mock data
struct OffersResponse: Codable, Sendable {
    let offers: [LegacyOffer]?

    struct LegacyOffer: Codable, Sendable {
        let id: String
        let buyerName: String?
        let buyerUsername: String?
        let listingTitle: String?
        let platform: String?
        let offerPrice: Double?
        let askingPrice: Double?
        let aiRecommendation: String?
        let aiCounterPrice: Double?
        let profitIfAccept: Double?
        let marketAvg: String?
        let status: String?
        let createdAt: String?

        func toOffer() -> Offer {
            Offer(id: id, buyerName: buyerName, buyerUsername: buyerUsername, listingTitle: listingTitle,
                  platform: platform, offerPrice: offerPrice, askingPrice: askingPrice,
                  aiRecommendation: aiRecommendation, aiCounterPrice: aiCounterPrice,
                  profitIfAccept: profitIfAccept, marketAvg: marketAvg, status: status, createdAt: createdAt)
        }
    }
}
