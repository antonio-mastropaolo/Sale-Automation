import SwiftUI

struct ConversationDetailView: View {
    let conversationId: String

    @State private var conversation: Conversation?
    @State private var messages: [Message] = []
    @State private var newMessage = ""
    @State private var isLoading = true
    @State private var isSending = false
    @State private var aiSuggestion: String?
    @State private var isLoadingSuggestion = false
    @FocusState private var isInputFocused: Bool

    private let api = APIClient.shared

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            if isLoading {
                LoadingView(message: "Loading messages...")
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 6) {
                            ForEach(messages) { message in
                                ChatBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: messages.count) { _, _ in
                        if let lastId = messages.last?.id {
                            withAnimation(.spring(duration: 0.3)) {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }

                // AI Suggestion Banner
                if let suggestion = aiSuggestion {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.caption)
                            .foregroundStyle(Theme.accent)
                            .symbolEffect(.bounce)

                        Text(suggestion)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(2)

                        Spacer()

                        Button {
                            newMessage = suggestion
                            aiSuggestion = nil
                            HapticEngine.light()
                        } label: {
                            Text("Use")
                                .font(.caption.bold())
                                .foregroundStyle(.black)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Theme.accent)
                                .clipShape(Capsule())
                        }

                        Button {
                            withAnimation { aiSuggestion = nil }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2)
                                .foregroundStyle(Theme.textTertiary)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.backgroundCard)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Input Bar
                inputBar
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 1) {
                    Text(conversation?.displayName ?? "Chat")
                        .font(.subheadline.bold())
                        .foregroundStyle(Theme.textPrimary)
                    if let platform = conversation?.platform {
                        Text(platform.capitalized)
                            .font(.caption2)
                            .foregroundStyle(Theme.textTertiary)
                    }
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    HapticEngine.light()
                    loadAISuggestion()
                } label: {
                    if isLoadingSuggestion {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "sparkles")
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
        }
        .task { await loadConversation() }
        .animation(.smooth, value: aiSuggestion)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 10) {
            // Pill-shaped text field
            TextField("Type a message...", text: $newMessage, axis: .vertical)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .foregroundStyle(Theme.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.backgroundElevated)
                .clipShape(Capsule())
                .focused($isInputFocused)
                .lineLimit(1...5)

            Button {
                HapticEngine.light()
                sendMessage()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(newMessage.isEmpty ? Theme.textTertiary : Theme.accent)
            }
            .disabled(newMessage.isEmpty || isSending)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.backgroundSecondary)
    }

    // MARK: - Actions

    private func loadConversation() async {
        isLoading = true
        do {
            let conv: Conversation = try await api.get("/api/inbox/\(conversationId)", skipCache: true)
            conversation = conv
            messages = conv.messages ?? []
        } catch {}
        isLoading = false
    }

    private func sendMessage() {
        let text = newMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        newMessage = ""
        isSending = true
        HapticEngine.light()

        Task {
            do {
                let msg: Message = try await api.post(
                    "/api/inbox/\(conversationId)",
                    body: ["content": text, "sender": "seller"]
                )
                messages.append(msg)
                HapticEngine.success()
            } catch {
                newMessage = text
                HapticEngine.error()
            }
            isSending = false
        }
    }

    private func loadAISuggestion() {
        isLoadingSuggestion = true
        Task {
            do {
                let response: SuggestResponse = try await api.post(
                    "/api/inbox/suggest",
                    body: ["conversationId": conversationId]
                )
                aiSuggestion = response.suggestion ?? response.suggestions?.first
                HapticEngine.light()
            } catch {}
            isLoadingSuggestion = false
        }
    }
}

// MARK: - Chat Bubble

struct ChatBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.isSeller { Spacer(minLength: 60) }

            VStack(alignment: message.isSeller ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(.subheadline)
                    .foregroundStyle(message.isSeller ? .black : Theme.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(message.isSeller ? Theme.accent : Theme.backgroundElevated)
                    .clipShape(ChatBubbleShape(isSeller: message.isSeller))

                Text(message.timeFormatted)
                    .font(.system(size: 10))
                    .foregroundStyle(Theme.textTertiary)
                    .padding(.horizontal, 4)
            }

            if !message.isSeller { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Chat Bubble Shape

struct ChatBubbleShape: Shape {
    let isSeller: Bool

    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 18
        let smallRadius: CGFloat = 4

        var path = Path()

        if isSeller {
            // Seller: small bottom-right corner
            path.addRoundedRect(
                in: rect,
                cornerRadii: RectangleCornerRadii(
                    topLeading: radius,
                    bottomLeading: radius,
                    bottomTrailing: smallRadius,
                    topTrailing: radius
                )
            )
        } else {
            // Buyer: small bottom-left corner
            path.addRoundedRect(
                in: rect,
                cornerRadii: RectangleCornerRadii(
                    topLeading: radius,
                    bottomLeading: smallRadius,
                    bottomTrailing: radius,
                    topTrailing: radius
                )
            )
        }

        return path
    }
}
