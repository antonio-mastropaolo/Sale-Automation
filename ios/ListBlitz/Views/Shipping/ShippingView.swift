import SwiftUI

struct ShippingView: View {
    @State private var shipments: [Shipment] = []
    @State private var isLoading = true
    @State private var selectedFilter: String?
    @State private var expandedShipmentId: String?

    private let statusFilters = ["label_created", "in_transit", "delivered", "exception"]

    private var filteredShipments: [Shipment] {
        guard let filter = selectedFilter else { return shipments }
        return shipments.filter { $0.status == filter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }
                        ForEach(statusFilters, id: \.self) { status in
                            FilterChip(
                                title: statusDisplayName(status),
                                isSelected: selectedFilter == status,
                                count: shipments.filter { $0.status == status }.count
                            ) {
                                selectedFilter = status
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }

                if isLoading {
                    LoadingView(message: "Loading shipments...")
                } else if filteredShipments.isEmpty {
                    EmptyStateView(
                        icon: "shippingbox",
                        title: "No Shipments",
                        message: "Shipments will appear here when you sell items"
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            statsRow
                            shipmentsList
                        }
                        .padding(.bottom, 32)
                    }
                }
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Shipping")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await loadShipments() }
            .task { await loadShipments() }
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 10) {
            ShippingStatPill(
                icon: "tag.fill",
                label: "Labels",
                value: shipments.filter { $0.status == "label_created" }.count,
                color: Theme.iosBlue
            )
            ShippingStatPill(
                icon: "shippingbox.fill",
                label: "In Transit",
                value: shipments.filter { $0.status == "in_transit" }.count,
                color: Theme.iosOrange
            )
            ShippingStatPill(
                icon: "checkmark.circle.fill",
                label: "Delivered",
                value: shipments.filter { $0.status == "delivered" }.count,
                color: Theme.iosGreen
            )
            ShippingStatPill(
                icon: "exclamationmark.triangle.fill",
                label: "Issues",
                value: shipments.filter { $0.status == "exception" }.count,
                color: Theme.iosRed
            )
        }
        .padding(.horizontal)
    }

    // MARK: - Shipments List

    private var shipmentsList: some View {
        ForEach(filteredShipments) { shipment in
            ShipmentCard(
                shipment: shipment,
                isExpanded: expandedShipmentId == shipment.id
            ) {
                HapticEngine.light()
                withAnimation(.smooth(duration: 0.3)) {
                    expandedShipmentId = expandedShipmentId == shipment.id ? nil : shipment.id
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Helpers

    private func statusDisplayName(_ status: String) -> String {
        switch status {
        case "label_created": "Labels"
        case "in_transit": "In Transit"
        case "delivered": "Delivered"
        case "exception": "Exceptions"
        default: status.capitalized
        }
    }

    // MARK: - Data

    private func loadShipments() async {
        isLoading = shipments.isEmpty
        // Mock data since there's no dedicated shipping API
        try? await Task.sleep(for: .milliseconds(600))
        shipments = Self.mockShipments
        isLoading = false
    }

    static let mockShipments: [Shipment] = [
        Shipment(
            id: "sh1",
            itemTitle: "Vintage Nike ACG Jacket",
            buyerName: "Jake M.",
            carrier: "USPS",
            trackingNumber: "9400111899223847561234",
            status: "in_transit",
            shippedAt: "2026-03-18T14:30:00Z",
            estimatedDelivery: "2026-03-22T00:00:00Z",
            trackingEvents: [
                TrackingEvent(date: "2026-03-18T14:30:00Z", location: "New York, NY", description: "Shipped, In Transit to Next Facility"),
                TrackingEvent(date: "2026-03-19T08:15:00Z", location: "Philadelphia, PA", description: "Arrived at USPS Regional Facility"),
                TrackingEvent(date: "2026-03-19T22:00:00Z", location: "Columbus, OH", description: "In Transit to Next Facility")
            ]
        ),
        Shipment(
            id: "sh2",
            itemTitle: "Carhartt WIP Detroit Jacket",
            buyerName: "Sarah K.",
            carrier: "UPS",
            trackingNumber: "1Z999AA10123456784",
            status: "delivered",
            shippedAt: "2026-03-14T10:00:00Z",
            estimatedDelivery: "2026-03-17T00:00:00Z",
            deliveredAt: "2026-03-17T11:22:00Z",
            trackingEvents: [
                TrackingEvent(date: "2026-03-14T10:00:00Z", location: "Brooklyn, NY", description: "Picked up"),
                TrackingEvent(date: "2026-03-16T06:00:00Z", location: "Los Angeles, CA", description: "Out for delivery"),
                TrackingEvent(date: "2026-03-17T11:22:00Z", location: "Los Angeles, CA", description: "Delivered")
            ]
        ),
        Shipment(
            id: "sh3",
            itemTitle: "Y2K Ed Hardy Tee",
            buyerName: "Tyler R.",
            carrier: "USPS",
            trackingNumber: "9400111899223847569876",
            status: "label_created",
            shippedAt: nil,
            estimatedDelivery: nil,
            trackingEvents: []
        ),
        Shipment(
            id: "sh4",
            itemTitle: "Raf Simons Archive Sweater",
            buyerName: "Alex W.",
            carrier: "FedEx",
            trackingNumber: "794644790132",
            status: "exception",
            shippedAt: "2026-03-15T09:00:00Z",
            estimatedDelivery: "2026-03-18T00:00:00Z",
            trackingEvents: [
                TrackingEvent(date: "2026-03-15T09:00:00Z", location: "Chicago, IL", description: "Picked up"),
                TrackingEvent(date: "2026-03-17T14:00:00Z", location: "Denver, CO", description: "Delivery exception - Address issue")
            ]
        ),
        Shipment(
            id: "sh5",
            itemTitle: "Champion Reverse Weave Hoodie",
            buyerName: "Maya L.",
            carrier: "USPS",
            trackingNumber: "9400111899223847554321",
            status: "in_transit",
            shippedAt: "2026-03-19T16:00:00Z",
            estimatedDelivery: "2026-03-23T00:00:00Z",
            trackingEvents: [
                TrackingEvent(date: "2026-03-19T16:00:00Z", location: "Portland, OR", description: "Accepted at USPS Origin Facility")
            ]
        )
    ]
}

// MARK: - Shipment Card

private struct ShipmentCard: View {
    let shipment: Shipment
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Main card content
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: statusIcon(shipment.status))
                            .font(.title3)
                            .foregroundStyle(statusColor(shipment.status))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(shipment.itemTitle)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.textPrimary)
                                .lineLimit(1)

                            Text("Buyer: \(shipment.buyerName)")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }

                        Spacer()

                        StatusBadge(status: statusDisplayText(shipment.status))
                    }

                    HStack(spacing: 16) {
                        Label(shipment.carrier, systemImage: "truck.box.fill")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)

                        Text(shipment.trackingNumber)
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundStyle(Theme.textTertiary)
                            .lineLimit(1)

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.textTertiary)
                    }

                    if let eta = shipment.estimatedDelivery {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 10))
                                .foregroundStyle(Theme.textTertiary)
                            Text("ETA: \(formattedDate(eta))")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }
                    }
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            // Expanded tracking details
            if isExpanded && !shipment.trackingEvents.isEmpty {
                Divider()
                    .background(Theme.textTertiary.opacity(0.3))

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(shipment.trackingEvents.enumerated()), id: \.offset) { index, event in
                        HStack(alignment: .top, spacing: 12) {
                            VStack(spacing: 0) {
                                Circle()
                                    .fill(index == 0 ? Theme.accent : Theme.backgroundElevated)
                                    .frame(width: 10, height: 10)

                                if index < shipment.trackingEvents.count - 1 {
                                    Rectangle()
                                        .fill(Theme.backgroundElevated)
                                        .frame(width: 2)
                                        .frame(maxHeight: .infinity)
                                }
                            }
                            .frame(width: 10)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.description)
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(index == 0 ? Theme.textPrimary : Theme.textSecondary)

                                HStack(spacing: 8) {
                                    Text(event.location)
                                        .font(.caption2)
                                        .foregroundStyle(Theme.textTertiary)

                                    Text(formattedDateTime(event.date))
                                        .font(.caption2)
                                        .foregroundStyle(Theme.textTertiary)
                                }
                            }
                            .padding(.bottom, index < shipment.trackingEvents.count - 1 ? 14 : 0)
                        }
                    }
                }
                .padding(14)
            }
        }
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "label_created": "tag.fill"
        case "in_transit": "shippingbox.fill"
        case "delivered": "checkmark.circle.fill"
        case "exception": "exclamationmark.triangle.fill"
        default: "shippingbox"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "label_created": Theme.iosBlue
        case "in_transit": Theme.iosOrange
        case "delivered": Theme.iosGreen
        case "exception": Theme.iosRed
        default: Theme.textTertiary
        }
    }

    private func statusDisplayText(_ status: String) -> String {
        switch status {
        case "label_created": "draft"
        case "in_transit": "active"
        case "delivered": "sold"
        case "exception": "failed"
        default: status
        }
    }

    private func formattedDate(_ dateString: String) -> String {
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private func formattedDateTime(_ dateString: String) -> String {
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Shipping Stat Pill

private struct ShippingStatPill: View {
    let icon: String
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)

            Text("\(value)")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textPrimary)
                .contentTransition(.numericText())

            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

// MARK: - Models

struct Shipment: Codable, Identifiable {
    let id: String
    let itemTitle: String
    let buyerName: String
    let carrier: String
    let trackingNumber: String
    var status: String
    var shippedAt: String?
    var estimatedDelivery: String?
    var deliveredAt: String?
    var trackingEvents: [TrackingEvent]
}

struct TrackingEvent: Codable {
    let date: String
    let location: String
    let description: String
}

#Preview {
    ShippingView()
}
