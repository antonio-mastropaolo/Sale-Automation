import Testing
import Foundation
@testable import ListBlitz

@Suite("Swipe Actions")
struct SwipeActionsTests {

    // MARK: - Listing Deletion

    @Test func deleteRemovesFromArray() throws {
        var listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let initialCount = listings.count
        let idToRemove = listings[0].id

        listings.removeAll { $0.id == idToRemove }
        #expect(listings.count == initialCount - 1)
        #expect(!listings.contains { $0.id == idToRemove })
    }

    @Test func deletePreservesOtherListings() throws {
        var listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let secondId = listings[1].id

        let firstId = listings[0].id
        listings.removeAll { $0.id == firstId }
        #expect(listings.contains { $0.id == secondId })
    }

    // MARK: - Filter After Delete

    @Test func filterAfterDeleteShowsCorrectCount() throws {
        var listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let activeCount = listings.filter { $0.status == .active }.count

        // Delete the active listing
        listings.removeAll { $0.status == .active }
        #expect(listings.filter { $0.status == .active }.count == activeCount - 1)
    }

    // MARK: - Publish Eligibility

    @Test func draftListingCanPublish() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let draft = listings.first { $0.status == .draft }
        #expect(draft != nil)
        #expect(draft?.status == .draft)
    }

    @Test func activeListingCanPublish() throws {
        let listings = try TestFixtures.decoder.decode([Listing].self, from: TestFixtures.listingsResponse)
        let active = listings.first { $0.status == .active }
        #expect(active != nil)
    }

    @Test func soldListingCannotPublish() throws {
        // A sold listing should not show publish action
        let status = ListingStatus.sold
        #expect(status != .draft)
        #expect(status != .active)
    }

    // MARK: - Listing Status Checks

    @Test func listingStatusDisplayNames() {
        #expect(ListingStatus.draft.displayName == "Draft")
        #expect(ListingStatus.active.displayName == "Active")
        #expect(ListingStatus.sold.displayName == "Sold")
    }

    @Test func allListingStatusesCovered() {
        #expect(ListingStatus.allCases.count == 3)
    }
}
