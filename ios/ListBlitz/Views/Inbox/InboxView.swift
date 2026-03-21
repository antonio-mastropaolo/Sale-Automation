import SwiftUI

struct InboxView: View {
    @State private var conversations: [Conversation] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var filterPlatform: String? = nil

    private let api = APIClient.shared

    var body: some View {
        VStack(spacing: 0) {
            // Platform Filter
            if !uniquePlatforms.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: filterPlatform == nil) {
                            filterPlatform = nil
                        }
                        ForEach(uniquePlatforms, id: \.self) { platform in
                            FilterChip(
                                title: platform.capitalized,
                                isSelected: filterPlatform == platform
                            ) {
                                filterPlatform = platform
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
            }

            if isLoading {
                LoadingView(message: "Loading conversations...")
            } else if let error {
                ErrorView(error: error) { await loadConversations() }
            } else if filteredConversations.isEmpty {
                EmptyStateView(
                    icon: "bubble.left.and.bubble.right",
                    title: "No Messages",
                    message: "Buyer messages will appear here"
                )
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(filteredConversations.enumerated()), id: \.element.id) { index, conversation in
                            NavigationLink(value: conversation.id) {
                                InboxConversationRow(conversation: conversation)
                            }
                            .buttonStyle(.plain)

                            if index < filteredConversations.count - 1 {
                                Divider()
                                    .background(Theme.textTertiary.opacity(0.3))
                                    .padding(.leading, 72)
                            }
                        }
                    }
                }
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Inbox")
        .navigationDestination(for: String.self) { id in
            ConversationDetailView(conversationId: id)
        }
        .refreshable { await loadConversations() }
        .task { await loadConversations() }
    }

    private var uniquePlatforms: [String] {
        Array(Set(conversations.compactMap { $0.platform })).sorted()
    }

    private var filteredConversations: [Conversation] {
        guard let filter = filterPlatform else { return conversations }
        return conversations.filter { $0.platform == filter }
    }

    private func loadConversations() async {
        isLoading = conversations.isEmpty
        do {
            let response: InboxResponse = try await api.get("/api/inbox", skipCache: true)
            conversations = response.conversations
            conversations.sort { ($0.lastMessageAt ?? "") > ($1.lastMessageAt ?? "") }
            error = nil
        } catch {
            self.error = error
        }
        isLoading = false
    }
}

// MARK: - Inbox Conversation Row

struct InboxConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            // 48pt avatar with platform-colored background
            ZStack {
                Circle()
                    .fill(Theme.platformColor(conversation.platform ?? "").opacity(0.2))
                    .frame(width: 48, height: 48)

                Text(String(conversation.displayName.prefix(1)).uppercased())
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.platformColor(conversation.platform ?? ""))
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(conversation.displayName)
                        .font(.subheadline.weight(conversation.unread ? .bold : .medium))
                        .foregroundStyle(Theme.textPrimary)

                    Spacer()

                    Text(conversation.timeAgo)
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                }

                HStack(spacing: 6) {
                    if let platform = conversation.platform {
                        PlatformBadge(platform: platform, compact: true)
                    }

                    if let title = conversation.listingTitle {
                        Text(title)
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                            .lineLimit(1)
                    }
                }

                if let lastMsg = conversation.lastMessage {
                    Text(lastMsg)
                        .font(.caption)
                        .foregroundStyle(conversation.unread ? Theme.textPrimary : Theme.textTertiary)
                        .lineLimit(1)
                }
            }

            // Unread dot
            if conversation.unread {
                Circle()
                    .fill(Theme.accent)
                    .frame(width: 10, height: 10)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}
