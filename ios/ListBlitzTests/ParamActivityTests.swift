import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED ACTIVITY EVENT TESTS
// Generates ~1,500 test cases
// Screenshot mapping: SCR-13 Live Pulse activity feed —
//   event icon, event color, expanded detail cells,
//   platform badge, price/profit labels
// ═══════════════════════════════════════════════════════════════

@Suite("Activity Events — Parameterized")
struct ParamActivityTests {

    // SCR-13: Activity icon for each type
    @Test("Activity type icon", arguments: TestData.activityTypes)
    func typeIcon(type: ActivityEvent.ActivityType) {
        #expect(!type.icon.isEmpty)
        #expect(type.icon.contains("."))  // SF Symbol names contain dots
    }

    // SCR-13: Activity label for each type
    @Test("Activity type label", arguments: TestData.activityTypes)
    func typeLabel(type: ActivityEvent.ActivityType) {
        #expect(!type.label.isEmpty)
    }

    // SCR-13: Activity event with price
    @Test("Activity with price", arguments: TestData.prices.prefix(100))
    func activityWithPrice(price: Double) {
        let event = ActivityEvent(
            type: .sale, title: "Sold", description: "Item sold",
            timeAgo: "1m", price: price
        )
        #expect(event.formattedPrice != nil)
        #expect(event.formattedPrice!.hasPrefix("$"))
    }

    // SCR-13: Activity event with profit
    @Test("Activity with profit", arguments: TestData.profits.prefix(100))
    func activityWithProfit(profit: Double) {
        let event = ActivityEvent(
            type: .sale, title: "Sold", description: "Item sold",
            timeAgo: "1m", profit: profit
        )
        #expect(event.formattedProfit != nil)
        #expect(event.formattedProfit!.contains("$"))
    }

    // SCR-13: Activity event for each platform
    @Test("Activity per platform", arguments: TestData.platforms)
    func activityPerPlatform(platform: String) {
        let event = ActivityEvent(
            type: .sale, title: "Sold on \(platform)",
            description: "$50 on \(platform.capitalized)",
            timeAgo: "2m", platform: platform, price: 50
        )
        #expect(event.platform == platform)
    }

    // SCR-13: Activity type × platform matrix
    @Test("Activity type × platform", arguments: TestData.activityTypes, TestData.platforms)
    func typeByPlatform(type: ActivityEvent.ActivityType, platform: String) {
        let event = ActivityEvent(
            type: type,
            title: "\(type.label): Item on \(platform)",
            description: "Details",
            timeAgo: "now",
            platform: platform
        )
        #expect(event.type == type)
        #expect(event.platform == platform)
    }

    // SCR-13: Activity type × price matrix
    @Test("Activity type × price", arguments: TestData.activityTypes, [10.0, 50.0, 100.0, 500.0, 1000.0])
    func typeByPrice(type: ActivityEvent.ActivityType, price: Double) {
        let event = ActivityEvent(
            type: type, title: "Event", description: "Desc",
            timeAgo: "1h", price: price, profit: price * 0.4
        )
        #expect(event.formattedPrice == "$\(String(format: "%.0f", price))")
    }

    // SCR-13: Expanded detail — buyer name display
    @Test("Activity buyer names", arguments: TestData.userNames.prefix(30))
    func activityBuyerName(name: String) {
        let event = ActivityEvent(
            type: .sale, title: "Sold", description: "Desc",
            timeAgo: "1m", buyerName: name
        )
        #expect(event.buyerName == name)
    }

    // SCR-13: Expanded detail — listing title
    @Test("Activity listing titles", arguments: TestData.brands.prefix(30))
    func activityListingTitle(brand: String) {
        let event = ActivityEvent(
            type: .sale, title: "Sold: \(brand) Item",
            description: "Desc", timeAgo: "1m",
            listingTitle: "\(brand) Vintage Piece"
        )
        #expect(event.listingTitle?.contains(brand) == true)
    }

    // SCR-13: Unique IDs across batch creation
    @Test("Batch unique IDs", arguments: 0..<100)
    func batchUniqueIds(index: Int) {
        let events = (0..<10).map { i in
            ActivityEvent(type: .sale, title: "Sale \(i)", description: "", timeAgo: "\(i)m")
        }
        let uniqueIds = Set(events.map { $0.id })
        #expect(uniqueIds.count == 10)
    }
}
