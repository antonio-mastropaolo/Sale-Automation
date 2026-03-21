import Testing
import Foundation
@testable import ListBlitz

@Suite("Inbox")
struct InboxTests {

    @Test func decodeInboxWrapper() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        #expect(response.conversations.count == 2)
        #expect(response.unreadCount == 1)
    }

    @Test func displayNameFallback() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        // Has buyerName
        #expect(response.conversations[0].displayName == "Mike Vintage")
        // buyerName is null, falls to buyerUsername
        #expect(response.conversations[1].displayName == "streetwear_sam")
    }

    @Test func unreadConversationFiltering() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let unread = response.conversations.filter { $0.unread }
        #expect(unread.count == 1)
        #expect(unread[0].buyerUsername == "mike_vintage")
    }

    @Test func conversationStringId() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        #expect(response.conversations[0].id == "conv-001-uuid")
    }

    @Test func messageIsSeller() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let messages = try #require(response.conversations[0].messages)
        #expect(messages[0].isSeller == false)
        #expect(messages[0].sender == "buyer")
    }

    @Test func messageStringId() throws {
        let response = try TestFixtures.decoder.decode(InboxResponse.self, from: TestFixtures.inboxResponse)
        let messages = try #require(response.conversations[0].messages)
        #expect(messages[0].id == "msg-001")
        #expect(messages[0].conversationId == "conv-001-uuid")
    }
}
