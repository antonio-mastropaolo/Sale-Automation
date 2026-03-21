import SwiftUI
import Observation

@Observable
final class AppState {
    var currentUser: User?
    var isAuthenticated = false
    var isCheckingAuth = true
    var selectedTab: AppTab = .dashboard
    var unreadMessages = 0
    var pendingOffers = 0
    var networkStatus: NetworkStatus = .connected

    private let authService = AuthService.shared
    private let api = APIClient.shared

    enum NetworkStatus {
        case connected, offline, checking
    }

    func checkAuth() async {
        isCheckingAuth = true
        defer { isCheckingAuth = false }

        guard KeychainHelper.get(key: "session_token") != nil else {
            isAuthenticated = false
            return
        }

        do {
            let user = try await authService.me()
            self.currentUser = user
            self.isAuthenticated = true
            await loadInitialData()
        } catch {
            isAuthenticated = false
            KeychainHelper.delete(key: "session_token")
        }
    }

    func login(email: String, password: String) async throws {
        let user = try await authService.login(email: email, password: password)
        self.currentUser = user
        withAnimation(.smooth) {
            self.isAuthenticated = true
        }
        HapticEngine.success()
        await loadInitialData()
    }

    func register(email: String, username: String, password: String) async throws {
        let user = try await authService.register(email: email, username: username, password: password)
        self.currentUser = user
        withAnimation(.smooth) {
            self.isAuthenticated = true
        }
        HapticEngine.success()
    }

    func logout() async {
        try? await authService.logout()
        KeychainHelper.delete(key: "session_token")
        CacheManager.shared.clearAll()
        withAnimation(.smooth) {
            currentUser = nil
            isAuthenticated = false
            selectedTab = .dashboard
        }
        HapticEngine.medium()
    }

    private func loadInitialData() async {
        async let messages: () = loadUnreadCount()
        _ = await (messages)
    }

    private func loadUnreadCount() async {
        do {
            let response: InboxResponse = try await api.get("/api/inbox")
            unreadMessages = response.unreadCount ?? response.conversations.filter { $0.unread }.count
        } catch {
            unreadMessages = 0
        }
    }
}

enum AppTab: String, CaseIterable {
    case dashboard = "Dashboard"
    case listings = "Listings"
    case search = "Search"
    case inbox = "Inbox"
    case pulse = "Pulse"

    var icon: String {
        switch self {
        case .dashboard: "square.grid.2x2.fill"
        case .listings: "tag.fill"
        case .search: "magnifyingglass"
        case .inbox: "bubble.left.and.bubble.right.fill"
        case .pulse: "waveform.path.ecg"
        }
    }
}
