#!/bin/bash

# GitHub Widgets - Multi-Platform Docker Build & Publish Script
# 
# This script automates the process of:
# 1. Bumping the version in package.json
# 2. Building multi-platform Docker images (linux/amd64, linux/arm64)
# 3. Publishing to Docker Hub
#
# Usage: ./scripts/publish.sh [patch|minor|major]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="cyrus2281/github-widgets"
PLATFORMS="linux/amd64,linux/arm64"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "================================================================"
}

# Validate input parameter
if [ -z "$1" ]; then
    print_error "Version bump type is required"
    echo "Usage: $0 [patch|minor|major]"
    echo ""
    echo "Examples:"
    echo "  $0 patch  # 1.0.0 -> 1.0.1"
    echo "  $0 minor  # 1.0.0 -> 1.1.0"
    echo "  $0 major  # 1.0.0 -> 2.0.0"
    exit 1
fi

VERSION_TYPE=$1

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    print_error "Invalid version type: $VERSION_TYPE"
    echo "Must be one of: patch, minor, major"
    exit 1
fi

print_header "🚀 GitHub Widgets - Release Process"
print_info "Version bump type: $VERSION_TYPE"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Git working directory is not clean"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted by user"
        exit 1
    fi
fi

# Step 1: Bump version
print_header "📦 Step 1: Bumping Version"
print_info "Running: npm version $VERSION_TYPE"
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
print_success "Version bumped to $NEW_VERSION"

# Extract version without 'v' prefix
VERSION_NUMBER=${NEW_VERSION#v}

# Step 2: Commit version change
print_header "📝 Step 2: Committing Version Change"
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag "$NEW_VERSION"
print_success "Created commit and tag $NEW_VERSION"

# Step 3: Detect build tool (podman or docker)
print_header "🔍 Step 3: Detecting Build Tool"
BUILD_TOOL=""
if command -v podman &> /dev/null; then
    BUILD_TOOL="podman"
    print_success "Using Podman"
elif command -v docker &> /dev/null; then
    BUILD_TOOL="docker"
    print_success "Using Docker"
else
    print_error "Neither Podman nor Docker found. Please install one of them."
    exit 1
fi

# Step 4: Build multi-platform images
print_header "🏗️  Step 4: Building Multi-Platform Docker Images"
print_info "Platforms: $PLATFORMS"
print_info "Tags: latest, $NEW_VERSION"
echo ""

if [ "$BUILD_TOOL" = "podman" ]; then
    # Podman build process
    print_info "Using Podman manifest build process..."
    
    # Build AMD64
    print_info "Building for linux/amd64..."
    podman build --platform linux/amd64 --build-arg VERSION=$NEW_VERSION -t temp-amd64 .
    print_success "AMD64 build complete"
    
    # Build ARM64
    print_info "Building for linux/arm64..."
    podman build --platform linux/arm64 --build-arg VERSION=$NEW_VERSION -t temp-arm64 .
    print_success "ARM64 build complete"
    
else
    # Docker buildx process
    print_info "Using Docker buildx..."
    
    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        print_error "Docker buildx is not available. Please update Docker."
        exit 1
    fi
    
    # Create/use buildx builder
    print_info "Setting up buildx builder..."
    docker buildx create --name multiplatform --use 2>/dev/null || docker buildx use multiplatform
    docker buildx inspect --bootstrap
    
    # Build for both platforms
    print_info "Building for both platforms..."
    docker buildx build \
        --platform $PLATFORMS \
        --build-arg VERSION=$NEW_VERSION \
        -t $DOCKER_IMAGE:latest \
        -t $DOCKER_IMAGE:$NEW_VERSION \
        --load \
        .
    print_success "Multi-platform build complete"
fi

# Step 5: Push to Docker Hub
print_header "📤 Step 5: Publishing to Docker Hub"
print_info "Repository: $DOCKER_IMAGE"
echo ""

if [ "$BUILD_TOOL" = "podman" ]; then
    # Push with Podman
    # Clean up any existing manifests
    print_info "Cleaning up existing manifests..."
    podman manifest rm $DOCKER_IMAGE:latest 2>/dev/null || true
    podman manifest rm $DOCKER_IMAGE:$NEW_VERSION 2>/dev/null || true
    
    # Create manifest list from local images
    print_info "Creating manifest list for latest..."
    podman manifest create $DOCKER_IMAGE:latest
    podman manifest add $DOCKER_IMAGE:latest temp-amd64
    podman manifest add $DOCKER_IMAGE:latest temp-arm64
    
    # Push manifest with latest tag
    print_info "Pushing $DOCKER_IMAGE:latest..."
    podman manifest push $DOCKER_IMAGE:latest docker://docker.io/$DOCKER_IMAGE:latest --all
    print_success "Pushed $DOCKER_IMAGE:latest"
    
    # Create and push version-tagged manifest
    print_info "Creating manifest list for $NEW_VERSION..."
    podman manifest create $DOCKER_IMAGE:$NEW_VERSION
    podman manifest add $DOCKER_IMAGE:$NEW_VERSION temp-amd64
    podman manifest add $DOCKER_IMAGE:$NEW_VERSION temp-arm64
    
    print_info "Pushing $DOCKER_IMAGE:$NEW_VERSION..."
    podman manifest push $DOCKER_IMAGE:$NEW_VERSION docker://docker.io/$DOCKER_IMAGE:$NEW_VERSION --all
    print_success "Pushed $DOCKER_IMAGE:$NEW_VERSION"
    
    # Clean up temporary images
    print_info "Cleaning up temporary images..."
    podman rmi temp-amd64 temp-arm64 2>/dev/null || true
    
else
    # Push with Docker
    print_info "Pushing images..."
    docker buildx build \
        --platform $PLATFORMS \
        --build-arg VERSION=$NEW_VERSION \
        -t $DOCKER_IMAGE:latest \
        -t $DOCKER_IMAGE:$NEW_VERSION \
        --push \
        .
    print_success "Pushed $DOCKER_IMAGE:latest"
    print_success "Pushed $DOCKER_IMAGE:$NEW_VERSION"
fi

# Step 6: Push git changes
print_header "🔄 Step 6: Pushing Git Changes"
print_info "Pushing commit and tag to remote..."
git push origin main
git push origin $NEW_VERSION
print_success "Git changes pushed"

# Summary
print_header "🎉 Release Complete!"
echo ""
print_success "Version: $NEW_VERSION"
print_success "Docker Images:"
echo "  • docker.io/$DOCKER_IMAGE:latest"
echo "  • docker.io/$DOCKER_IMAGE:$NEW_VERSION"
echo ""
print_info "Docker Hub: https://hub.docker.com/r/$DOCKER_IMAGE"
print_info "GitHub: https://github.com/cyrus2281/github-widgets/releases/tag/$NEW_VERSION"
echo ""
print_success "All done! 🚀"
