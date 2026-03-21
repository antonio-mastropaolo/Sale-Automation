import Testing
import Foundation
@testable import ListBlitz

@Suite("Search")
struct SearchTests {

    @Test func decodeSearchResponse() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        #expect(results.count == 2)
        #expect(response.total == 2)
        #expect(response.query == "vintage nike")
    }

    @Test func primaryImageFromArray() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        #expect(results[0].primaryImage == "https://example.com/img1.jpg")
    }

    @Test func emptyImagesArrayReturnsNil() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        #expect(results[1].primaryImage == nil)
    }

    @Test func stableIdFromId() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        #expect(results[0].stableId == "result-0")
    }

    @Test func platformFiltering() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        let depop = results.filter { $0.platform?.lowercased() == "depop" }
        #expect(depop.count == 1)
    }

    @Test func priceFormatting() throws {
        let response = try TestFixtures.decoder.decode(SearchResponse.self, from: TestFixtures.searchResponse)
        let results = try #require(response.results)
        #expect(results[0].formattedPrice == "$75")
        #expect(results[1].formattedPrice == "$120")
    }
}
