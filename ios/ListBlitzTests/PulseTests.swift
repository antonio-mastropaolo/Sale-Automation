import Testing
import Foundation
@testable import ListBlitz

@Suite("Live Pulse")
struct PulseTests {

    @Test func activityEventCreation() {
        let event = ActivityEvent(
            type: .sale,
            title: "Sold: Nike Fleece",
            description: "Sold for $95 on Depop",
            timeAgo: "2m"
        )
        #expect(event.title == "Sold: Nike Fleece")
        #expect(event.type == .sale)
    }

    @Test func activityTypeIcons() {
        #expect(ActivityEvent.ActivityType.sale.icon == "dollarsign.circle.fill")
        #expect(ActivityEvent.ActivityType.offer.icon == "hand.raised.fill")
        #expect(ActivityEvent.ActivityType.message.icon == "bubble.left.fill")
        #expect(ActivityEvent.ActivityType.priceAlert.icon == "bell.badge.fill")
        #expect(ActivityEvent.ActivityType.shipping.icon == "shippingbox.fill")
    }

    @Test func activityFromSale() throws {
        let salesStats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        let sale = salesStats.sales[0]

        let event = ActivityEvent(
            type: .sale,
            title: "Sale! \(sale.title ?? "Unknown")",
            description: "Sold for \(sale.formattedPrice) on \(sale.platform?.capitalized ?? "unknown")",
            timeAgo: "2m"
        )

        #expect(event.title == "Sale! Stussy Varsity Jacket")
        #expect(event.description == "Sold for $95 on Depop")
    }

    @Test func activityFromConversation() throws {
        let inbox = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let conv = inbox.conversations[0]

        let event = ActivityEvent(
            type: .message,
            title: "New message from \(conv.displayName)",
            description: conv.lastMessage ?? "",
            timeAgo: "5m"
        )

        #expect(event.title == "New message from Mike Vintage")
        #expect(event.description == "Hey, would you take $70?")
    }

    @Test func activityEventHasUniqueId() {
        let a = ActivityEvent(type: .sale, title: "A", description: "", timeAgo: "1m")
        let b = ActivityEvent(type: .sale, title: "A", description: "", timeAgo: "1m")
        #expect(a.id != b.id)
    }
}
