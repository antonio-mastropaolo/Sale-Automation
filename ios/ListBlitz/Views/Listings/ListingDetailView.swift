import SwiftUI

struct ListingDetailView: View {
    let listing: Listing
    @State private var fullListing: Listing?
    @State private var isOptimizing = false
    @State private var showOptimizeSheet = false
    @State private var optimizations: [PlatformOptimization] = []
    @State private var isPublishing = false
    @State private var publishError: String?
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var currentImagePage = 0

    @Environment(\.dismiss) private var dismiss
    private let api = APIClient.shared

    private var display: Listing { fullListing ?? listing }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                // Full-width Image Gallery with page dots
                imageGallery

                // Price & Status
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(display.title)
                                .font(.title2.bold())
                                .foregroundStyle(Theme.textPrimary)

                            HStack(spacing: 8) {
                                StatusBadge(status: display.status.rawValue)
                                if let brand = display.brand, !brand.isEmpty {
                                    Text(brand)
                                        .font(.caption)
                                        .foregroundStyle(Theme.textTertiary)
                                }
                            }
                        }

                        Spacer()

                        Text(display.formattedPrice)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.accent)
                    }
                }
                .padding(.horizontal)

                // Details Section
                detailsSection

                // Platform Listings
                platformsSection

                // Actions
                actionsSection

                // Danger Zone
                if display.status != .sold {
                    dangerZone
                }
            }
            .padding(.bottom, 40)
        }
        .background(Theme.backgroundPrimary)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showOptimizeSheet) {
            OptimizeSheet(listing: display, optimizations: optimizations)
        }
        .alert("Delete Listing", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) { deleteListing() }
        } message: {
            Text("This action cannot be undone.")
        }
        .task { await loadDetail() }
    }

    // MARK: - Image Gallery

    private var imageGallery: some View {
        TabView(selection: $currentImagePage) {
            if let images = display.images, !images.isEmpty {
                ForEach(Array(images.sorted(by: { ($0.order ?? 0) < ($1.order ?? 0) }).enumerated()), id: \.element.id) { index, image in
                    AsyncListingImage(path: image.path)
                        .aspectRatio(1, contentMode: .fill)
                        .clipped()
                        .tag(index)
                }
            } else {
                ZStack {
                    Theme.backgroundCard
                    Image(systemName: "photo")
                        .font(.system(size: 48))
                        .foregroundStyle(Theme.textTertiary)
                }
                .tag(0)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .automatic))
        .frame(height: UIScreen.main.bounds.width)
    }

    // MARK: - Details

    private var detailsSection: some View {
        VStack(spacing: 0) {
            DetailCardRow(label: "Brand", value: display.brand)
            DetailCardRow(label: "Category", value: display.category)
            DetailCardRow(label: "Size", value: display.size)
            DetailCardRow(label: "Condition", value: display.condition)

            if let costPrice = display.costPrice {
                DetailCardRow(label: "Cost", value: "$\(String(format: "%.0f", costPrice))")
            }

            if let profit = display.profit {
                DetailCardRow(
                    label: "Profit",
                    value: "$\(String(format: "%.0f", profit))",
                    valueColor: profit >= 0 ? Theme.success : Theme.error,
                    isLast: display.description == nil || display.description!.isEmpty
                )
            }

            if let desc = display.description, !desc.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Description")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)

                    Text(desc)
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
            }
        }
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
        .padding(.horizontal)
    }

    // MARK: - Platform Listings

    private var platformsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Platforms")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
                .padding(.horizontal)

            if let platforms = display.platformListings, !platforms.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(platforms.enumerated()), id: \.element.id) { index, pl in
                        HStack(spacing: 12) {
                            PlatformIcon(platform: pl.platform, size: 36)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(pl.platform.capitalized)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(Theme.textPrimary)

                                Text(pl.optimizedTitle ?? display.title)
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            StatusBadge(status: pl.status ?? "draft")
                        }
                        .padding(12)

                        if index < platforms.count - 1 {
                            Divider()
                                .background(Theme.textTertiary.opacity(0.3))
                                .padding(.leading, 60)
                        }
                    }
                }
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
                .padding(.horizontal)
            } else {
                Text("Not published to any platform yet")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            }
        }
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: 10) {
            // Optimize with AI - gradient button
            Button {
                HapticEngine.medium()
                optimizeWithAI()
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                        .symbolEffect(.bounce, options: .repeating.speed(0.3))
                    Text(isOptimizing ? "Optimizing..." : "Optimize with AI")
                }
                .font(.subheadline.bold())
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Theme.accentGradient)
                .foregroundStyle(.black)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
            }
            .disabled(isOptimizing)

            // Publish - outline style
            if display.status == .draft || display.status == .active {
                Button {
                    HapticEngine.medium()
                    publishListing()
                } label: {
                    HStack {
                        Image(systemName: "paperplane.fill")
                        Text(isPublishing ? "Publishing..." : "Publish to Platforms")
                    }
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.clear)
                    .foregroundStyle(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                            .stroke(Theme.accent.opacity(0.4), lineWidth: 1.5)
                    )
                }
                .disabled(isPublishing)
            }

            if let publishError {
                Text(publishError)
                    .font(.caption)
                    .foregroundStyle(Theme.error)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Danger Zone

    private var dangerZone: some View {
        Button(role: .destructive) {
            HapticEngine.warning()
            showDeleteConfirm = true
        } label: {
            HStack {
                Image(systemName: "trash")
                Text("Delete Listing")
            }
            .font(.subheadline.bold())
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Theme.error.opacity(0.1))
            .foregroundStyle(Theme.error)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        }
        .padding(.horizontal)
    }

    // MARK: - Actions

    private func loadDetail() async {
        do {
            fullListing = try await api.get("/api/listings/\(listing.id)", skipCache: true)
        } catch {}
    }

    private func optimizeWithAI() {
        isOptimizing = true
        Task {
            do {
                let response: OptimizeResponse = try await api.post(
                    "/api/listings/\(display.id)/optimize",
                    body: ["platforms": ["depop", "grailed", "poshmark", "ebay"]]
                )
                optimizations = response.optimized ?? []
                showOptimizeSheet = true
                HapticEngine.success()
            } catch {
                HapticEngine.error()
            }
            isOptimizing = false
        }
    }

    private func publishListing() {
        isPublishing = true
        publishError = nil
        Task {
            do {
                let _: [String: String] = try await api.post(
                    "/api/listings/\(display.id)/publish",
                    body: ["platform": "depop"]
                )
                HapticEngine.success()
                await loadDetail()
            } catch {
                publishError = error.localizedDescription
                HapticEngine.error()
            }
            isPublishing = false
        }
    }

    private func deleteListing() {
        isDeleting = true
        Task {
            do {
                try await api.delete("/api/listings/\(display.id)")
                HapticEngine.success()
                dismiss()
            } catch {
                HapticEngine.error()
            }
            isDeleting = false
        }
    }
}

// MARK: - Detail Card Row

struct DetailCardRow: View {
    let label: String
    let value: String?
    var valueColor: Color = Theme.textPrimary
    var isLast: Bool = false

    var body: some View {
        if let value, !value.isEmpty {
            VStack(spacing: 0) {
                HStack {
                    Text(label)
                        .font(.subheadline)
                        .foregroundStyle(Theme.textTertiary)
                    Spacer()
                    Text(value)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(valueColor)
                }
                .padding(14)

                if !isLast {
                    Divider()
                        .background(Theme.textTertiary.opacity(0.3))
                }
            }
        }
    }
}

// MARK: - Optimize Sheet

struct OptimizeSheet: View {
    let listing: Listing
    let optimizations: [PlatformOptimization]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(optimizations) { opt in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                PlatformIcon(platform: opt.platform, size: 32)
                                Text(opt.platform.capitalized)
                                    .font(.headline)
                                    .foregroundStyle(Theme.textPrimary)
                                Spacer()
                                if let price = opt.suggestedPrice {
                                    Text("$\(String(format: "%.0f", price))")
                                        .font(.headline.bold())
                                        .foregroundStyle(Theme.accent)
                                }
                            }

                            if let title = opt.title {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Title")
                                        .font(.caption)
                                        .foregroundStyle(Theme.textTertiary)
                                    Text(title)
                                        .font(.subheadline)
                                        .foregroundStyle(Theme.textPrimary)
                                }
                            }

                            if let desc = opt.description {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Description")
                                        .font(.caption)
                                        .foregroundStyle(Theme.textTertiary)
                                    Text(desc)
                                        .font(.caption)
                                        .foregroundStyle(Theme.textSecondary)
                                        .lineLimit(5)
                                }
                            }

                            if let tags = opt.hashtags, !tags.isEmpty {
                                FlowLayout(spacing: 4) {
                                    ForEach(tags, id: \.self) { tag in
                                        Text("#\(tag)")
                                            .font(.caption2)
                                            .foregroundStyle(Theme.accent)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 3)
                                            .background(Theme.accent.opacity(0.1))
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                        .cardStyle()
                    }
                }
                .padding()
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("AI Optimizations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (positions, CGSize(width: maxX, height: y + rowHeight))
    }
}
