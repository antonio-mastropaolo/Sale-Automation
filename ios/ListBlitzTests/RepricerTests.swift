import Testing
import Foundation
@testable import ListBlitz

@Suite("Repricer")
struct RepricerTests {

    @Test func decodeWrappedResponse() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        #expect(response.suggestions.count == 2)

        let stats = try #require(response.stats)
        #expect(stats.total == 2)
        #expect(stats.needsAction == 1)
        #expect(stats.highUrgency == 1)
        #expect(stats.potentialRevenue == 292.0)
    }

    @Test func priceChangeCalculation() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        let drop = response.suggestions[0]

        #expect(drop.priceChange == -13.0)  // 72 - 85
        let pct = try #require(drop.priceChangePercent)
        #expect(abs(pct - (-15.29)) < 0.1)
    }

    @Test func holdHasZeroPriceChange() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        let hold = response.suggestions[1]

        #expect(hold.priceChange == 0.0)
        #expect(hold.priceChangePercent == 0.0)
    }

    @Test func actionFiltering() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        let drops = response.suggestions.filter { $0.action == "drop" }
        let holds = response.suggestions.filter { $0.action == "hold" }
        #expect(drops.count == 1)
        #expect(holds.count == 1)
    }

    @Test func stableIdFromStringId() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        #expect(response.suggestions[0].stableId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    }

    @Test func newFieldsDecoded() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)
        let drop = response.suggestions[0]
        #expect(drop.brand == "Nike")
        #expect(drop.urgency == "high")
        #expect(drop.image == "/uploads/photo1.jpg")
    }
}
