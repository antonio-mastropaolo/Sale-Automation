import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    var message: String? = nil
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Theme.textTertiary)
                .symbolEffect(.pulse, options: .repeating.speed(0.5))

            Text(title)
                .font(.headline)
                .foregroundStyle(Theme.textSecondary)

            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Theme.accent)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

struct ErrorView: View {
    let error: Error
    var retryAction: (() async -> Void)? = nil

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.warning)

            Text("Something went wrong")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(Theme.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            if let retryAction {
                Button {
                    Task { await retryAction() }
                } label: {
                    Label("Retry", systemImage: "arrow.clockwise")
                        .font(.subheadline.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Theme.accent)
                        .clipShape(Capsule())
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    EmptyStateView(
        icon: "tag.slash",
        title: "No Listings Yet",
        message: "Create your first listing to get started",
        actionTitle: "Create Listing"
    ) {}
    .background(Theme.backgroundPrimary)
}
