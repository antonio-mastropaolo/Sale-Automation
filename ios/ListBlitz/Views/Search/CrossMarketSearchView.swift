import SwiftUI

struct CrossMarketSearchView: View {
    @State private var query = ""
    @State private var results: [SearchResult] = []
    @State private var isSearching = false
    @State private var hasSearched = false
    @State private var error: Error?
    @State private var selectedPlatform: String? = nil

    private let api = APIClient.shared
    private let platforms = ["All", "Depop", "Grailed", "Poshmark", "Mercari", "eBay", "Vinted"]

    var body: some View {
        VStack(spacing: 0) {
            // Platform Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(platforms, id: \.self) { platform in
                        FilterChip(
                            title: platform,
                            isSelected: (platform == "All" && selectedPlatform == nil) || selectedPlatform == platform.lowercased()
                        ) {
                            selectedPlatform = platform == "All" ? nil : platform.lowercased()
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }

            // Content
            if isSearching {
                LoadingView(message: "Searching across platforms...")
            } else if let error {
                ErrorView(error: error) { await search() }
            } else if !hasSearched {
                searchPrompt
            } else if filteredResults.isEmpty {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "No Results",
                    message: "Try a different search term or platform"
                )
            } else {
                resultsGrid
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Search")
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search across marketplaces...")
        .onSubmit(of: .search) {
            Task { await search() }
        }
    }

    // MARK: - Search Prompt

    private var searchPrompt: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "globe.americas.fill")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent.opacity(0.5))
                .symbolEffect(.pulse, options: .repeating.speed(0.3))

            VStack(spacing: 8) {
                Text("Cross-Market Search")
                    .font(.title3.bold())
                    .foregroundStyle(Theme.textPrimary)

                Text("Search across Depop, Grailed, Poshmark,\nMercari, eBay, Vinted & more")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
            }

            // Popular Searches as pills
            VStack(alignment: .leading, spacing: 10) {
                Text("Popular Searches")
                    .font(.caption.bold())
                    .foregroundStyle(Theme.textTertiary)

                FlowLayout(spacing: 8) {
                    ForEach(["Vintage Nike", "Y2K", "Archive Raf", "Carhartt WIP", "Stussy", "Jordan 1"], id: \.self) { term in
                        Button {
                            HapticEngine.light()
                            query = term
                            Task { await search() }
                        } label: {
                            Text(term)
                                .font(.caption)
                                .foregroundStyle(Theme.textSecondary)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(Theme.backgroundElevated)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .padding(.horizontal, 32)
            .padding(.top, 16)

            Spacer()
        }
    }

    // MARK: - Results Grid (2-column, 170pt images)

    private var resultsGrid: some View {
        ScrollView {
            LazyVGrid(columns: [.init(.flexible(), spacing: 10), .init(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(filteredResults, id: \.stableId) { result in
                    SearchResultCard(result: result)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 100)
        }
        .refreshable {
            await search()
        }
    }

    // MARK: - Computed

    private var filteredResults: [SearchResult] {
        guard let platform = selectedPlatform else { return results }
        return results.filter { ($0.platform?.lowercased() ?? "") == platform }
    }

    // MARK: - Search

    private func search() async {
        guard !query.isEmpty else { return }
        isSearching = true
        hasSearched = true
        error = nil
        HapticEngine.light()

        do {
            let response: SearchResponse = try await api.get("/api/search", query: ["q": query], skipCache: true)
            results = response.results ?? []
            HapticEngine.success()
        } catch {
            self.error = error
            HapticEngine.error()
        }
        isSearching = false
    }
}

// MARK: - Search Result Card

struct SearchResultCard: View {
    let result: SearchResult

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image with platform badge overlay
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: URL(string: result.primaryImage ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        ZStack {
                            Theme.backgroundElevated
                            Image(systemName: "photo")
                                .foregroundStyle(Theme.textTertiary)
                        }
                    case .empty:
                        ZStack {
                            Theme.backgroundElevated
                            ProgressView().controlSize(.small)
                        }
                    @unknown default:
                        Theme.backgroundElevated
                    }
                }
                .frame(height: 170)
                .clipped()

                // Platform badge overlay
                if let platform = result.platform {
                    Text(platform.capitalized)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Theme.platformColor(platform).opacity(0.9))
                        .clipShape(Capsule())
                        .padding(6)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(result.title ?? "Untitled")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)

                HStack {
                    Text(result.formattedPrice)
                        .font(.subheadline.bold())
                        .foregroundStyle(Theme.accent)

                    Spacer()

                    if let size = result.size, !size.isEmpty {
                        Text(size)
                            .font(.system(size: 10))
                            .foregroundStyle(Theme.textTertiary)
                    }
                }
            }
            .padding(8)
        }
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
    }
}
