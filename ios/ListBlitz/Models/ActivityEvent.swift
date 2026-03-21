import SwiftUI

struct ActivityEvent: Identifiable {
    let id = UUID()
    let type: ActivityType
    let title: String
    let description: String
    let timeAgo: String

    // Detail fields for expanded view
    var platform: String?
    var price: Double?
    var profit: Double?
    var buyerName: String?
    var listingTitle: String?
    var trackingNumber: String?

    var formattedPrice: String? {
        guard let price else { return nil }
        return "$\(String(format: "%.0f", price))"
    }

    var formattedProfit: String? {
        guard let profit else { return nil }
        let sign = profit >= 0 ? "+" : ""
        return "\(sign)$\(String(format: "%.0f", profit))"
    }

    enum ActivityType: Equatable {
        case sale, offer, message, priceAlert, shipping

        var icon: String {
            switch self {
            case .sale: "dollarsign.circle.fill"
            case .offer: "hand.raised.fill"
            case .message: "bubble.left.fill"
            case .priceAlert: "bell.badge.fill"
            case .shipping: "shippingbox.fill"
            }
        }

        var color: Color {
            switch self {
            case .sale: Theme.iosGreen
            case .offer: Theme.iosOrange
            case .message: Theme.iosBlue
            case .priceAlert: Theme.iosRed
            case .shipping: Theme.iosPurple
            }
        }

        var label: String {
            switch self {
            case .sale: "Sale"
            case .offer: "Offer"
            case .message: "Message"
            case .priceAlert: "Price Alert"
            case .shipping: "Shipping"
            }
        }
    }
}
