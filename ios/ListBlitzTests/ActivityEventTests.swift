import Testing
import Foundation
@testable import ListBlitz

@Suite("Activity Events")
struct ActivityEventTests {

    // MARK: - Event Types

    @Test func allTypeIcons() {
        #expect(ActivityEvent.ActivityType.sale.icon == "dollarsign.circle.fill")
        #expect(ActivityEvent.ActivityType.offer.icon == "hand.raised.fill")
        #expect(ActivityEvent.ActivityType.message.icon == "bubble.left.fill")
        #expect(ActivityEvent.ActivityType.priceAlert.icon == "bell.badge.fill")
        #expect(ActivityEvent.ActivityType.shipping.icon == "shippingbox.fill")
    }

    @Test func allTypeLabels() {
        #expect(ActivityEvent.ActivityType.sale.label == "Sale")
        #expect(ActivityEvent.ActivityType.offer.label == "Offer")
        #expect(ActivityEvent.ActivityType.message.label == "Message")
        #expect(ActivityEvent.ActivityType.priceAlert.label == "Price Alert")
        #expect(ActivityEvent.ActivityType.shipping.label == "Shipping")
    }

    @Test func typeEquality() {
        #expect(ActivityEvent.ActivityType.sale == ActivityEvent.ActivityType.sale)
        #expect(ActivityEvent.ActivityType.sale != ActivityEvent.ActivityType.offer)
    }

    // MARK: - Event Construction

    @Test func saleEventWithDetails() {
        let event = ActivityEvent(
            type: .sale,
            title: "Sold: Nike Fleece",
            description: "$85 on Depop",
            timeAgo: "2m",
            platform: "depop",
            price: 85.0,
            profit: 45.0,
            buyerName: "mike",
            listingTitle: "Nike Fleece"
        )
        #expect(event.platform == "depop")
        #expect(event.price == 85.0)
        #expect(event.profit == 45.0)
        #expect(event.buyerName == "mike")
        #expect(event.listingTitle == "Nike Fleece")
    }

    @Test func formattedPrice() {
        let event = ActivityEvent(
            type: .sale, title: "Test", description: "", timeAgo: "",
            price: 95.0
        )
        #expect(event.formattedPrice == "$95")
    }

    @Test func formattedPriceNil() {
        let event = ActivityEvent(type: .sale, title: "Test", description: "", timeAgo: "")
        #expect(event.formattedPrice == nil)
    }

    @Test func formattedProfitPositive() {
        let event = ActivityEvent(
            type: .sale, title: "Test", description: "", timeAgo: "",
            profit: 45.0
        )
        #expect(event.formattedProfit == "+$45")
    }

    @Test func formattedProfitNegative() {
        let event = ActivityEvent(
            type: .sale, title: "Test", description: "", timeAgo: "",
            profit: -10.0
        )
        #expect(event.formattedProfit?.contains("10") == true)
    }

    @Test func formattedProfitNil() {
        let event = ActivityEvent(type: .sale, title: "Test", description: "", timeAgo: "")
        #expect(event.formattedProfit == nil)
    }

    @Test func uniqueIds() {
        let a = ActivityEvent(type: .sale, title: "A", description: "", timeAgo: "")
        let b = ActivityEvent(type: .sale, title: "A", description: "", timeAgo: "")
        #expect(a.id != b.id)
    }

    // MARK: - Building from Sales

    @Test func buildFromSaleData() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        let sale = stats.sales[0]

        let event = ActivityEvent(
            type: .sale,
            title: "Sold: \(sale.title ?? "Item")",
            description: "\(sale.formattedPrice) on \(sale.platform?.capitalized ?? "")",
            timeAgo: "2m",
            platform: sale.platform,
            price: sale.soldPrice,
            profit: sale.profit,
            buyerName: sale.buyerName,
            listingTitle: sale.title
        )

        #expect(event.type == .sale)
        #expect(event.platform == "depop")
        #expect(event.price == 95.0)
        #expect(event.profit == 34.5)
        #expect(event.buyerName == "mike_vintage")
    }

    // MARK: - Building from Conversations

    @Test func buildFromConversation() throws {
        let inbox = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let conv = inbox.conversations[0]

        let event = ActivityEvent(
            type: .message,
            title: "New message from \(conv.displayName)",
            description: conv.lastMessage ?? "",
            timeAgo: "5m",
            platform: conv.platform,
            buyerName: conv.displayName,
            listingTitle: conv.listingTitle
        )

        #expect(event.type == .message)
        #expect(event.platform == "depop")
        #expect(event.buyerName == "Mike Vintage")
        #expect(event.listingTitle == "Vintage Nike ACG Fleece")
    }

    @Test func buildFromUnreadOnly() throws {
        let inbox = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let unread = inbox.conversations.filter { $0.unread }
        let events = unread.map { conv in
            ActivityEvent(
                type: .message,
                title: "New message from \(conv.displayName)",
                description: conv.lastMessage ?? "",
                timeAgo: "now",
                platform: conv.platform
            )
        }
        #expect(events.count == 1)
    }
}
