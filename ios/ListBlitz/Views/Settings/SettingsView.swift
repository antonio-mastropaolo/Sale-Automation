import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var connectedPlatforms: [ConnectedPlatform] = []
    @State private var isLoading = true

    private let api = APIClient.shared

    var body: some View {
        List {
            // Account
            Section("Account") {
                HStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(Theme.accent.opacity(0.2))
                            .frame(width: 50, height: 50)

                        Text(appState.currentUser?.initials ?? "?")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.accent)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(appState.currentUser?.displayName ?? "User")
                            .font(.headline)
                            .foregroundStyle(Theme.textPrimary)
                        Text(appState.currentUser?.email ?? "")
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                    }
                }
                .padding(.vertical, 4)
                .listRowBackground(Theme.backgroundCard)
            }

            // Connected Platforms
            Section("Connected Platforms") {
                NavigationLink {
                    ConnectedPlatformsView()
                } label: {
                    HStack {
                        Label("Manage Platforms", systemImage: "link.circle.fill")
                            .foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Text("\(connectedPlatforms.filter { $0.isConnected }.count)/8")
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                    }
                }
            }

            // Tools
            Section("Tools") {
                NavigationLink {
                    AnalyticsView()
                } label: {
                    Label("Analytics", systemImage: "chart.bar.fill")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    RepricerView()
                } label: {
                    Label("Smart Repricer", systemImage: "dollarsign.arrow.trianglehead.counterclockwise.rotate.90")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    OfferBlitzView()
                } label: {
                    Label("Offer Blitz", systemImage: "bolt.horizontal.fill")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    TrendsView()
                } label: {
                    Label("Trends", systemImage: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    CompetitorView()
                } label: {
                    Label("Competitor Analysis", systemImage: "person.2.fill")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    TemplatesView()
                } label: {
                    Label("Templates", systemImage: "doc.on.doc.fill")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    SchedulerView()
                } label: {
                    Label("Scheduler", systemImage: "calendar.badge.clock")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)

                NavigationLink {
                    ShippingView()
                } label: {
                    Label("Shipping Hub", systemImage: "shippingbox.fill")
                        .foregroundStyle(Theme.textPrimary)
                }
                .listRowBackground(Theme.backgroundCard)
            }

            // App Info
            Section("App") {
                LabeledContent("Version", value: "3.0.0")
                    .foregroundStyle(Theme.textSecondary)
                    .listRowBackground(Theme.backgroundCard)

                LabeledContent("Build", value: "1")
                    .foregroundStyle(Theme.textSecondary)
                    .listRowBackground(Theme.backgroundCard)
            }

            // Sign Out
            Section {
                Button(role: .destructive) {
                    HapticEngine.medium()
                    Task { await appState.logout() }
                } label: {
                    HStack {
                        Spacer()
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .font(.subheadline.bold())
                        Spacer()
                    }
                }
                .listRowBackground(Theme.backgroundCard)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Theme.backgroundPrimary)
        .navigationTitle("Settings")
        .task { await loadPlatforms() }
    }

    private func loadPlatforms() async {
        isLoading = true
        do {
            connectedPlatforms = try await api.get("/api/platforms/connect")
        } catch {
            connectedPlatforms = []
        }
        isLoading = false
    }
}

// ConnectedPlatform is now in Models/ConnectedPlatform.swift
