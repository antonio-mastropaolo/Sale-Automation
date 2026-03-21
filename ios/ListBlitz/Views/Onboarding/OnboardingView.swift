import SwiftUI

struct OnboardingView: View {
    @State private var currentStep = 0
    @State private var connectedPlatforms: Set<String> = []
    @State private var selectedAIProvider = "openai"
    @State private var isCompleting = false

    private let api = APIClient.shared
    let onComplete: () -> Void

    private let totalSteps = 4

    var body: some View {
        ZStack {
            Theme.backgroundPrimary
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Page indicator dots
                HStack(spacing: 8) {
                    ForEach(0..<totalSteps, id: \.self) { index in
                        Capsule()
                            .fill(index == currentStep ? Theme.accent : Theme.backgroundElevated)
                            .frame(width: index == currentStep ? 24 : 8, height: 8)
                            .animation(.smooth, value: currentStep)
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 16)

                // Content
                TabView(selection: $currentStep) {
                    welcomeStep.tag(0)
                    platformsStep.tag(1)
                    aiSetupStep.tag(2)
                    celebrationStep.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.smooth, value: currentStep)

                // Navigation buttons
                bottomButtons
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
            }
        }
    }

    // MARK: - Step 1: Welcome

    private var welcomeStep: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.accent.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "bolt.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(Theme.accent)
                    .symbolEffect(.bounce, options: .repeating.speed(0.3))
            }

            VStack(spacing: 12) {
                Text("Welcome to ListBlitz")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)
                    .multilineTextAlignment(.center)

                Text("The AI-powered reselling platform\nthat helps you list faster, sell smarter.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Step 2: Connect Platforms

    private var platformsStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Connect Platforms")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)

                Text("Select the platforms you sell on")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.top, 24)

            let platforms = [
                ("depop", "Depop"),
                ("grailed", "Grailed"),
                ("poshmark", "Poshmark"),
                ("ebay", "eBay"),
                ("mercari", "Mercari"),
                ("vinted", "Vinted"),
                ("facebook", "Facebook Marketplace"),
                ("vestiaire", "Vestiaire Collective")
            ]

            ScrollView {
                VStack(spacing: 2) {
                    ForEach(platforms, id: \.0) { key, name in
                        Button {
                            HapticEngine.selection()
                            if connectedPlatforms.contains(key) {
                                connectedPlatforms.remove(key)
                            } else {
                                connectedPlatforms.insert(key)
                            }
                        } label: {
                            HStack(spacing: 12) {
                                PlatformIcon(platform: key, size: 36)

                                Text(name)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(Theme.textPrimary)

                                Spacer()

                                ZStack {
                                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                                        .fill(connectedPlatforms.contains(key) ? Theme.accent : Theme.backgroundElevated)
                                        .frame(width: 28, height: 28)

                                    if connectedPlatforms.contains(key) {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
                .padding(.horizontal, 24)
            }

            if !connectedPlatforms.isEmpty {
                Text("\(connectedPlatforms.count) platform\(connectedPlatforms.count == 1 ? "" : "s") selected")
                    .font(.caption)
                    .foregroundStyle(Theme.accent)
            }
        }
    }

    // MARK: - Step 3: AI Setup

    private var aiSetupStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("AI Setup")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)

                Text("Choose your preferred AI provider")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.top, 24)

            let providers = [
                ("openai", "OpenAI GPT-4", "brain.fill", "Best for listing descriptions and market analysis", Theme.iosGreen),
                ("anthropic", "Anthropic Claude", "sparkles", "Excellent for detailed, nuanced copy", Theme.iosPurple),
                ("auto", "Auto (Recommended)", "wand.and.stars", "ListBlitz picks the best model per task", Theme.accent)
            ]

            VStack(spacing: 10) {
                ForEach(providers, id: \.0) { key, name, icon, description, color in
                    Button {
                        HapticEngine.selection()
                        selectedAIProvider = key
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: icon)
                                .font(.title3)
                                .foregroundStyle(color)
                                .frame(width: 40, height: 40)
                                .background(color.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(name)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Theme.textPrimary)

                                Text(description)
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            Image(systemName: selectedAIProvider == key ? "checkmark.circle.fill" : "circle")
                                .font(.title3)
                                .foregroundStyle(selectedAIProvider == key ? Theme.accent : Theme.textTertiary)
                        }
                        .padding(14)
                        .background(Theme.backgroundCard)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                                .stroke(selectedAIProvider == key ? Theme.accent.opacity(0.5) : .clear, lineWidth: 1.5)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    // MARK: - Step 4: Celebration

    private var celebrationStep: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.accent.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(Theme.accent)
                    .symbolEffect(.bounce, options: .repeating.speed(0.3))
            }

            VStack(spacing: 12) {
                Text("You're All Set!")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)
                    .multilineTextAlignment(.center)

                Text("Start listing your items and let\nAI do the heavy lifting.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }

            VStack(spacing: 8) {
                if !connectedPlatforms.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(Array(connectedPlatforms).sorted(), id: \.self) { platform in
                            PlatformIcon(platform: platform, size: 28)
                        }
                    }
                    Text("\(connectedPlatforms.count) platform\(connectedPlatforms.count == 1 ? "" : "s") connected")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                }
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        VStack(spacing: 12) {
            Button {
                handleNext()
            } label: {
                HStack {
                    if isCompleting {
                        ProgressView()
                            .controlSize(.small)
                            .tint(.white)
                    } else {
                        Text(currentStep == totalSteps - 1 ? "Get Started" : "Next")
                            .fontWeight(.semibold)
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Theme.accentGradient)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
            }
            .disabled(isCompleting)

            if currentStep > 0 && currentStep < totalSteps - 1 {
                Button {
                    HapticEngine.light()
                    withAnimation(.smooth) {
                        currentStep += 1
                    }
                } label: {
                    Text("Skip")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
    }

    // MARK: - Actions

    private func handleNext() {
        HapticEngine.medium()
        if currentStep < totalSteps - 1 {
            withAnimation(.smooth) {
                currentStep += 1
            }
        } else {
            completeOnboarding()
        }
    }

    private func completeOnboarding() {
        isCompleting = true
        Task {
            do {
                let body = OnboardingRequest(
                    platforms: Array(connectedPlatforms),
                    aiProvider: selectedAIProvider
                )
                try await api.postRaw("/api/auth/onboard", body: body)
                HapticEngine.success()
            } catch {
                // Complete anyway even if API fails
            }
            await MainActor.run {
                isCompleting = false
                onComplete()
            }
        }
    }
}

// MARK: - Models

private struct OnboardingRequest: Encodable {
    let platforms: [String]
    let aiProvider: String
}

#Preview {
    OnboardingView {
        print("Onboarding complete")
    }
}
