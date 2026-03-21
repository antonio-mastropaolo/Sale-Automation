import Foundation

struct Conversation: Codable, Identifiable, Sendable {
    let id: String
    let platform: String?
    let buyerName: String?
    let buyerUsername: String?
    let buyerAvatar: String?
    let listingId: String?
    let listingTitle: String?
    let status: String?
    let lastMessage: String?
    let lastMessageAt: String?
    let unread: Bool
    let createdAt: String?
    var messages: [Message]?

    var displayName: String {
        buyerName ?? buyerUsername ?? "Unknown"
    }

    var timeAgo: String {
        guard let lastMessageAt else { return "" }
        return DateHelper.timeAgo(from: lastMessageAt)
    }
}

struct Message: Codable, Identifiable, Sendable {
    let id: String
    let conversationId: String?
    let sender: String
    let content: String
    let platform: String?
    let read: Bool?
    let createdAt: String?

    var isSeller: Bool { sender == "seller" }

    var timeFormatted: String {
        guard let createdAt else { return "" }
        return DateHelper.shortTime(from: createdAt)
    }
}

struct InboxResponse: Codable, Sendable {
    let conversations: [Conversation]
    let unreadCount: Int?
}

struct SuggestResponse: Codable {
    let suggestion: String?
    let suggestions: [String]?
}
