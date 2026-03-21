import SwiftUI

struct ListingCard: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 12) {
            // Image
            AsyncListingImage(path: listing.primaryImagePath)
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(listing.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let brand = listing.brand, !brand.isEmpty {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    if let size = listing.size, !size.isEmpty {
                        Text("·")
                            .foregroundStyle(Theme.textTertiary)
                        Text(size)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                HStack(spacing: 6) {
                    StatusBadge(status: listing.status.rawValue)

                    if let platforms = listing.platformListings, !platforms.isEmpty {
                        ForEach(platforms.prefix(3), id: \.id) { pl in
                            PlatformBadge(platform: pl.platform, compact: true)
                        }
                    }
                }
            }

            Spacer()

            // Price
            VStack(alignment: .trailing, spacing: 4) {
                Text(listing.formattedPrice)
                    .font(.system(.body, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.accent)

                if let profit = listing.profit {
                    Text(profit >= 0 ? "+$\(String(format: "%.0f", profit))" : "-$\(String(format: "%.0f", abs(profit)))")
                        .font(.caption2.bold())
                        .foregroundStyle(profit >= 0 ? Theme.success : Theme.error)
                }
            }
        }
        .padding(12)
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
    }
}

struct AsyncListingImage: View {
    let path: String?
    var placeholder: String = "photo"

    var body: some View {
        if let path, let url = imageURL(path) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    imagePlaceholder
                case .empty:
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Theme.backgroundElevated)
                @unknown default:
                    imagePlaceholder
                }
            }
        } else {
            imagePlaceholder
        }
    }

    private var imagePlaceholder: some View {
        ZStack {
            Theme.backgroundElevated
            Image(systemName: placeholder)
                .font(.title3)
                .foregroundStyle(Theme.textTertiary)
        }
    }

    private func imageURL(_ path: String) -> URL? {
        if path.hasPrefix("http") {
            return URL(string: path)
        }
        // Relative path — prefix with API base
        #if DEBUG
        return URL(string: "http://localhost:3000\(path)")
        #else
        return URL(string: "https://your-listblitz-domain.vercel.app\(path)")
        #endif
    }
}

struct CompactListingCard: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 10) {
            AsyncListingImage(path: listing.primaryImagePath)
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(listing.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                Text(listing.formattedPrice)
                    .font(.caption2.bold())
                    .foregroundStyle(Theme.accent)
            }

            Spacer()

            StatusBadge(status: listing.status.rawValue)
        }
    }
}
