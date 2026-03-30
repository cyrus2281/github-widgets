# GitHub Widgets

A flexible application for generating dynamic GitHub contribution widgets as SVG images. Supports serverless deployment (Netlify Functions), standalone server deployment (Express), and Docker containers. Designed to be embedded anywhere.

## Widgets

### GitHub Contribution Timeseries
![time-series-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/timeseries-history-sample.svg)

### Experience Timeline
![experience-timeline-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/experience-timeline-sample.svg)

### Most Starred Repositories
![most-starred-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/most-starred-sample.svg)

### User Stats
![user-stats-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/user-stats-sample.svg)

### Repository Card
![repository-card-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/repository-card-sample.svg)

### Contribution Streak
![contribution-streak-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/contribution-streak-sample.svg)

### Skill Table
![skill-table-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/skill-table-sample.svg)

### QR Code
![qr-code-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/qr-code-sample.svg)


> [!TIP]
> Try the widgets live in the [Playground](https://github-widgets.netlify.app/playground.html) - customize parameters and see real-time previews!

## Contents
- [GitHub Widgets](#github-widgets)
  - [Widgets](#widgets)
    - [GitHub Contribution Timeseries](#github-contribution-timeseries)
    - [Experience Timeline](#experience-timeline)
    - [Most Starred Repositories](#most-starred-repositories)
    - [User Stats](#user-stats)
    - [Repository Card](#repository-card)
    - [Contribution Streak](#contribution-streak)
    - [Skill Table](#skill-table)
    - [QR Code](#qr-code)
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
      - [GET `/api/v1/most-starred.svg`](#get-apiv1most-starredsvg)
      - [GET `/api/v1/user-stats.svg`](#get-apiv1user-statssvg)
      - [GET `/api/v1/repository-card.svg`](#get-apiv1repository-cardsvg)
      - [GET `/api/v1/contribution-streak.svg`](#get-apiv1contribution-streaksvg)
      - [GET `/api/v1/skill-table.svg`](#get-apiv1skill-tablesvg)
      - [GET `/api/v1/qr-code.svg`](#get-apiv1qr-codesvg)
    - [Embedding in Markdown](#embedding-in-markdown)
    - [Embedding in HTML](#embedding-in-html)
  - [Environment Variables](#environment-variables)
    - [Required](#required)
    - [Optional](#optional)
  - [Deployment](#deployment)
    - [Deployment Option 1: Netlify Functions (Serverless)](#deployment-option-1-netlify-functions-serverless)
    - [Deployment Option 2: Standalone Server (Express)](#deployment-option-2-standalone-server-express)
    - [Deployment Option 3: Docker Container](#deployment-option-3-docker-container)
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
- 🚀 **Flexible Deployment** - Deploy as serverless functions (Netlify), standalone server (Express), or Docker container
- 🔄 **Extensible** - Easy to add new widget types and API versions
- 🛠 **SVG Error Handling** - All errors returned as SVG images with appropriate HTTP status codes
- 🔗 **Timeout-Resilient** *(Express/Docker only)* - Streams XML comment heartbeats during slow generation to prevent proxy and browser idle-timeout disconnects; deduplicates concurrent identical requests

## Themes

All widgets support customizable color themes to match your style preferences.

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
| **transparent-white** | No background, light text for dark pages | White title, blue accents |
| **transparent-black** | No background, dark text for light pages | Black title, deep blue accents |
| **transparent-radical** | No background, radical theme colors | Pink title, multi-color accents |

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

**Transparent White Theme:**

![Transparent White Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/transparent-white.svg)

**Transparent Black Theme:**

![Transparent Black Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/transparent-black.svg)

**Transparent Radical Theme:**

![Transparent Radical Theme](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/themes/transparent-radical.svg)


## Quick Start

### Prerequisites

- Node.js 20.x or higher (for local development)
- GitHub Personal Access Token ([create one here](https://github.com/settings/tokens))
- Netlify account (for serverless deployment) OR any server/hosting platform (for standalone deployment) OR Docker (for container deployment)

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

**Option 1: Netlify Functions (Serverless)**

Run the Netlify development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8888/api/v1/`

**Option 2: Standalone Server (Express)**

Run the standalone Express server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev:server
```

The API will be available at `http://localhost:3000/api/v1/`

Health check endpoint: `http://localhost:3000/health`

### Testing

**For Netlify Functions (port 8888):**
```bash
# Timeseries history - with username and date range
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281&range=2025-01-01:2025-10-15"

# Timeseries history - with username only (defaults to last 365 days)
curl "http://localhost:8888/api/v1/timeseries-history.svg?userName=cyrus2281"

# Experience timeline - with CSV data
CSV_DATA="company,start,end,title,logo,color%0AGoogle,2025-10,,AI/ML%20Engineer,,#4285F4"
curl "http://localhost:8888/api/v1/experience-timeline.svg?experienceCSV=${CSV_DATA}"

# Most starred repositories
curl "http://localhost:8888/api/v1/most-starred.svg?userName=torvalds&top=5"
```

**For Standalone Server (port 3000):**
```bash
# Health check
curl "http://localhost:3000/health"

# Timeseries history
curl "http://localhost:3000/api/v1/timeseries-history.svg?userName=cyrus2281"

# Most starred repositories
curl "http://localhost:3000/api/v1/most-starred.svg?userName=torvalds&top=5"
```

## API Documentation

### Base URL

**Netlify Functions (Serverless):**
- **Production**: `https://your-site.netlify.app/api/v1/`
- **Local Development**: `http://localhost:8888/api/v1/`

**Standalone Server (Express):**
- **Production**: `https://your-domain.com/api/v1/` (or `http://your-server-ip:3000/api/v1/`)
- **Local Development**: `http://localhost:3000/api/v1/`

### Endpoints

#### GET `/api/v1/timeseries-history.svg`

![time-series-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/timeseries-history-sample.svg)

Generate a GitHub contribution timeseries chart as an SVG image.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to generate chart for |
| `range` | string | Optional | Date range in format `YYYY-MM-DD:YYYY-MM-DD` (max 365 days) |
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

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
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
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
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

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
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

All errors are returned as SVG images with appropriate HTTP status codes:

- `400 Bad Request` - Invalid CSV format, missing required fields, or invalid dates
- `404 Not Found` - Invalid endpoint
- `500 Internal Server Error` - Server error during SVG generation

---

#### GET `/api/v1/most-starred.svg`

![most-starred-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/most-starred-sample.svg)

Generate a widget displaying your most starred GitHub repositories with animated glowing borders.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to fetch repositories for |
| `top` | number | Optional | Number of repositories to display (1-10). Defaults to `3`. |
| `title` | string | Optional | Custom title for the widget. Defaults to `"Most Starred"`. |
| `animationDuration` | number | Optional | Duration of card entrance animations in seconds (0.5-10). Defaults to `3.5`. |
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage - top 3 repositories (default)
/api/v1/most-starred.svg?userName=torvalds

# Custom number of repositories
/api/v1/most-starred.svg?userName=torvalds&top=5

# Custom title and theme
/api/v1/most-starred.svg?userName=torvalds&top=5&title=Top%20Projects&theme=ocean

# Custom animation duration (faster animations)
/api/v1/most-starred.svg?userName=torvalds&animationDuration=2

# All parameters
/api/v1/most-starred.svg?userName=torvalds&top=5&title=My%20Best%20Work&theme=midnight&animationDuration=4.5
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Invalid username or top parameter out of range (1-10)
- `404 Not Found` - User not found or no repositories available
- `500 Internal Server Error` - Server error during SVG generation

---

#### GET `/api/v1/user-stats.svg`

![user-stats-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/user-stats-sample.svg)

Generate a comprehensive GitHub user statistics widget displaying various metrics with an animated GitHub logo.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to fetch statistics for |
| `showHandle` | boolean | Optional | Display user's GitHub handle (@username). Defaults to `true`. |
| `showStars` | boolean | Optional | Display total stars across all repositories. Defaults to `true`. |
| `showCommits` | boolean | Optional | Display total commits (all time). Defaults to `true`. |
| `showCommitsThisYear` | boolean | Optional | Display commits for the current year. Defaults to `true`. |
| `showPRs` | boolean | Optional | Display total pull requests. Defaults to `true`. |
| `showIssues` | boolean | Optional | Display total issues. Defaults to `true`. |
| `showRepos` | boolean | Optional | Display total repositories. Defaults to `true`. |
| `showContributedTo` | boolean | Optional | Display number of repositories contributed to. Defaults to `true`. |
| `showLogo` | boolean | Optional | Show/hide the GitHub logo. When hidden, widget width adjusts to 300px. Defaults to `true`. |
| `width` | number | Optional | Width of the SVG in pixels (300-1000). Defaults to `600`. |
| `animationDuration` | number | Optional | Duration of animations in seconds (0.5-10). Defaults to `2`. |
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage - all stats visible (default)
/api/v1/user-stats.svg?userName=octocat

# Show only specific stats
/api/v1/user-stats.svg?userName=octocat&showCommits=false&showIssues=false

# Custom width
/api/v1/user-stats.svg?userName=octocat&width=600

# With custom theme
/api/v1/user-stats.svg?userName=octocat&theme=ocean

# Minimal stats display
/api/v1/user-stats.svg?userName=octocat&showHandle=false&showCommitsThisYear=false&showPRs=false&showIssues=false

# Custom animation speed
/api/v1/user-stats.svg?userName=octocat&animationDuration=4

# Hide the GitHub logo (widget becomes narrower at 300px)
/api/v1/user-stats.svg?userName=octocat&showLogo=false

# All parameters combined
/api/v1/user-stats.svg?userName=octocat&width=700&theme=midnight&animationDuration=3&showCommitsThisYear=false
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Invalid username, width out of range (300-1000), or animationDuration out of range (0.5-10)
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error during SVG generation

---

#### GET `/api/v1/repository-card.svg`

![repository-card-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/repository-card-sample.svg)


Generate a repository card widget displaying GitHub repository information similar to GitHub's pinned repositories.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username (repository owner) |
| `repoName` | string | Yes | Repository name |
| `theme` | string | Optional | Color theme. Default `radical` |
| `showUserName` | boolean | Optional | Display the username/owner. Defaults to `true`. |
| `showLanguage` | boolean | Optional | Display the primary language. Defaults to `true`. |
| `showStars` | boolean | Optional | Display star count. Defaults to `true`. |
| `showForks` | boolean | Optional | Display fork count. Defaults to `true`. |
| `width` | number | Optional | Width of the card in pixels (300-600). Defaults to `400`. |
| `height` | number | Optional | Height of the card in pixels (100-200). Defaults to `120`. |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage
/api/v1/repository-card.svg?userName=octocat&repoName=github-widgets

# With custom theme
/api/v1/repository-card.svg?userName=octocat&repoName=github-widgets&theme=ocean

# Hide specific elements
/api/v1/repository-card.svg?userName=octocat&repoName=github-widgets&showUserName=false&showForks=false

# Custom dimensions
/api/v1/repository-card.svg?userName=octocat&repoName=github-widgets&width=500&height=150

# All parameters combined
/api/v1/repository-card.svg?userName=octocat&repoName=github-widgets&theme=midnight&width=550&height=140&showLanguage=false
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Invalid username, repository name, or parameters out of range
- `404 Not Found` - Repository not found
- `500 Internal Server Error` - Server error during SVG generation

---

#### GET `/api/v1/contribution-streak.svg`

![contribution-streak-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/contribution-streak-sample.svg)

Generate a contribution streak widget displaying total contributions, current streak with animated ring, and longest streak.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Conditional* | GitHub username to fetch contribution data for |
| `theme` | string | Optional | Color theme. Default `radical` |
| `animationDuration` | number | Optional | Duration of animations in seconds (0.5-10). Defaults to `2`. |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

*Required unless `LOCK_GITHUB_USER` environment variable is set.

**Examples:**

```bash
# Basic usage
/api/v1/contribution-streak.svg?userName=octocat

# With custom theme
/api/v1/contribution-streak.svg?userName=octocat&theme=ocean

# Custom animation speed
/api/v1/contribution-streak.svg?userName=octocat&animationDuration=4

# All parameters combined
/api/v1/contribution-streak.svg?userName=octocat&theme=midnight&animationDuration=3
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Invalid username or animationDuration out of range (0.5-10)
- `404 Not Found` - User not found or no contribution data available
- `500 Internal Server Error` - Server error during SVG generation

---

#### GET `/api/v1/skill-table.svg`

![skill-table-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/skill-table-sample.svg)

Generate a visual skill table with technology icons as an SVG image. Icons are sourced from [Simple Icons](https://simpleicons.org/) or custom URLs and are embedded directly in the SVG for compatibility with GitHub READMEs.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skills` | string | Yes | Pipe-separated skill entries (see format below) |
| `columns` | number | Optional | Number of columns (1-10). Defaults to `4`. |
| `title` | string | Optional | Title displayed above the table |
| `subtitle` | string | Optional | Subtitle below the title |
| `showTitles` | boolean | Optional | Show skill names under icons. Defaults to `true`. |
| `iconSize` | number | Optional | Icon size in pixels (16-128). Defaults to `48`. |
| `useOriginalColors` | boolean | Optional | Use brand's original logo colors. When `false`, uses theme text color. Defaults to `true`. |
| `iconColor` | string | Optional | Override all icon colors with this hex value (e.g. `ffffff`). |
| `gap` | number | Optional | Spacing between cells in pixels (0-64). Defaults to `16`. |
| `animationDuration` | number | Optional | Animation duration in seconds (0.5-10). Defaults to `1`. |
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

**Skills Format:**

Entries are separated by `|` (pipe). Each entry is one of:

| Format | Description | Example |
|--------|-------------|---------|
| `slug` | Simple Icons slug, uses brand name as title | `python` |
| `Title:slug` | Simple Icons slug with custom display title | `C++:cplusplus` |
| `Title:URL` | Custom icon URL with display title | `Java:https://example.com/java.svg` |
| `--Name--` | Section header spanning all columns | `--Programming Languages--` |

Find icon slugs at [simpleicons.org](https://simpleicons.org/).

**Examples:**

```bash
# Basic usage
/api/v1/skill-table.svg?skills=python|javascript|react|docker

# With section headers and title
/api/v1/skill-table.svg?skills=--Languages--|python|javascript|C%2B%2B:cplusplus|--Tools--|docker|git&title=My%20Skills&columns=3

# With custom icons and theme
/api/v1/skill-table.svg?skills=python|Java:https://example.com/java.svg|react&theme=ocean

# Themed icons (uniform color)
/api/v1/skill-table.svg?skills=python|javascript|react&useOriginalColors=false
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Missing skills parameter, no valid entries, or input too long
- `500 Internal Server Error` - Server error during SVG generation

#### GET `/api/v1/qr-code.svg`

![qr-code-sample](https://raw.githubusercontent.com/cyrus2281/github-widgets/refs/heads/main/samples/qr-code-sample.svg)

Generate a styled SVG QR code for any text or URL, with an optional centered logo (from [Simple Icons](https://simpleicons.org/) or a custom URL), an optional title, and an optional vertical-axis spin animation on the logo.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Text or URL to encode in the QR code (max 2000 characters) |
| `logo` | string | Optional | Simple Icons slug (e.g. `github`) or custom icon URL |
| `logoColor` | string | Optional | Override logo color with a hex value (e.g. `ffffff`, no `#`) |
| `title` | string | Optional | Title displayed above the QR code |
| `size` | number | Optional | QR code size in pixels (100–800). Defaults to `300`. |
| `margin` | number | Optional | Quiet zone modules around the QR code (0–4). Defaults to `2`. |
| `animate` | boolean | Optional | Spin the logo on its vertical axis. Defaults to `false`. |
| `animationDuration` | number | Optional | Logo spin duration in seconds (1–10). Defaults to `3`. |
| `theme` | string | Optional | Color theme. Default `radical` |
| `nocache` | boolean | Optional | Bypass server cache and instruct client not to cache. Defaults to `false`. |

**Logo Format:**

The `logo` parameter accepts two formats:

| Format | Description | Example |
|--------|-------------|---------|
| slug | Simple Icons slug | `github` |
| URL | Custom icon URL (SVG or raster image) | `https://example.com/logo.svg` |

Find icon slugs at [simpleicons.org](https://simpleicons.org/).

> [!NOTE]
> The QR code uses error correction level H (high), which allows up to 30% of the QR code data to be recovered. This is required to safely overlay a logo in the center while keeping the code scannable.

**Examples:**

```bash
# Basic QR code
/api/v1/qr-code.svg?content=https://github.com/cyrus2281

# With GitHub logo and title
/api/v1/qr-code.svg?content=https://github.com/cyrus2281/github-widgets&logo=github&title=GitHub%20Widgets

# With animated logo
/api/v1/qr-code.svg?content=https://github.com&logo=github&animate=true

# With custom icon URL and color override
/api/v1/qr-code.svg?content=https://example.com&logo=https://example.com/logo.svg&logoColor=ffffff

# Larger QR code with theme
/api/v1/qr-code.svg?content=https://github.com&logo=github&size=500&theme=ocean
```

**Response:**

- **Content-Type**: `image/svg+xml`
- **Cache-Control**: `public, max-age=3600` (or `no-store, no-cache` when `nocache=true`)
- **X-Cache**: `HIT` or `MISS` (indicates cache status)

**Error Responses:**

- `400 Bad Request` - Missing content parameter, empty content, or content exceeds 2000 characters
- `500 Internal Server Error` - Server error during SVG generation

---

### Embedding in Markdown

**Netlify Deployment:**
```markdown
![GitHub Contributions](https://your-site.netlify.app/api/v1/timeseries-history.svg?userName=octocat)
```

**Standalone Server Deployment:**
```markdown
![GitHub Contributions](https://your-domain.com/api/v1/timeseries-history.svg?userName=octocat)
```

### Embedding in HTML

**Netlify Deployment:**
```html
<img src="https://your-site.netlify.app/api/v1/timeseries-history.svg?userName=octocat" alt="GitHub Contributions" />
```

**Standalone Server Deployment:**
```html
<img src="https://your-domain.com/api/v1/timeseries-history.svg?userName=octocat" alt="GitHub Contributions" />
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

- **`PORT`** - Server port (Standalone Server only)
  - Default: `3000`
  - Only used when running the standalone Express server
  - Example: `PORT=8080`

- **`SVG_HEADER_HEARTBEAT`** - Enable connection keep-alive heartbeat (Standalone Server / Docker only)
  - Default: `false`
  - When `true`, streams XML comment chunks every 1.5 seconds during slow SVG generation to prevent proxy and browser idle-timeout disconnects
  - Example: `SVG_HEADER_HEARTBEAT=true`

## Deployment

This application supports two deployment options, each with distinct advantages:

### Deployment Option 1: Netlify Functions (Serverless)

**Setup:**

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
netlify env:set CACHE_MAX_SIZE "100"  # Optional
netlify env:set CACHE_TTL_MS "3600000"  # Optional
```

**Access your API:**
```
https://your-site.netlify.app/api/v1/timeseries-history.svg?userName=octocat
```

---

### Deployment Option 2: Standalone Server (Express)

**Setup:**

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

3. **Start the server:**

**Production mode:**
```bash
npm start
```

**Development mode (with auto-reload):**
```bash
npm run dev:server
```

The server will start on port 3000 (or the PORT specified in `.env`).

4. **Verify the server is running:**

```bash
# Health check
curl http://localhost:3000/health

# Test an endpoint
curl "http://localhost:3000/api/v1/user-stats.svg?userName=octocat"
```

---

### Deployment Option 3: Docker Container

**Prerequisites:**

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- GitHub Personal Access Token ([create one here](https://github.com/settings/tokens))

**Quick Start:**

Pull and run the pre-built image from [Docker Hub](https://hub.docker.com/r/cyrus2281/github-widgets):

```bash
docker pull cyrus2281/github-widgets:latest

docker run -d \
  --name github-widgets \
  -p 3000:3000 \
  -e GITHUB_TOKEN="ghp_your_token_here" \
  cyrus2281/github-widgets:latest
```

**Access your API:**
```
http://localhost:3000/api/v1/timeseries-history.svg?userName=octocat
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

---

**Environment Variables:**

Configure the container using environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token with `read:user` scope |
| `PORT` | No | `3000` | Port the server listens on inside the container |
| `LOCK_GITHUB_USER` | No | - | Lock API to specific GitHub user (disables `userName` parameter) |
| `CACHE_MAX_SIZE` | No | `100` | Maximum number of cached responses |
| `CACHE_TTL_MS` | No | `3600000` | Cache time-to-live in milliseconds (1 hour) |

---

**Advanced Usage:**

**1. Run with all configuration options:**

```bash
docker run -d \
  --name github-widgets \
  -p 8080:3000 \
  -e GITHUB_TOKEN="ghp_your_token_here" \
  -e LOCK_GITHUB_USER="your-username" \
  -e CACHE_MAX_SIZE="200" \
  -e CACHE_TTL_MS="7200000" \
  --restart unless-stopped \
  cyrus2281/github-widgets:latest
```

**2. Run with custom port mapping:**

```bash
# Map container port 3000 to host port 8080
docker run -d \
  --name github-widgets \
  -p 8080:3000 \
  -e GITHUB_TOKEN="ghp_your_token_here" \
  cyrus2281/github-widgets:latest

# Access at http://localhost:8080/api/v1/...
```

**3. View logs:**

```bash
docker logs github-widgets

# Follow logs in real-time
docker logs -f github-widgets
```

**4. Stop and remove container:**

```bash
docker stop github-widgets
docker rm github-widgets
```

**Building from Source (Optional):**

If you want to build the Docker image yourself:

```bash
# Clone the repository
git clone https://github.com/cyrus2281/github-widgets.git
cd github-widgets

# Build the image
docker build -t github-widgets:local .

# Run your custom build
docker run -d \
  --name github-widgets \
  -p 3000:3000 \
  -e GITHUB_TOKEN="ghp_your_token_here" \
  github-widgets:local
```

---

**Production Deployment Tips:**

**1. Use specific version tags:**
```bash
docker pull cyrus2281/github-widgets:v1.0.0
```

**2. Behind a reverse proxy (Nginx, Traefik, Caddy):**
```nginx
# Nginx example
location /github-widgets/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_valid 200 1h;
}
```

**3. Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: github-widgets
spec:
  replicas: 3
  selector:
    matchLabels:
      app: github-widgets
  template:
    metadata:
      labels:
        app: github-widgets
    spec:
      containers:
      - name: github-widgets
        image: cyrus2281/github-widgets:latest
        ports:
        - containerPort: 3000
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-widgets-secret
              key: github-token
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: github-widgets
spec:
  selector:
    app: github-widgets
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

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

### Connection Keep-Alive *(Express/Docker only)*

Some widgets make multiple sequential GitHub API calls and can take several seconds to generate on a cold cache. To prevent proxies and browsers from dropping the connection during generation, the Express adapter (`server/adapter.js`) uses HTTP chunked transfer encoding:

1. Response headers and `200 OK` are committed immediately when the request arrives.
2. An XML comment (`<!-- heartbeat -->`) is written every 1.5 seconds while generation is in progress, keeping the connection active.
3. Once generation completes, the full SVG body is written and the response is ended.

XML comments are valid before the root `<svg>` element and are ignored by SVG parsers, so they have no effect on the rendered image.

**In-flight deduplication** is also applied at this layer: if two requests arrive for the same uncached widget simultaneously, they share a single handler execution rather than each spawning redundant GitHub API calls.

> [!NOTE]
> This technique applies to the **Express and Docker** deployment paths only. Netlify Lambda Functions do not support streaming responses — the function runs internally and sends the complete response when finished. Netlify's function timeout is 10 seconds; the slowest widgets complete in 6–7 seconds, so this is not a concern for Netlify deployments. On cold cache, Netlify clients will simply wait the full generation time before receiving the image.

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

3. Add route in `server/routes.js`:

```javascript
router.get(['/v1/new-endpoint.svg', '/v1/new-endpoint'], wrapHandler(newEndpointHandler));
```

4. Reuse existing utilities (cache, validation, errors)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. If adding or updating a widget endpoint, update `public/widgets-config.json` with the new endpoint details (name, path, query parameters, defaults, and descriptions). This file powers the interactive playground at `/playground.html`.
5. Submit a pull request

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details
