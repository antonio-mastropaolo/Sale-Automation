import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        TabView(selection: $state.selectedTab) {
            Tab(AppTab.dashboard.rawValue, systemImage: AppTab.dashboard.icon, value: .dashboard) {
                NavigationStack {
                    DashboardView()
                }
            }

            Tab(AppTab.listings.rawValue, systemImage: AppTab.listings.icon, value: .listings) {
                NavigationStack {
                    ListingsView()
                }
            }

            Tab(AppTab.search.rawValue, systemImage: AppTab.search.icon, value: .search) {
                NavigationStack {
                    CrossMarketSearchView()
                }
            }

            Tab(value: .inbox) {
                NavigationStack {
                    InboxView()
                }
            } label: {
                Label(AppTab.inbox.rawValue, systemImage: AppTab.inbox.icon)
            }
            .badge(appState.unreadMessages)

            Tab(AppTab.pulse.rawValue, systemImage: AppTab.pulse.icon, value: .pulse) {
                NavigationStack {
                    LivePulseView()
                }
            }
        }
        .tint(Theme.accent)
    }
}
