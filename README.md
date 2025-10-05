# GitHub Widgets

A serverless application for generating dynamic GitHub contribution widgets as SVG images. Built with Netlify Functions and designed to be embedded anywhere.

## Features

- 🎨 **Beautiful SVG Widgets** - Animated, responsive contribution timeseries charts
- ⚡ **Fast & Cached** - In-memory LRU cache with configurable TTL (default: 1 hour)
- 🔒 **Secure** - Optional user locking via `LOCK_GITHUB_USER` environment variable
- 🚀 **Serverless** - Runs on Netlify Functions (AWS Lambda)
- 📊 **Flexible Date Ranges** - Query any date range up to 365 days
- 🔄 **Extensible** - Easy to add new widget types and API versions

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- GitHub Personal Access Token ([create one here](https://github.com/settings/tokens))
- Netlify account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/github-widgets.git
cd github-widgets
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Add your GitHub token to `.env`:
```env
GITHUB_TOKEN=ghp_your_token_here
```

### Local Development

Run the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8888/api/v1/`

### Testing

Test the timeseries endpoint:
```bash
# With username and date range
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281&range=2025-01-01:2025-10-15"

# With username only (defaults to last 365 days)
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281"
```

## API Documentation

### Base URL

- **Production**: `https://your-site.netlify.app/api/v1/`
- **Local**: `http://localhost:8888/api/v1/`

### Endpoints

#### GET `/api/v1/timeseries-history.svg`

![Sample](./sampples/timeseries-history-sample.svg)

Generate a GitHub contribution timeseries chart as an SVG image.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to generate chart for |
| `range` | string | Optional | Date range in format `YYYY-MM-DD:YYYY-MM-DD` (max 365 days) |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage
/api/v1/timeseries-history.svg?userName=octocat

# With date range
/api/v1/timeseries-history.svg?userName=octocat&range=2024-01-01:2024-12-31

# Specific date range
/api/v1/timeseries-history.svg?userName=cyrus2281&range=2025-01-01:2025-10-15
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600`
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

All errors are returned as SVG images with appropriate HTTP status codes:

- `400 Bad Request` - Invalid parameters (username format, date range, etc.)
- `403 Forbidden` - Username provided when `LOCK_GITHUB_USER` is set
- `404 Not Found` - GitHub user not found or invalid endpoint
- `500 Internal Server Error` - Server configuration or GitHub API errors

### Embedding in Markdown

```markdown
![GitHub Contributions](https://your-site.netlify.app/api/v1/timeseries-history.svg?userName=octocat)
```

### Embedding in HTML

```html
<img src="https://your-site.netlify.app/api/v1/timeseries-history.svg?userName=octocat" alt="GitHub Contributions" />
```

## Environment Variables

### Required

- **`GITHUB_TOKEN`** - GitHub Personal Access Token
  - Required scopes: `read:user`
  - [Create token here](https://github.com/settings/tokens)

### Optional

- **`LOCK_GITHUB_USER`** - Lock API to specific GitHub user
  - When set, `userName` query parameter is disabled
  - Useful for personal deployments
  - Example: `LOCK_GITHUB_USER=cyrus2281`

- **`CACHE_MAX_SIZE`** - Maximum number of cached responses
  - Default: `100`
  - Increase for high-traffic deployments

- **`CACHE_TTL_MS`** - Cache time-to-live in milliseconds
  - Default: `3600000` (1 hour)
  - Adjust based on update frequency needs

## Deployment

### Deploy to Netlify

1. **Via Netlify CLI:**

```bash
# Login to Netlify
netlify login

# Deploy to production
npm run deploy
```

2. **Via Git Integration:**

- Push your code to GitHub
- Connect repository in Netlify dashboard
- Netlify will auto-deploy on push to main branch

3. **Set Environment Variables:**

In Netlify dashboard or via CLI:

```bash
netlify env:set GITHUB_TOKEN "ghp_your_token_here"
netlify env:set LOCK_GITHUB_USER "your-username"  # Optional
```

### Deploy to Other Platforms

The application uses standard Netlify Functions format. To deploy elsewhere:

1. Adapt the function handler format for your platform
2. Ensure Node.js 20.x runtime
3. Set environment variables
4. Configure routing to `/api/*` → function handler

## Project Structure

```
github-widgets/
├── netlify/
│   └── functions/
│       └── api.js                    # Main API router
├── src/
│   ├── handlers/
│   │   └── v1/
│   │       └── timeseries-history.js # Timeseries endpoint handler
│   ├── github_timeseries/
│   │   └── generateActivitySVG.js    # SVG generation logic
│   └── utils/
│       ├── cache.js                  # LRU cache implementation
│       ├── validation.js             # Request validation
│       └── errors.js                 # Error response utilities
├── netlify.toml                      # Netlify configuration
├── .env.example                      # Environment variables template
├── package.json                      # Dependencies and scripts
├── ARCHITECTURE.md                   # Detailed architecture docs
└── README.md                         # This file
```

## Architecture

The application follows a modular, extensible architecture:

- **API Router** - Routes requests to versioned handlers
- **Handlers** - Process requests and generate responses
- **Services** - Business logic (GitHub API, SVG generation)
- **Utils** - Shared utilities (cache, validation, errors)

## Caching Strategy

- **In-Memory LRU Cache** - Fast, simple, resets on cold starts
- **Cache Key Format**: `timeseries-history:{username}:{startDate}:{endDate}`
- **TTL**: 1 hour (configurable)
- **Max Size**: 100 entries (configurable)
- **Eviction**: Least Recently Used (LRU)

Cache headers:
- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response generated fresh

## Adding New Endpoints

1. Create handler in `src/handlers/v1/new-endpoint.js`:

```javascript
export async function handler(event) {
  // Your logic here
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml' },
    body: svgContent,
  };
}
```

2. Add route in `netlify/functions/api.js`:

```javascript
case 'new-endpoint.svg':
  return newEndpointHandler(event);
```

3. Reuse existing utilities (cache, validation, errors)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details
