/** ListBlitz knowledge base — injected into the AI help assistant system prompt.
 *  Kept as structured markdown so the AI can reference specific sections. */

export const HELP_KNOWLEDGE = `
# ListBlitz Knowledge Base

## Overview
ListBlitz is an AI-powered cross-platform listing tool for resellers. It helps users list products across 8 marketplaces from a single dashboard: Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.

## Core Features

### Smart Lister (AI Vision)
Upload a product photo and the AI identifies the item, brand, condition, size, and generates a full listing with title, description, price, category, and hashtags. Uses the configured AI provider's vision capabilities.

### Description Enhancer
Takes rough notes or a basic description and polishes it into a professional, SEO-optimized listing description with proper formatting and keywords.

### Platform Optimizer
Rewrites a listing for each marketplace's specific tone, audience, character limits, and algorithm. Generates platform-specific titles, descriptions, hashtags, and suggested prices.

### Price Intelligence
Analyzes competitor pricing and sell-through rates to suggest optimal prices per platform. Considers brand, condition, category, and current market trends.

### Health Score
Grades a listing on title quality, description completeness, photo count, pricing competitiveness, and platform coverage. Returns a score (0-100) with specific improvement recommendations.

### Cross-Publish
Publishes optimized listings to all connected platforms using stored credentials. Each platform gets its own optimized version.

### Negotiation Copilot
AI-powered reply suggestions for buyer messages. Generates multiple response strategies (firm, negotiate, accept) for each conversation.

### Market Trends
Real-time trend analysis showing hot items, rising categories, sleeper picks, and per-platform selling strategies.

### Scheduler
Schedule listings to go live at optimal times per platform. Supports recurring schedules and bulk scheduling.

### Inbox
Unified inbox for buyer messages across all connected platforms. AI-suggested replies available per conversation.

### Analytics
Dashboard showing listings, views, likes, sales, revenue across all platforms. Per-platform breakdown and performance metrics.

### Inventory & P/L
Profit and loss tracking per item and per platform. Tracks cost of goods, shipping, platform fees, and net profit.

## AI Pipeline Stages
The AI workflow processes listings through these stages in order:
1. **AI Vision** — Photo to listing draft
2. **Description** — Polish and SEO optimize
3. **Platform Optimize** — Rewrite for each marketplace
4. **Price Intelligence** — Competitor analysis and pricing
5. **Health Score** — Grade listing quality
6. **Cross-Publish** — Publish to connected platforms (no AI)
7. **Negotiation** — Draft buyer responses
8. **Market Trends** — Trend reports and picks

## Settings & Configuration

### AI Providers
Users can configure API keys for multiple providers:
- **Direct Providers**: OpenAI, Google Gemini, Groq, Together AI, Custom (OpenAI-compatible)
- **AI Routers**: OpenRouter, LiteLLM Proxy (one key, many models)

If only one key is set, it's used globally. With multiple keys or a router, users can enable per-stage model routing (Smart AI Routing) to assign different models to each pipeline stage.

### Prompt Studio
Users can customize AI prompts for each feature (listing, pricing, analytics, trends, negotiation). Each prompt supports variables like {title}, {description}, {platform}, etc.

### Platform Connections
Users save their marketplace credentials (username + password) per platform. Credentials are encrypted with AES-256 and only used at publish time. Users can test connections to verify credentials and platform reachability.

### Themes
Users can switch between visual themes (Forest, Ocean, Sunset, Midnight, Rose, Sand, Lavender).

## Common Errors & Troubleshooting

### "No API key available"
The AI provider doesn't have an API key configured. Go to Settings > AI Provider, expand the provider card, and enter your API key. Click Save.

### "AI request failed"
The AI call failed. Common causes:
- Invalid API key (check for typos or expired keys)
- Rate limit exceeded (wait a moment and retry)
- Model not available on your plan (try a different model)
- Network issues (check your internet connection)

### "Credentials not configured" (platform)
The marketplace credentials are missing. Go to Settings > Platforms, enter your username and password for that platform, and click Save.

### "Could not reach [platform]"
The platform website is unreachable from the server. This could be:
- Platform is experiencing downtime (check their status page)
- Server network issues (try again later)
- Platform is blocking automated requests (try a different approach)

### "Failed to optimize listing"
The AI couldn't generate optimized content. Common fixes:
- Ensure your listing has a title and description
- Check that your AI provider key is valid (Settings > AI Provider > Test)
- Try a different model or provider

### "Upload failed"
Image upload issues. Check:
- File size (max 10MB per image)
- File format (PNG, JPG, JPEG, WebP supported)
- Total images (max 20 per listing)

### "Failed to save credentials"
Database error when saving platform credentials. Try:
- Refresh the page and try again
- Check if the platform name is valid
- Contact support if the issue persists

## Platform-Specific Notes

### Depop
- Supports hashtags (up to 5)
- Description limit: ~1000 characters
- Requires item category and condition

### Grailed
- Fashion/streetwear focused
- Requires designer/brand selection
- Supports detailed measurements
- Higher-end pricing expected

### Poshmark
- Social selling platform
- Supports "parties" and sharing
- 20% seller fee on sales > $15
- Original price required alongside listing price

### Mercari
- General marketplace
- Supports shipping label generation
- 10% seller fee
- Condition grading system

### eBay
- Largest marketplace, most categories
- Supports auction and buy-it-now formats
- Complex fee structure varies by category
- Item specifics required for many categories

### Vinted
- European-focused fashion marketplace
- No seller fees (buyer pays)
- Supports size-specific filtering
- Multiple country-specific domains

### Facebook Marketplace
- Local + shipping options
- No seller fees for local pickup
- Requires Facebook account
- Category and location required

### Vestiaire Collective
- Luxury/designer focused
- Authentication required for items
- Commission-based fee structure
- Quality control inspection process
`;
