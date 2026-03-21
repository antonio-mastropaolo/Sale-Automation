import Testing
import Foundation
@testable import ListBlitz

@Suite("Offer Blitz")
struct OfferTests {

    private var offers: [Offer] {
        get throws {
            let apiResponse = try TestFixtures.decoder.decode(APIOffersResponse.self, from: TestFixtures.offersAPIResponse)
            return apiResponse.toOffers()
        }
    }

    @Test func nestedAIDecoding() throws {
        let offer = try offers[0]
        #expect(offer.aiRecommendation == "accept")
        #expect(offer.aiCounterPrice == 78.0)
        #expect(offer.profitIfAccept == 30.0)
        #expect(offer.marketAvg == "$75")
    }

    @Test func fieldRemapping() throws {
        let offer = try offers[0]
        // API buyer → buyerUsername
        #expect(offer.buyerUsername == "mike_vintage")
        // API listingPrice → askingPrice
        #expect(offer.askingPrice == 85.0)
        // API receivedAt → createdAt
        #expect(offer.createdAt == "2026-03-20T09:30:00.000Z")
    }

    @Test func offerPercentCalculation() throws {
        let offer = try offers[0]
        #expect(offer.offerPercent == 82)  // 70/85 = 82%
    }

    @Test func formattedPrices() throws {
        let offer = try offers[0]
        #expect(offer.formattedOfferPrice == "$70")
        #expect(offer.formattedAskingPrice == "$85")
        #expect(offer.formattedCounterPrice == "$78")
        #expect(offer.formattedProfit == "+$30")
    }

    @Test func isPendingFlag() throws {
        let offer = try offers[0]
        #expect(offer.isPending == true)
    }

    @Test func displayBuyerFallback() throws {
        let offer = try offers[0]
        // buyerName is nil, falls to buyerUsername
        #expect(offer.displayBuyer == "mike_vintage")
        #expect(offer.buyerInitial == "M")
    }
}
