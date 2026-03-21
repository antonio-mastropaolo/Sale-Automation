import SwiftUI

struct SchedulerView: View {
    @State private var scheduledPosts: [ScheduledPost] = []
    @State private var listings: [Listing] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showScheduleSheet = false
    @State private var selectedFilter: String?

    private let api = APIClient.shared

    private let statusFilters = ["pending", "published", "failed", "cancelled"]

    private var filteredPosts: [ScheduledPost] {
        guard let filter = selectedFilter else { return scheduledPosts }
        return scheduledPosts.filter { $0.status == filter }
    }

    private var groupedPosts: [(String, [ScheduledPost])] {
        let grouped = Dictionary(grouping: filteredPosts) { post in
            String(post.scheduledAt.prefix(10))
        }
        return grouped.sorted { $0.key > $1.key }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }
                        ForEach(statusFilters, id: \.self) { status in
                            FilterChip(
                                title: status.capitalized,
                                isSelected: selectedFilter == status,
                                count: scheduledPosts.filter { $0.status == status }.count
                            ) {
                                selectedFilter = status
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }

                if isLoading {
                    LoadingView(message: "Loading schedule...")
                } else if let error {
                    ErrorView(error: error) { await loadData() }
                } else if filteredPosts.isEmpty {
                    EmptyStateView(
                        icon: "calendar.badge.clock",
                        title: "No Scheduled Posts",
                        message: "Schedule listings to be posted automatically",
                        actionTitle: "Schedule Post"
                    ) {
                        HapticEngine.light()
                        showScheduleSheet = true
                    }
                } else {
                    postsList
                }
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Scheduler")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        HapticEngine.light()
                        showScheduleSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .refreshable { await loadData() }
            .task { await loadData() }
            .sheet(isPresented: $showScheduleSheet) {
                SchedulePostSheet(listings: listings) { newPost in
                    withAnimation(.smooth) {
                        scheduledPosts.insert(newPost, at: 0)
                    }
                }
            }
        }
    }

    // MARK: - Posts List

    private var postsList: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Summary stats
                HStack(spacing: 12) {
                    SchedulerMiniStat(label: "Pending", value: scheduledPosts.filter { $0.status == "pending" }.count, color: Theme.iosOrange)
                    SchedulerMiniStat(label: "Published", value: scheduledPosts.filter { $0.status == "published" }.count, color: Theme.iosGreen)
                    SchedulerMiniStat(label: "Failed", value: scheduledPosts.filter { $0.status == "failed" }.count, color: Theme.iosRed)
                    SchedulerMiniStat(label: "Cancelled", value: scheduledPosts.filter { $0.status == "cancelled" }.count, color: Theme.textTertiary)
                }
                .padding(.horizontal)

                ForEach(groupedPosts, id: \.0) { date, posts in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(formattedDateHeader(date))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.horizontal)

                        ForEach(posts) { post in
                            ScheduledPostCard(post: post) {
                                await cancelPost(post)
                            }
                            .padding(.horizontal)
                        }
                    }
                }
            }
            .padding(.bottom, 32)
        }
    }

    // MARK: - Helpers

    private func formattedDateHeader(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else { return dateString }

        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInTomorrow(date) { return "Tomorrow" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }

        let display = DateFormatter()
        display.dateFormat = "EEEE, MMM d"
        return display.string(from: date)
    }

    // MARK: - Data

    private func loadData() async {
        isLoading = scheduledPosts.isEmpty && listings.isEmpty
        do {
            listings = try await api.get("/api/listings")
            // Use mock scheduled posts for now since there's no dedicated scheduler endpoint
            if scheduledPosts.isEmpty {
                scheduledPosts = Self.mockScheduledPosts
            }
            error = nil
        } catch {
            self.error = error
            if scheduledPosts.isEmpty {
                scheduledPosts = Self.mockScheduledPosts
            }
        }
        isLoading = false
    }

    private func cancelPost(_ post: ScheduledPost) async {
        HapticEngine.medium()
        withAnimation(.smooth) {
            if let index = scheduledPosts.firstIndex(where: { $0.id == post.id }) {
                scheduledPosts[index].status = "cancelled"
            }
        }
    }

    static let mockScheduledPosts: [ScheduledPost] = [
        ScheduledPost(id: "sp1", listingId: nil, platform: "depop", scheduledAt: "2026-03-21T10:00:00Z", status: "pending"),
        ScheduledPost(id: "sp2", listingId: nil, platform: "grailed", scheduledAt: "2026-03-21T14:00:00Z", status: "pending"),
        ScheduledPost(id: "sp3", listingId: nil, platform: "poshmark", scheduledAt: "2026-03-20T09:00:00Z", status: "published"),
        ScheduledPost(id: "sp4", listingId: nil, platform: "ebay", scheduledAt: "2026-03-19T16:00:00Z", status: "failed"),
    ]
}

// MARK: - Scheduled Post Card

private struct ScheduledPostCard: View {
    let post: ScheduledPost
    let onCancel: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                PlatformIcon(platform: post.platform, size: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(post.platform.capitalized)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)

                    Text(formattedTime(post.scheduledAt))
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                }

                Spacer()

                StatusBadge(status: post.status)
            }

            if post.status == "pending" {
                HStack {
                    Spacer()
                    Button {
                        Task { await onCancel() }
                    } label: {
                        Text("Cancel")
                            .font(.caption.bold())
                            .foregroundStyle(Theme.iosRed)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(Theme.iosRed.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .cardStyle()
    }

    private func formattedTime(_ dateString: String) -> String {
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a, MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Schedule Post Sheet

private struct SchedulePostSheet: View {
    @Environment(\.dismiss) private var dismiss
    let listings: [Listing]
    let onSchedule: (ScheduledPost) -> Void

    @State private var selectedListingId: String?
    @State private var selectedPlatforms: Set<String> = []
    @State private var scheduledDate = Date().addingTimeInterval(3600)
    @State private var isSaving = false

    private let platforms = ["depop", "grailed", "poshmark", "ebay", "mercari", "vinted"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Listing Picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Select Listing")
                            .font(.caption.bold())
                            .foregroundStyle(Theme.textTertiary)

                        if listings.isEmpty {
                            Text("No listings available")
                                .font(.subheadline)
                                .foregroundStyle(Theme.textTertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, 24)
                                .background(Theme.backgroundCard)
                                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        } else {
                            ForEach(listings.prefix(10)) { listing in
                                Button {
                                    HapticEngine.selection()
                                    selectedListingId = listing.id
                                } label: {
                                    HStack(spacing: 10) {
                                        Image(systemName: selectedListingId == listing.id ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(selectedListingId == listing.id ? Theme.accent : Theme.textTertiary)

                                        Text(listing.title)
                                            .font(.subheadline)
                                            .foregroundStyle(Theme.textPrimary)
                                            .lineLimit(1)

                                        Spacer()

                                        Text(listing.formattedPrice)
                                            .font(.caption.bold())
                                            .foregroundStyle(Theme.accent)
                                    }
                                    .padding(12)
                                }
                                .buttonStyle(.plain)
                            }
                            .background(Theme.backgroundCard)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        }
                    }

                    // Platform Selection
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Platforms")
                            .font(.caption.bold())
                            .foregroundStyle(Theme.textTertiary)

                        VStack(spacing: 0) {
                            ForEach(platforms, id: \.self) { platform in
                                Button {
                                    HapticEngine.selection()
                                    if selectedPlatforms.contains(platform) {
                                        selectedPlatforms.remove(platform)
                                    } else {
                                        selectedPlatforms.insert(platform)
                                    }
                                } label: {
                                    HStack {
                                        PlatformIcon(platform: platform, size: 28)
                                        Text(platform.capitalized)
                                            .font(.subheadline)
                                            .foregroundStyle(Theme.textPrimary)
                                        Spacer()
                                        Image(systemName: selectedPlatforms.contains(platform) ? "checkmark.square.fill" : "square")
                                            .foregroundStyle(selectedPlatforms.contains(platform) ? Theme.accent : Theme.textTertiary)
                                    }
                                    .padding(12)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .background(Theme.backgroundCard)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                    }

                    // Date/Time Picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Schedule Date & Time")
                            .font(.caption.bold())
                            .foregroundStyle(Theme.textTertiary)

                        DatePicker("", selection: $scheduledDate, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                            .datePickerStyle(.graphical)
                            .tint(Theme.accent)
                            .padding(12)
                            .background(Theme.backgroundCard)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Schedule Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        schedulePost()
                    } label: {
                        Text("Schedule")
                            .bold()
                            .foregroundStyle(canSchedule ? Theme.accent : Theme.textTertiary)
                    }
                    .disabled(!canSchedule || isSaving)
                }
            }
        }
    }

    private var canSchedule: Bool {
        !selectedPlatforms.isEmpty
    }

    private func schedulePost() {
        HapticEngine.success()
        let iso = ISO8601DateFormatter()
        for platform in selectedPlatforms {
            let post = ScheduledPost(
                id: UUID().uuidString,
                listingId: selectedListingId,
                platform: platform,
                scheduledAt: iso.string(from: scheduledDate),
                status: "pending"
            )
            onSchedule(post)
        }
        dismiss()
    }
}

// MARK: - Mini Stat

private struct SchedulerMiniStat: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(color)
                .contentTransition(.numericText())
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

// MARK: - Model

struct ScheduledPost: Codable, Identifiable {
    let id: String
    var listingId: String?
    var platform: String
    var scheduledAt: String
    var status: String
}

#Preview {
    SchedulerView()
}
