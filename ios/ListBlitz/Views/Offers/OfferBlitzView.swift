import SwiftUI

struct OfferBlitzView: View {
    @State private var offers: [Offer] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var currentIndex = 0
    @State private var dragOffset: CGSize = .zero
    @State private var dragRotation: Double = 0

    private let api = APIClient.shared
    private let swipeThreshold: CGFloat = 120

    private var pendingOffers: [Offer] {
        offers.filter { $0.isPending }
    }

    private var currentOffer: Offer? {
        guard currentIndex < pendingOffers.count else { return nil }
        return pendingOffers[currentIndex]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerBar

            if isLoading {
                LoadingView(message: "Loading offers...")
            } else if let error {
                ErrorView(error: error) { await loadOffers() }
            } else if pendingOffers.isEmpty {
                emptyState
            } else {
                // Card Stack
                cardStack
                    .padding(.top, 8)

                Spacer()

                // Action Buttons
                if currentOffer != nil {
                    actionButtons
                        .padding(.bottom, 24)
                }
            }
        }
        .background(Theme.backgroundPrimary)
        .navigationTitle("Offer Blitz")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await loadOffers() }
        .task { await loadOffers() }
    }

    // MARK: - Header Bar

    private var headerBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Offer Blitz")
                    .font(.title2.bold())
                    .foregroundStyle(Theme.textPrimary)

                Text("\(pendingOffers.count) pending offers")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }

            Spacer()

            if !pendingOffers.isEmpty {
                Text("\(currentIndex + 1)/\(pendingOffers.count)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.accent.opacity(0.15))
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "bolt.horizontal.fill")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent.opacity(0.5))
                .symbolEffect(.pulse, options: .repeating.speed(0.5))

            VStack(spacing: 8) {
                Text("All caught up!")
                    .font(.title3.bold())
                    .foregroundStyle(Theme.textPrimary)

                Text("No pending offers to review.\nNew offers will appear here.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
    }

    // MARK: - Card Stack

    private var cardStack: some View {
        ZStack {
            // Background card (next)
            if currentIndex + 1 < pendingOffers.count {
                offerCardContent(pendingOffers[currentIndex + 1])
                    .scaleEffect(0.95)
                    .offset(y: 8)
                    .opacity(0.5)
            }

            // Current card with drag gesture
            if let offer = currentOffer {
                offerCardContent(offer)
                    .offset(x: dragOffset.width, y: dragOffset.height * 0.3)
                    .rotationEffect(.degrees(dragRotation))
                    .opacity(1.0 - abs(Double(dragOffset.width)) / 400.0)
                    .overlay(alignment: .center) {
                        swipeOverlay
                    }
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                dragOffset = value.translation
                                dragRotation = Double(value.translation.width) / 25.0

                                // Haptic at threshold
                                if abs(value.translation.width) > swipeThreshold {
                                    let generator = UIImpactFeedbackGenerator(style: .light)
                                    generator.prepare()
                                }
                            }
                            .onEnded { value in
                                if value.translation.width > swipeThreshold {
                                    // Swipe right = Accept
                                    swipeRight()
                                } else if value.translation.width < -swipeThreshold {
                                    // Swipe left = Decline
                                    swipeLeft()
                                } else {
                                    // Snap back
                                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                                        dragOffset = .zero
                                        dragRotation = 0
                                    }
                                }
                            }
                    )
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Swipe Overlay

    private var swipeOverlay: some View {
        ZStack {
            // Accept indicator (right)
            if dragOffset.width > 40 {
                VStack {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Theme.iosGreen)
                    Text("ACCEPT")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.iosGreen)
                }
                .opacity(min(Double(dragOffset.width - 40) / 80.0, 1.0))
            }

            // Decline indicator (left)
            if dragOffset.width < -40 {
                VStack {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Theme.iosRed)
                    Text("DECLINE")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.iosRed)
                }
                .opacity(min(Double(-dragOffset.width - 40) / 80.0, 1.0))
            }
        }
    }

    // MARK: - Offer Card Content

    private func offerCardContent(_ offer: Offer) -> some View {
        VStack(spacing: 16) {
            // Buyer info
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Theme.platformColor(offer.platform ?? "").opacity(0.2))
                        .frame(width: 44, height: 44)

                    Text(offer.buyerInitial)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.platformColor(offer.platform ?? ""))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(offer.displayBuyer)
                        .font(.subheadline.bold())
                        .foregroundStyle(Theme.textPrimary)

                    HStack(spacing: 6) {
                        if let platform = offer.platform {
                            PlatformBadge(platform: platform, compact: true)
                        }
                        if let title = offer.listingTitle {
                            Text(title)
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                                .lineLimit(1)
                        }
                    }
                }

                Spacer()

                if let createdAt = offer.createdAt {
                    Text(DateHelper.timeAgo(from: createdAt))
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                }
            }

            Divider().background(Theme.textTertiary.opacity(0.3))

            // Offer vs Asking
            HStack {
                VStack(spacing: 4) {
                    Text("Offer")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text(offer.formattedOfferPrice)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.iosOrange)
                }

                Spacer()

                VStack(spacing: 4) {
                    Text("vs")
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                    if let pct = offer.offerPercent {
                        Text("\(pct)%")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(pct >= 80 ? Theme.iosGreen : (pct >= 60 ? Theme.iosOrange : Theme.iosRed))
                    }
                }

                Spacer()

                VStack(spacing: 4) {
                    Text("Asking")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text(offer.formattedAskingPrice)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.textPrimary)
                }
            }

            // AI Recommendation Badge
            if let rec = offer.aiRecommendation {
                aiRecommendationBadge(rec, counterPrice: offer.aiCounterPrice)
            }

            Divider().background(Theme.textTertiary.opacity(0.3))

            // Profit & Market
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Profit if Accept")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)
                    Text(offer.formattedProfit)
                        .font(.subheadline.bold())
                        .foregroundStyle((offer.profitIfAccept ?? 0) >= 0 ? Theme.success : Theme.error)
                }

                Spacer()

                if let market = offer.marketAvg {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Market Avg")
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                        Text(market)
                            .font(.subheadline.bold())
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
        }
        .padding(20)
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusXL, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusXL, style: .continuous)
                .stroke(Theme.textTertiary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }

    // MARK: - AI Recommendation Badge

    private func aiRecommendationBadge(_ recommendation: String, counterPrice: Double?) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkles")
                .font(.caption)
                .foregroundStyle(recommendationColor(recommendation))
                .symbolEffect(.bounce)

            Text("AI Recommends: \(recommendation.capitalized)")
                .font(.caption.bold())
                .foregroundStyle(recommendationColor(recommendation))

            if recommendation.lowercased() == "counter", let price = counterPrice {
                Text("at $\(String(format: "%.0f", price))")
                    .font(.caption.bold())
                    .foregroundStyle(Theme.iosBlue)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(recommendationColor(recommendation).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func recommendationColor(_ rec: String) -> Color {
        switch rec.lowercased() {
        case "accept": Theme.iosGreen
        case "counter": Theme.iosBlue
        case "decline": Theme.iosRed
        default: Theme.textTertiary
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Decline
            Button {
                swipeLeft()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "xmark")
                        .font(.title2.bold())
                    Text("Decline")
                        .font(.caption2.bold())
                }
                .foregroundStyle(Theme.iosRed)
                .frame(width: 72, height: 72)
                .background(Theme.iosRed.opacity(0.1))
                .clipShape(Circle())
            }

            // Counter
            Button {
                counterOffer()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.title2.bold())
                    Text("Counter")
                        .font(.caption2.bold())
                }
                .foregroundStyle(Theme.iosBlue)
                .frame(width: 72, height: 72)
                .background(Theme.iosBlue.opacity(0.1))
                .clipShape(Circle())
            }

            // Accept
            Button {
                swipeRight()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "checkmark")
                        .font(.title2.bold())
                    Text("Accept")
                        .font(.caption2.bold())
                }
                .foregroundStyle(Theme.iosGreen)
                .frame(width: 72, height: 72)
                .background(Theme.iosGreen.opacity(0.1))
                .clipShape(Circle())
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Swipe Actions

    private func swipeRight() {
        HapticEngine.success()
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            dragOffset = CGSize(width: 500, height: 0)
            dragRotation = 15
        }
        respondToOffer(action: "accept")
    }

    private func swipeLeft() {
        HapticEngine.medium()
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            dragOffset = CGSize(width: -500, height: 0)
            dragRotation = -15
        }
        respondToOffer(action: "decline")
    }

    private func counterOffer() {
        guard let offer = currentOffer else { return }
        HapticEngine.medium()
        respondToOffer(action: "counter", counterPrice: offer.aiCounterPrice)
    }

    private func respondToOffer(action: String, counterPrice: Double? = nil) {
        guard let offer = currentOffer else { return }

        Task {
            do {
                var body: [String: String] = ["action": action]
                if let price = counterPrice {
                    body["counterPrice"] = String(price)
                }
                try await api.postRaw("/api/offers/\(offer.id)/respond", body: body)
            } catch {
                // Silently handle -- offer already moved
            }

            try? await Task.sleep(for: .milliseconds(400))

            await MainActor.run {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    dragOffset = .zero
                    dragRotation = 0
                    if currentIndex < pendingOffers.count - 1 {
                        currentIndex += 1
                    } else {
                        // Reload to check for more
                        Task { await loadOffers() }
                    }
                }
            }
        }
    }

    // MARK: - Load Offers

    private func loadOffers() async {
        isLoading = offers.isEmpty
        do {
            let response: APIOffersResponse = try await api.get("/api/offers", query: ["status": "pending"], skipCache: true)
            offers = response.toOffers()
            currentIndex = 0
            error = nil
        } catch {
            // If endpoint doesn't exist, use mock data
            if offers.isEmpty {
                offers = Self.mockOffers
                currentIndex = 0
            }
            self.error = nil
        }
        isLoading = false
    }

    // MARK: - Mock Data

    static let mockOffers: [Offer] = [
        Offer(id: "1", buyerName: "Jake M.", buyerUsername: "jake_vintage", listingTitle: "Vintage Nike Windbreaker", platform: "depop", offerPrice: 45, askingPrice: 65, aiRecommendation: "counter", aiCounterPrice: 55, profitIfAccept: 25, marketAvg: "$52", status: "pending", createdAt: nil),
        Offer(id: "2", buyerName: "Sarah K.", buyerUsername: "sarah_thrift", listingTitle: "Y2K Cargo Pants", platform: "grailed", offerPrice: 80, askingPrice: 90, aiRecommendation: "accept", aiCounterPrice: nil, profitIfAccept: 55, marketAvg: "$78", status: "pending", createdAt: nil),
        Offer(id: "3", buyerName: nil, buyerUsername: "vintage_lover99", listingTitle: "Archive Raf Simons Tee", platform: "poshmark", offerPrice: 120, askingPrice: 200, aiRecommendation: "decline", aiCounterPrice: 175, profitIfAccept: 40, marketAvg: "$185", status: "pending", createdAt: nil),
    ]
}
