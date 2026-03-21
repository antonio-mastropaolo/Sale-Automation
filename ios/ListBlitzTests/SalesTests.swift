import Testing
import Foundation
@testable import ListBlitz

@Suite("Sales")
struct SalesTests {

    // MARK: - Sale Model

    @Test func saleFormattedPrice() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        #expect(stats.sales[0].formattedPrice == "$95")
    }

    @Test func saleFormattedProfitPositive() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        #expect(stats.sales[0].formattedProfit == "+$34")
    }

    @Test func saleFormattedProfitNegative() {
        let sale = Sale(id: "1", listingId: nil, platform: "depop", title: "Test",
                       soldPrice: 20, costPrice: 30, shippingCost: 5, platformFee: 2,
                       profit: -17, buyerName: nil, soldAt: nil, notes: nil)
        #expect(sale.formattedProfit.contains("17"))
    }

    @Test func saleFormattedProfitNil() {
        let sale = Sale(id: "1", listingId: nil, platform: nil, title: nil,
                       soldPrice: nil, costPrice: nil, shippingCost: nil, platformFee: nil,
                       profit: nil, buyerName: nil, soldAt: nil, notes: nil)
        #expect(sale.formattedProfit == "—")
        #expect(sale.formattedPrice == "—")
    }

    // MARK: - Stats Aggregate

    @Test func statsHasAllFields() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        let agg = try #require(stats.stats)
        #expect(agg.totalRevenue == 4280.0)
        #expect(agg.totalProfit == 2140.0)
        #expect(agg.totalCost == 2140.0)
        #expect(agg.count == 18)
        #expect(agg.avgProfitMargin == 50.0)
    }

    @Test func statsCanBeNil() {
        let json = """
        {"sales":[],"stats":null}
        """.data(using: .utf8)!
        let response = try? TestFixtures.decoder.decode(SalesStats.self, from: json)
        #expect(response?.stats == nil)
        #expect(response?.sales.isEmpty == true)
    }

    @Test func saleStringIds() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        let sale = stats.sales[0]
        #expect(sale.id == "sale-001-uuid")
        #expect(sale.listingId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    }

    @Test func salePlatformIsString() throws {
        let stats = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        #expect(stats.sales[0].platform == "depop")
    }
}
