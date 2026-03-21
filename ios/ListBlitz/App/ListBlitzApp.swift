import SwiftUI

@main
struct ListBlitzApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            if appState.isCheckingAuth {
                LaunchScreen()
            } else if appState.isAuthenticated {
                MainTabView()
                    .transition(.opacity)
            } else {
                LoginView()
                    .transition(.move(edge: .bottom))
            }
        }
        .animation(.smooth(duration: 0.3), value: appState.isAuthenticated)
        .animation(.smooth(duration: 0.3), value: appState.isCheckingAuth)
        .task {
            await appState.checkAuth()
        }
    }
}

struct LaunchScreen: View {
    @State private var progress: Double = 0
    @State private var currentStep = "Initializing..."

    private let steps = [
        "Loading Dashboard...",
        "Connecting Platforms...",
        "Starting AI Engine...",
        "Syncing Inventory...",
        "Ready!"
    ]

    var body: some View {
        ZStack {
            Theme.backgroundPrimary.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundStyle(Theme.accent)
                        .symbolEffect(.pulse, options: .repeating)

                    Text("ListBlitz")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text("List once, sell everywhere")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                VStack(spacing: 16) {
                    ProgressView(value: progress)
                        .tint(Theme.accent)
                        .scaleEffect(y: 2)

                    Text(currentStep)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                }
                .padding(.horizontal, 48)
                .padding(.bottom, 60)
            }
        }
        .task {
            for (index, step) in steps.enumerated() {
                try? await Task.sleep(for: .milliseconds(200))
                withAnimation(.easeInOut(duration: 0.2)) {
                    currentStep = step
                    progress = Double(index + 1) / Double(steps.count)
                }
            }
        }
    }
}
