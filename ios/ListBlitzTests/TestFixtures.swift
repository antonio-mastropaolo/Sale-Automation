import Foundation

/// JSON fixtures matching actual ListBlitz API responses
enum TestFixtures {

    // MARK: - Auth

    static let loginResponse = """
    {
        "user": {
            "id": "7bc5b294-f3bd-4130-ae33-9e0d044ee3b5",
            "email": "admin@listblitz.io",
            "username": "antonio",
            "role": "admin",
            "onboarded": true
        }
    }
    """.data(using: .utf8)!

    // MARK: - Listings

    static let listingsResponse = """
    [
        {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "title": "Vintage Nike ACG Fleece",
            "description": "Great condition vintage fleece",
            "category": "Outerwear",
            "brand": "Nike",
            "size": "L",
            "condition": "Good",
            "price": 85.0,
            "costPrice": 40.0,
            "status": "active",
            "createdAt": "2026-03-01T12:00:00.000Z",
            "updatedAt": "2026-03-15T14:30:00.000Z",
            "images": [
                {
                    "id": "img-001",
                    "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "path": "/uploads/photo1.jpg",
                    "order": 0
                },
                {
                    "id": "img-002",
                    "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "path": "/uploads/photo2.jpg",
                    "order": 1
                }
            ],
            "platformListings": [
                {
                    "id": "pl-001",
                    "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "platform": "depop",
                    "optimizedTitle": "Vintage Nike ACG Fleece Half Zip",
                    "optimizedDescription": "Rare vintage find",
                    "hashtags": ["vintagenike", "acg"],
                    "suggestedPrice": 90.0,
                    "platformUrl": null,
                    "status": "published",
                    "publishedAt": "2026-03-10T10:00:00.000Z"
                }
            ]
        },
        {
            "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            "title": "Jordan 1 Retro High OG",
            "description": null,
            "category": "Footwear",
            "brand": "Nike",
            "size": "10.5",
            "condition": "New with tags",
            "price": 220.0,
            "costPrice": 130.0,
            "status": "draft",
            "createdAt": "2026-03-10T08:00:00.000Z",
            "updatedAt": "2026-03-10T08:00:00.000Z",
            "images": [],
            "platformListings": []
        }
    ]
    """.data(using: .utf8)!

    // MARK: - Sales with Stats

    static let salesWithStatsResponse = """
    {
        "sales": [
            {
                "id": "sale-001-uuid",
                "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "platform": "depop",
                "title": "Stussy Varsity Jacket",
                "soldPrice": 95.0,
                "costPrice": 43.0,
                "shippingCost": 8.0,
                "platformFee": 9.5,
                "profit": 34.5,
                "buyerName": "mike_vintage",
                "soldAt": "2026-03-19T14:30:00.000Z",
                "notes": ""
            }
        ],
        "stats": {
            "totalRevenue": 4280.0,
            "totalProfit": 2140.0,
            "totalCost": 2140.0,
            "count": 18,
            "avgProfitMargin": 50.0
        }
    }
    """.data(using: .utf8)!

    // MARK: - Inbox

    static let inboxResponse = """
    {
        "conversations": [
            {
                "id": "conv-001-uuid",
                "platform": "depop",
                "buyerName": "Mike Vintage",
                "buyerUsername": "mike_vintage",
                "buyerAvatar": "",
                "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "listingTitle": "Vintage Nike ACG Fleece",
                "status": "open",
                "lastMessage": "Hey, would you take $70?",
                "lastMessageAt": "2026-03-20T09:35:00.000Z",
                "unread": true,
                "createdAt": "2026-03-20T09:30:00.000Z",
                "messages": [
                    {
                        "id": "msg-001",
                        "conversationId": "conv-001-uuid",
                        "sender": "buyer",
                        "content": "Hey, would you take $70?",
                        "platform": "depop",
                        "read": false,
                        "createdAt": "2026-03-20T09:35:00.000Z"
                    }
                ]
            },
            {
                "id": "conv-002-uuid",
                "platform": "grailed",
                "buyerName": null,
                "buyerUsername": "streetwear_sam",
                "buyerAvatar": "",
                "listingId": null,
                "listingTitle": "Raf Simons Tee",
                "status": "open",
                "lastMessage": "Is this still available?",
                "lastMessageAt": "2026-03-20T09:00:00.000Z",
                "unread": false,
                "createdAt": "2026-03-19T15:00:00.000Z",
                "messages": []
            }
        ],
        "unreadCount": 1
    }
    """.data(using: .utf8)!

    // MARK: - Search

    static let searchResponse = """
    {
        "results": [
            {
                "id": "result-0",
                "title": "Nike ACG Vintage Fleece",
                "price": 75.0,
                "platform": "Depop",
                "images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
                "listingUrl": "https://depop.com/item/123",
                "seller": "vintage_seller",
                "condition": "Good",
                "size": "L",
                "brand": "Nike"
            },
            {
                "id": "result-1",
                "title": "90s Windbreaker",
                "price": 120.0,
                "platform": "Grailed",
                "images": [],
                "listingUrl": "https://grailed.com/item/456",
                "seller": "archive_dealer",
                "condition": "Like new",
                "size": "XL",
                "brand": "Nike"
            }
        ],
        "total": 2,
        "query": "vintage nike"
    }
    """.data(using: .utf8)!

    // MARK: - Repricing

    static let repricingResponse = """
    {
        "suggestions": [
            {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "title": "Vintage Nike ACG Fleece",
                "currentPrice": 85.0,
                "suggestedPrice": 72.0,
                "action": "drop",
                "reason": "High views but no offers. Market comps avg $70-75.",
                "daysListed": 14,
                "views": 89,
                "likes": 3,
                "brand": "Nike",
                "urgency": "high",
                "image": "/uploads/photo1.jpg"
            },
            {
                "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                "title": "Jordan 1 Retro High OG",
                "currentPrice": 220.0,
                "suggestedPrice": 220.0,
                "action": "hold",
                "reason": "Price is competitive.",
                "daysListed": 7,
                "views": 150,
                "likes": 8,
                "brand": "Nike",
                "urgency": "low",
                "image": null
            }
        ],
        "stats": {
            "total": 2,
            "needsAction": 1,
            "highUrgency": 1,
            "avgDaysListed": 10,
            "potentialRevenue": 292.0
        }
    }
    """.data(using: .utf8)!

    // MARK: - Offers (API shape with nested `ai`)

    static let offersAPIResponse = """
    {
        "offers": [
            {
                "id": "offer-0-a1b2c3d4",
                "listingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "listingTitle": "Vintage Nike ACG Fleece",
                "listingPrice": 85.0,
                "platform": "depop",
                "buyer": "mike_vintage",
                "offerPrice": 70.0,
                "offerPercent": 82,
                "message": "Would you take $70?",
                "receivedAt": "2026-03-20T09:30:00.000Z",
                "status": "pending",
                "ai": {
                    "recommendation": "accept",
                    "reason": "Good offer, close to market average",
                    "suggestedCounter": 78.0,
                    "profitAtOffer": 30.0,
                    "profitAtAsking": 45.0,
                    "marketAvg": 75.0,
                    "sellProbability": 92
                }
            }
        ],
        "stats": {
            "total": 1,
            "pending": 1,
            "totalValue": 70.0,
            "avgOfferPercent": 82,
            "acceptRecommended": 1,
            "counterRecommended": 0
        }
    }
    """.data(using: .utf8)!

    // MARK: - Decoder

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
}
