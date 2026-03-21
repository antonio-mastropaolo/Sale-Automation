import SwiftUI

struct LoadingView: View {
    var message: String = "Loading..."

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .controlSize(.large)
                .tint(Theme.accent)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct InlineLoader: View {
    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
                .tint(Theme.accent)
            Text("Loading...")
                .font(.caption)
                .foregroundStyle(Theme.textTertiary)
        }
    }
}

// MARK: - Skeleton Placeholders

struct SkeletonListingCard: View {
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Theme.backgroundElevated)
                .frame(width: 72, height: 72)

            VStack(alignment: .leading, spacing: 8) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.backgroundElevated)
                    .frame(height: 14)
                    .frame(maxWidth: 160)

                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.backgroundElevated)
                    .frame(height: 10)
                    .frame(maxWidth: 100)

                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.backgroundElevated)
                        .frame(width: 50, height: 18)
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.backgroundElevated)
                        .frame(width: 36, height: 18)
                }
            }

            Spacer()

            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.backgroundElevated)
                .frame(width: 50, height: 20)
        }
        .padding(12)
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        .shimmering()
    }
}

struct SkeletonStatCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.backgroundElevated)
                .frame(height: 10)
                .frame(maxWidth: 80)

            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.backgroundElevated)
                .frame(height: 28)
                .frame(maxWidth: 100)
        }
        .cardStyle()
        .shimmering()
    }
}
