import SwiftUI

struct ConnectedPlatformsView: View {
    @State private var platforms: [ConnectedPlatform] = []
    @State private var isLoading = true
    @State private var selectedPlatform: PlatformAuthConfig?
    @State private var testingPlatform: String?
    @State private var testResult: (platform: String, success: Bool)?

    private let authService = PlatformAuthService.shared

    var body: some View {
        List {
            Section {
                ForEach(PlatformAuthConfigs.all, id: \.platform) { config in
                    let connected = platforms.first { $0.platform == config.platform }
                    let isConnected = connected?.isConnected ?? false

                    HStack(spacing: 14) {
                        PlatformIcon(platform: config.platform, size: 40)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(config.displayName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Theme.textPrimary)

                            if isConnected {
                                HStack(spacing: 4) {
                                    if let username = connected?.username, !username.isEmpty {
                                        Text(username)
                                            .font(.caption)
                                            .foregroundStyle(Theme.textTertiary)
                                    }
                                    Text("via \(connected?.authMethodDisplay ?? "Credentials")")
                                        .font(.caption)
                                        .foregroundStyle(Theme.textTertiary)
                                }
                            } else {
                                Text("Not connected")
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                            }
                        }

                        Spacer()

                        if testingPlatform == config.platform {
                            ProgressView().controlSize(.small)
                        } else if let result = testResult, result.platform == config.platform {
                            Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(result.success ? Theme.success : Theme.error)
                        } else if isConnected {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Theme.success)
                        }

                        Button {
                            HapticEngine.light()
                            selectedPlatform = config
                        } label: {
                            Text(isConnected ? "Manage" : "Connect")
                                .font(.caption.bold())
                                .foregroundStyle(isConnected ? Theme.textSecondary : .black)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(isConnected ? Theme.backgroundElevated : Theme.accent)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    .listRowBackground(Theme.backgroundCard)
                    .swipeActions(edge: .trailing) {
                        if isConnected {
                            Button(role: .destructive) {
                                disconnect(config.platform)
                            } label: {
                                Label("Disconnect", systemImage: "wifi.slash")
                            }
                        }
                    }
                    .swipeActions(edge: .leading) {
                        if isConnected {
                            Button {
                                testConnection(config.platform)
                            } label: {
                                Label("Test", systemImage: "antenna.radiowaves.left.and.right")
                            }
                            .tint(Theme.iosBlue)
                        }
                    }
                }
            } header: {
                Text("\(platforms.filter { $0.isConnected }.count) of \(PlatformAuthConfigs.all.count) connected")
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Theme.backgroundPrimary)
        .navigationTitle("Platforms")
        .sheet(item: $selectedPlatform) { config in
            PlatformLoginView(config: config) { _ in
                Task { await loadPlatforms() }
            }
        }
        .refreshable { await loadPlatforms() }
        .task { await loadPlatforms() }
    }

    private func loadPlatforms() async {
        isLoading = true
        do {
            platforms = try await authService.getConnectedPlatforms()
        } catch {
            platforms = []
        }
        isLoading = false
    }

    private func disconnect(_ platform: String) {
        Task {
            do {
                try await authService.disconnect(platform: platform)
                HapticEngine.success()
                await loadPlatforms()
            } catch {
                HapticEngine.error()
            }
        }
    }

    private func testConnection(_ platform: String) {
        testingPlatform = platform
        testResult = nil
        Task {
            do {
                let success = try await authService.testConnection(platform: platform)
                testResult = (platform, success)
                HapticEngine.success()
            } catch {
                testResult = (platform, false)
                HapticEngine.error()
            }
            testingPlatform = nil
        }
    }
}

// Make PlatformAuthConfig identifiable for sheet
extension PlatformAuthConfig: Identifiable {
    var id: String { platform }
}
