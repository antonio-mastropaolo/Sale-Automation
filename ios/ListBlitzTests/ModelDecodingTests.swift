import Testing
import Foundation
@testable import ListBlitz

@Suite("Model Decoding")
struct ModelDecodingTests {

    // MARK: - Auth

    @Test func decodeAuthResponse() throws {
        let response = try TestFixtures.decoder.decode(AuthResponse.self, from: TestFixtures.loginResponse)
        #expect(response.user.id == "7bc5b294-f3bd-4130-ae33-9e0d044ee3b5")
        #expect(response.user.email == "admin@listblitz.io")
        #expect(response.user.username == "antonio")
        #expect(response.user.role == "admin")
        #expect(response.user.onboarded == true)
    }

    @Test func userComputedProperties() throws {
        let response = try TestFixtures.decoder.decode(AuthResponse.self, from: TestFixtures.loginResponse)
        let user = response.user
        #expect(user.displayName == "antonio")
        #expect(user.initials == "AN")
        #expect(user.isAdmin == true)
    }

    // MARK: - Listings

    @Test func decodeListings() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        #expect(listings.count == 2)

        let first = listings[0]
        #expect(first.id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        #expect(first.title == "Vintage Nike ACG Fleece")
        #expect(first.price == 85.0)
        #expect(first.costPrice == 40.0)
        #expect(first.status == .active)
        #expect(first.brand == "Nike")
        #expect(first.size == "L")
    }

    @Test func listingImages() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let first = listings[0]

        #expect(first.images?.count == 2)
        #expect(first.images?[0].id == "img-001")
        #expect(first.images?[0].path == "/uploads/photo1.jpg")
        #expect(first.primaryImagePath == "/uploads/photo1.jpg")
    }

    @Test func listingPlatformListings() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let first = listings[0]

        #expect(first.platformListings?.count == 1)
        #expect(first.platformListings?[0].platform == "depop")
        #expect(first.platformListings?[0].status == "published")
        #expect(first.publishedPlatforms == ["depop"])
    }

    @Test func listingProfit() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let first = listings[0]

        #expect(first.profit == 45.0)
        #expect(first.profitMargin != nil)
        let margin = try #require(first.profitMargin)
        #expect(abs(margin - 52.94) < 0.1)
    }

    @Test func listingFormattedPrice() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        #expect(listings[0].formattedPrice == "$85")
        #expect(listings[1].formattedPrice == "$220")
    }

    // MARK: - Sales

    @Test func decodeSalesWithStats() throws {
        let response = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)

        #expect(response.sales.count == 1)
        #expect(response.sales[0].id == "sale-001-uuid")
        #expect(response.sales[0].soldPrice == 95.0)
        #expect(response.sales[0].profit == 34.5)
        #expect(response.sales[0].platform == "depop")

        let stats = try #require(response.stats)
        #expect(stats.totalRevenue == 4280.0)
        #expect(stats.totalProfit == 2140.0)
        #expect(stats.totalCost == 2140.0)
        #expect(stats.count == 18)
        #expect(stats.avgProfitMargin == 50.0)
    }

    @Test func saleFormatting() throws {
        let response = try TestFixtures.decoder.decode(SalesStats.self, from: TestFixtures.salesWithStatsResponse)
        let sale = response.sales[0]

        #expect(sale.formattedPrice == "$95")
        #expect(sale.formattedProfit == "+$34")
    }

    // MARK: - Inbox

    @Test func decodeInboxResponse() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)

        #expect(response.conversations.count == 2)
        #expect(response.unreadCount == 1)

        let first = response.conversations[0]
        #expect(first.id == "conv-001-uuid")
        #expect(first.platform == "depop")
        #expect(first.buyerName == "Mike Vintage")
        #expect(first.unread == true)
        #expect(first.lastMessage == "Hey, would you take $70?")
    }

    @Test func conversationDisplayName() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)

        #expect(response.conversations[0].displayName == "Mike Vintage")
        #expect(response.conversations[1].displayName == "streetwear_sam") // buyerName is null, falls back to buyerUsername
    }

    @Test func messageDecoding() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let messages = try #require(response.conversations[0].messages)

        #expect(messages.count == 1)
        #expect(messages[0].id == "msg-001")
        #expect(messages[0].sender == "buyer")
        #expect(messages[0].isSeller == false)
        #expect(messages[0].content == "Hey, would you take $70?")
    }

    // MARK: - Search

    @Test func decodeSearchResponse() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)

        #expect(results.count == 2)
        #expect(response.total == 2)
        #expect(response.query == "vintage nike")
    }

    @Test func searchResultPrimaryImage() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)

        #expect(results[0].primaryImage == "https://example.com/img1.jpg")
        #expect(results[1].primaryImage == nil) // empty images array
    }

    @Test func searchResultFormatting() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)

        #expect(results[0].formattedPrice == "$75")
        #expect(results[0].stableId == "result-0")
    }

    // MARK: - Repricing

    @Test func decodeRepricingResponse() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)

        #expect(response.suggestions.count == 2)

        let drop = response.suggestions[0]
        #expect(drop.id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        #expect(drop.action == "drop")
        #expect(drop.currentPrice == 85.0)
        #expect(drop.suggestedPrice == 72.0)
        #expect(drop.urgency == "high")
        #expect(drop.brand == "Nike")

        let stats = try #require(response.stats)
        #expect(stats.total == 2)
        #expect(stats.needsAction == 1)
    }

    @Test func repricePriceChange() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)

        let drop = response.suggestions[0]
        #expect(drop.priceChange == -13.0)

        let pct = try #require(drop.priceChangePercent)
        #expect(abs(pct - (-15.29)) < 0.1)

        let hold = response.suggestions[1]
        #expect(hold.priceChange == 0.0)
        #expect(hold.priceChangePercent == 0.0)
    }

    @Test func repriceActionEmoji() throws {
        let response = try TestFixtures.decoder.decode(RepricingResponse.self, from: TestFixtures.repricingResponse)

        #expect(response.suggestions[0].actionEmoji == "arrow.down.circle.fill")
        #expect(response.suggestions[1].actionEmoji == "pause.circle.fill")
    }

    // MARK: - Offers (nested AI)

    @Test func decodeOffersAPIResponse() throws {
        let apiResponse = try TestFixtures.decoder.decode(APIOffersResponse.self, from: TestFixtures.offersAPIResponse)
        let offers = apiResponse.toOffers()

        #expect(offers.count == 1)

        let offer = offers[0]
        #expect(offer.id == "offer-0-a1b2c3d4")
        #expect(offer.buyerUsername == "mike_vintage")
        #expect(offer.listingTitle == "Vintage Nike ACG Fleece")
        #expect(offer.platform == "depop")
        #expect(offer.offerPrice == 70.0)
        #expect(offer.askingPrice == 85.0)
        #expect(offer.aiRecommendation == "accept")
        #expect(offer.aiCounterPrice == 78.0)
        #expect(offer.profitIfAccept == 30.0)
        #expect(offer.marketAvg == "$75")
        #expect(offer.status == "pending")
        #expect(offer.isPending == true)
    }

    @Test func offerComputedProperties() throws {
        let apiResponse = try TestFixtures.decoder.decode(APIOffersResponse.self, from: TestFixtures.offersAPIResponse)
        let offer = apiResponse.toOffers()[0]

        #expect(offer.offerPercent == 82)
        #expect(offer.formattedOfferPrice == "$70")
        #expect(offer.formattedAskingPrice == "$85")
        #expect(offer.formattedCounterPrice == "$78")
        #expect(offer.formattedProfit == "+$30")
        #expect(offer.displayBuyer == "mike_vintage")
        #expect(offer.buyerInitial == "M")
    }
}
