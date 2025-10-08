# GitHub Widgets

A serverless application for generating dynamic GitHub contribution widgets as SVG images. Built with Netlify Functions and designed to be embedded anywhere.

## Widgets

### GitHub Contribution Timeseries
![time-series-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/timeseries-history-sample.svg)

### Experience Timeline
![experience-timeline-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/experience-timeline-sample.svg)

## Contents
- [GitHub Widgets](#github-widgets)
  - [Widgets](#widgets)
    - [GitHub Contribution Timeseries](#github-contribution-timeseries)
    - [Experience Timeline](#experience-timeline)
  - [Contents](#contents)
  - [Features](#features)
  - [Themes](#themes)
    - [Available Themes](#available-themes)
    - [Usage](#usage)
    - [Previews](#previews)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Local Development](#local-development)
    - [Testing](#testing)
  - [API Documentation](#api-documentation)
    - [Base URL](#base-url)
    - [Endpoints](#endpoints)
      - [GET `/api/v1/timeseries-history.svg`](#get-apiv1timeseries-historysvg)
      - [GET `/api/v1/experience-timeline.svg`](#get-apiv1experience-timelinesvg)
    - [Embedding in Markdown](#embedding-in-markdown)
    - [Embedding in HTML](#embedding-in-html)
  - [Environment Variables](#environment-variables)
    - [Required](#required)
    - [Optional](#optional)
  - [Deployment](#deployment)
    - [Deploy to Netlify](#deploy-to-netlify)
    - [Deploy to Other Platforms](#deploy-to-other-platforms)
  - [Architecture](#architecture)
    - [Caching Strategy](#caching-strategy)
  - [Adding New Endpoints](#adding-new-endpoints)
  - [Contributing](#contributing)
  - [License](#license)


## Features

- 🎨 **Beautiful SVG Widgets** - Animated, responsive, customizable widgets for GitHub ReadMe
- 🌈 **Customizable Themes** - Choose from multiple color themes for widgets
- ⚡ **Fast & Cached** - In-memory LRU cache with configurable TTL (default: 1 hour)
- 🔒 **Secure** - Optional user locking via `LOCK_GITHUB_USER` environment variable
- 🚀 **Serverless** - Runs on Netlify Functions (AWS Lambda)
- 🔄 **Extensible** - Easy to add new widget types and API versions
- 🛠 **SVG Error Handling** - All errors returned as SVG images with appropriate HTTP status codes

## Themes

All widgets support customizable color themes to match your style preferences. Choose from 6 pre-built themes or use the default.

### Available Themes

Use the `theme` query parameter to select a theme for any widget:

| Theme | Description | Preview Colors |
|-------|-------------|----------------|
| **radical** (default) | Vibrant pink and purple with dark background | Pink title, multi-color accents |
| **ocean** | Cool blue tones inspired by the deep sea | Cyan title, ocean blue palette |
| **sunset** | Warm pink and orange hues | Coral pink title, sunset gradients |
| **forest** | Natural green tones | Fresh green title, nature-inspired |
| **midnight** | Deep purple and violet shades | Purple title, night sky colors |
| **monochrome** | Classic black, white, and gray | Clean grayscale aesthetic |

### Usage

Add the `theme` parameter to any widget URL:

```bash
/api/v1/timeseries-history.svg?userName=octocat&theme=ocean
```

### Previews

**Radical Theme (Default):**

![Radical Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/radical.svg)

**Ocean Theme:**

![Ocean Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/ocean.svg)

**Sunset Theme:**

![Sunset Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/sunset.svg)

**Forest Theme:**

![Forest Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/forest.svg)

**Midnight Theme:**

![Midnight Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/midnight.svg)

**Monochrome Theme:**

![Monochrome Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/monochrome.svg)


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

Test the endpoints:
```bash
# Timeseries history - with username and date range
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281&range=2025-01-01:2025-10-15"

# Timeseries history - with username only (defaults to last 365 days)
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281"

# Experience timeline - with CSV data
CSV_DATA="company,start,end,title,logo,color%0AGoogle,2025-10,,AI/ML%20Engineer,,#4285F4"
curl "http://localhost:8888/api/v1/experience-timeline.svg?experienceCSV=${CSV_DATA}"
```

## API Documentation

### Base URL

- **Production**: `https://your-site.netlify.app/api/v1/`
- **Local**: `http://localhost:8888/api/v1/`

### Endpoints

#### GET `/api/v1/timeseries-history.svg`

![time-series-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/timeseries-history-sample.svg)

Generate a GitHub contribution timeseries chart as an SVG image.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to generate chart for |
| `range` | string | Optional | Date range in format `YYYY-MM-DD:YYYY-MM-DD` (max 365 days) |
| `theme` | string | Optional | Color theme: `radical` (default), `ocean`, `sunset`, `forest`, `midnight`, `monochrome` |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage
/api/v1/timeseries-history.svg?userName=octocat

# With date range
/api/v1/timeseries-history.svg?userName=octocat&range=2024-01-01:2024-12-31

# With custom theme
/api/v1/timeseries-history.svg?userName=octocat&theme=ocean
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600`
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

---

#### GET `/api/v1/experience-timeline.svg`

![experience-timeline-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/experience-timeline-sample.svg)

Generate a professional experience timeline as an SVG image.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `experienceCSV` | string | Yes | URI-encoded CSV data with experience entries |
| `includeStartDate` | boolean | Optional | Whether to display start date labels on timeline nodes. Defaults to `true`. |
| `includeEndDate` | boolean | Optional | Whether to display end date labels on timeline nodes. Defaults to `true`. |
| `width` | number | Optional | Width of the SVG in pixels. Defaults to `1200`. |
| `heightPerLane` | number | Optional | Height per timeline lane in pixels. Defaults to `80`. |
| `marginTop` | number | Optional | Top margin in pixels. Defaults to `100`. |
| `marginRight` | number | Optional | Right margin in pixels. Defaults to `30`. |
| `marginBottom` | number | Optional | Bottom margin in pixels. Defaults to `30`. |
| `marginLeft` | number | Optional | Left margin in pixels. Defaults to `30`. |
| `baseFontSize` | number | Optional | Base font size in pixels for relative scaling of all text. All font sizes scale proportionally from this value. Defaults to `14`. |
| `embedLogos` | boolean | Optional | Whether to embed company logos in the timeline. Defaults to `true`. |
| `animationTotalDuration` | number | Optional | Total duration of the animation in seconds. Defaults to `5`. |
| `theme` | string | Optional | Color theme: `radical` (default), `ocean`, `sunset`, `forest`, `midnight`, `monochrome` |

**CSV Format:**

The CSV must have the following header (in this exact order):
```
company,start,end,title,logo,color
```

**Field Descriptions:**

- `company` (required): Company name
- `start` (required): Start date in format `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`
- `end` (optional): End date in same format as start, or empty for "present"
- `title` (optional): Job title/position
- `logo` (optional): URL to company logo image
- `color` (optional): Hex color code for the timeline bar (e.g., `#4285F4`)

**Example CSV:**

```csv
company,start,end,title,logo,color
Google,2025-10,,AI/ML Engineer,https://example.com/google-logo.png,#4285F4
Spotify,2024-08,2025-06,Sr Software Developer,https://example.com/spotify-logo.png,#1DB954
Netflix,2024-04,2024-12,Software Engineer - Contract,,#E50914
Amazon,2022-01,2024-08,Software Developer,https://example.com/amazon-logo.png,#FF9900
Meta,2020-06,2021-10,Web Developer,https://example.com/meta-logo.png,#0668E1
```

**Usage Examples:**

```bash
# Basic example with minimal data
CSV="company,start,end,title,logo,color%0AGoogle,2025-10,,AI/ML%20Engineer,,#4285F4"
curl "http://localhost:8888/api/v1/experience-timeline.svg?experienceCSV=${CSV}"

# With multiple entries (URL encode the entire CSV)
# Use online URL encoder or encodeURIComponent() in JavaScript

# Customizing dimensions and animation
CSV="company,start,end,title,logo,color%0AGoogle,2025-10,,AI/ML%20Engineer,,#4285F4"
curl "http://localhost:8888/api/v1/experience-timeline.svg?experienceCSV=${CSV}&width=800&heightPerLane=60&animationTotalDuration=10"
```

* Use width, margin, and font size parameters to fit your layout.

**JavaScript Example:**

```javascript
const experienceData = `company,start,end,title,logo,color
Google,2025-10,,AI/ML Engineer,https://example.com/logo.png,#4285F4
Spotify,2024-08,2025-06,Sr Software Developer,,#1DB954`;

const encodedCSV = encodeURIComponent(experienceData);
const url = `https://your-site.netlify.app/api/v1/experience-timeline.svg?experienceCSV=${encodedCSV}`;
```


**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600`
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

All errors are returned as SVG images with appropriate HTTP status codes:

- `400 Bad Request` - Invalid CSV format, missing required fields, or invalid dates
- `404 Not Found` - Invalid endpoint
- `500 Internal Server Error` - Server error during SVG generation

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

## Architecture

The application follows a modular, extensible architecture:

- **API Router** - Routes requests to versioned handlers
- **Handlers** - Process requests and generate responses
- **Services** - Business logic (GitHub API, SVG generation)
- **Utils** - Shared utilities (cache, validation, errors)

### Caching Strategy

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
