import SwiftUI

struct ListingsView: View {
    @State private var listings: [Listing] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var selectedFilter: ListingStatus? = nil
    @State private var searchText = ""
    @State private var showCreateListing = false
    @State private var showSmartList = false
    @State private var sortOrder: SortOrder = .newest
    @State private var listingToDelete: Listing?
    @State private var showDeleteConfirm = false

    private let api = APIClient.shared

    enum SortOrder: String, CaseIterable {
        case newest = "Newest"
        case oldest = "Oldest"
        case priceHigh = "Price: High"
        case priceLow = "Price: Low"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filter Chips
            filterBar

            // Content
            if isLoading {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(0..<8, id: \.self) { _ in SkeletonListingCard() }
                    }
                    .padding(.horizontal)
                }
            } else if let error {
                ErrorView(error: error) { await loadListings() }
            } else if filteredListings.isEmpty {
                EmptyStateView(
                    icon: "tag.slash",
                    title: selectedFilter == nil ? "No Listings" : "No \(selectedFilter!.displayName) Listings",
                    message: "Create your first listing to get started",
                    actionTitle: "Create Listing"
                ) { showCreateListing = true }
            } else {
                List {
                    ForEach(filteredListings) { listing in
                        NavigationLink(value: listing) {
                            ListingRowView(listing: listing)
                        }
                        .listRowBackground(Theme.backgroundCard)
                        .listRowSeparatorTint(Theme.textTertiary.opacity(0.3))
                        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                listingToDelete = listing
                                showDeleteConfirm = true
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            .tint(Theme.error)
                        }
                        .swipeActions(edge: .leading, allowsFullSwipe: true) {
                            if listing.status == .draft || listing.status == .active {
                                Button {
                                    HapticEngine.medium()
                                    publishListing(listing)
                                } label: {
                                    Label("Publish", systemImage: "paperplane.fill")
                                }
                                .tint(Theme.accent)
                            }

                            Button {
                                HapticEngine.light()
                                optimizeListing(listing)
                            } label: {
                                Label("AI Optimize", systemImage: "sparkles")
                            }
                            .tint(Theme.iosBlue)
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .alert("Delete Listing", isPresented: $showDeleteConfirm) {
                    Button("Cancel", role: .cancel) {}
                    Button("Delete", role: .destructive) {
                        if let listing = listingToDelete {
                            deleteListing(listing)
                        }
                    }
                } message: {
                    Text("Are you sure? This cannot be undone.")
                }
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Listings")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search listings...")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        HapticEngine.medium()
                        showSmartList = true
                    } label: {
                        Label("Smart List (AI)", systemImage: "camera.fill")
                    }
                    Button {
                        HapticEngine.light()
                        showCreateListing = true
                    } label: {
                        Label("Manual Listing", systemImage: "square.and.pencil")
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Theme.accent)
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    ForEach(SortOrder.allCases, id: \.self) { order in
                        Button {
                            sortOrder = order
                            HapticEngine.selection()
                        } label: {
                            Label(order.rawValue, systemImage: sortOrder == order ? "checkmark" : "")
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down.circle")
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
        }
        .sheet(isPresented: $showCreateListing) {
            CreateListingView { await loadListings() }
        }
        .sheet(isPresented: $showSmartList) {
            SmartListView { await loadListings() }
        }
        .refreshable { await loadListings() }
        .task { await loadListings() }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "All", isSelected: selectedFilter == nil) {
                    selectedFilter = nil
                }

                ForEach(ListingStatus.allCases, id: \.self) { status in
                    FilterChip(
                        title: status.displayName,
                        isSelected: selectedFilter == status,
                        count: listings.filter { $0.status == status }.count
                    ) {
                        selectedFilter = status
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
    }

    // MARK: - Computed

    private var filteredListings: [Listing] {
        var result = listings

        if let filter = selectedFilter {
            result = result.filter { $0.status == filter }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(query) ||
                ($0.brand?.lowercased().contains(query) ?? false) ||
                ($0.category?.lowercased().contains(query) ?? false)
            }
        }

        switch sortOrder {
        case .newest: result.sort { ($0.updatedAt ?? "") > ($1.updatedAt ?? "") }
        case .oldest: result.sort { ($0.updatedAt ?? "") < ($1.updatedAt ?? "") }
        case .priceHigh: result.sort { ($0.price ?? 0) > ($1.price ?? 0) }
        case .priceLow: result.sort { ($0.price ?? 0) < ($1.price ?? 0) }
        }

        return result
    }

    // MARK: - Load

    private func loadListings() async {
        isLoading = listings.isEmpty
        do {
            listings = try await api.get("/api/listings", skipCache: true)
            error = nil
        } catch {
            self.error = error
        }
        isLoading = false
    }

    private func deleteListing(_ listing: Listing) {
        Task {
            do {
                try await api.delete("/api/listings/\(listing.id)")
                withAnimation(.spring(response: 0.3)) {
                    listings.removeAll { $0.id == listing.id }
                }
                HapticEngine.success()
            } catch {
                HapticEngine.error()
            }
        }
    }

    private func publishListing(_ listing: Listing) {
        Task {
            do {
                let _: [String: String] = try await api.post(
                    "/api/listings/\(listing.id)/publish",
                    body: ["platform": "depop"]
                )
                HapticEngine.success()
                await loadListings()
            } catch {
                HapticEngine.error()
            }
        }
    }

    private func optimizeListing(_ listing: Listing) {
        Task {
            do {
                let _: OptimizeResponse = try await api.post(
                    "/api/listings/\(listing.id)/optimize",
                    body: ["platforms": ["depop", "grailed", "poshmark", "ebay"]]
                )
                HapticEngine.success()
                await loadListings()
            } catch {
                HapticEngine.error()
            }
        }
    }
}

// MARK: - Listing Row (flush card style)

struct ListingRowView: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 12) {
            // 64x64 image
            AsyncListingImage(path: listing.primaryImagePath)
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))

            // Title / meta / badges
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

            // Price / profit
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
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var count: Int? = nil
    let action: () -> Void

    var body: some View {
        Button {
            HapticEngine.selection()
            action()
        } label: {
            HStack(spacing: 4) {
                Text(title)
                    .font(.caption.bold())

                if let count, count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(isSelected ? .black.opacity(0.2) : Theme.accent.opacity(0.2))
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isSelected ? .black : Theme.textSecondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Theme.accent : Theme.backgroundElevated)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
