# Multi-Platform Docker Build Guide

This document describes how to build and push multi-platform Docker images for the GitHub Widgets project.

## Overview

The GitHub Widgets Docker image supports multiple architectures:
- **linux/amd64** - For Intel/AMD 64-bit systems
- **linux/arm64** - For ARM 64-bit systems (Apple Silicon, ARM servers)

## Prerequisites

- **Podman** 5.5.2 or later (or Docker with buildx support)
- **Docker Hub account** with push access to `cyrus2281/github-widgets`
- **Authentication**: Must be logged in to Docker Hub

```bash
# Login to Docker Hub
podman login docker.io
# or
docker login
```

## Build Process

### Method 1: Using Podman (Recommended)

Podman natively supports multi-platform builds using manifest lists.

#### Step 1: Create Manifest List

```bash
# Remove any existing manifest/image with the same name
podman manifest rm cyrus2281/github-widgets:latest 2>/dev/null || \
podman rmi cyrus2281/github-widgets:latest 2>/dev/null || true

# Create a new manifest list
podman manifest create cyrus2281/github-widgets:latest
```

#### Step 2: Build for AMD64 Architecture

```bash
podman build --platform linux/amd64 -t cyrus2281/github-widgets:amd64 .
```

#### Step 3: Build for ARM64 Architecture

```bash
podman build --platform linux/arm64 -t cyrus2281/github-widgets:arm64 .
```

#### Step 4: Add Images to Manifest

```bash
# Add AMD64 image to manifest
podman manifest add cyrus2281/github-widgets:latest cyrus2281/github-widgets:amd64

# Add ARM64 image to manifest
podman manifest add cyrus2281/github-widgets:latest cyrus2281/github-widgets:arm64
```

#### Step 5: Inspect Manifest (Optional)

```bash
# Verify both platforms are in the manifest
podman manifest inspect cyrus2281/github-widgets:latest
```

Expected output:
```json
{
    "schemaVersion": 2,
    "mediaType": "application/vnd.oci.image.index.v1+json",
    "manifests": [
        {
            "mediaType": "application/vnd.oci.image.manifest.v1+json",
            "platform": {
                "architecture": "amd64",
                "os": "linux"
            }
        },
        {
            "mediaType": "application/vnd.oci.image.manifest.v1+json",
            "platform": {
                "architecture": "arm64",
                "os": "linux",
                "variant": "v8"
            }
        }
    ]
}
```

#### Step 6: Push to Docker Hub

```bash
# Push with 'latest' tag
podman manifest push cyrus2281/github-widgets:latest docker://docker.io/cyrus2281/github-widgets:latest

# Push with version tag (e.g., v1.0.0)
podman manifest push cyrus2281/github-widgets:latest docker://docker.io/cyrus2281/github-widgets:v1.0.0
```

### Method 2: Using Docker Buildx

Docker Buildx provides a streamlined approach for multi-platform builds.

#### Step 1: Set Up Buildx Builder

```bash
# Check existing builders
docker buildx ls

# Create a new builder (if needed)
docker buildx create --name multiplatform --use

# Bootstrap the builder
docker buildx inspect --bootstrap
```

#### Step 2: Build and Push Multi-Platform Image

```bash
# Build for both platforms and push directly to Docker Hub
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t cyrus2281/github-widgets:latest \
  -t cyrus2281/github-widgets:v1.0.0 \
  --push \
  .
```

#### Step 3: Verify Multi-Platform Image

```bash
# Inspect the image manifest on Docker Hub
docker buildx imagetools inspect cyrus2281/github-widgets:latest
```

## Verification

### Pull and Test Specific Platform

```bash
# Pull AMD64 version
podman pull --platform linux/amd64 docker.io/cyrus2281/github-widgets:latest

# Pull ARM64 version
podman pull --platform linux/arm64 docker.io/cyrus2281/github-widgets:latest

# Test the image
podman run --rm cyrus2281/github-widgets:latest node --version
```

### Automatic Platform Selection

When users pull without specifying a platform, Docker/Podman automatically selects the correct architecture:

```bash
# Automatically pulls the correct platform for your system
podman pull docker.io/cyrus2281/github-widgets:latest
docker pull cyrus2281/github-widgets:latest
```

## Version Tagging

The project uses semantic versioning. When releasing a new version:

1. Update the version in [`package.json`](package.json:3)
2. Build and push with both `latest` and version-specific tags:

```bash
# Example for version 1.0.0
podman manifest push cyrus2281/github-widgets:latest docker://docker.io/cyrus2281/github-widgets:latest
podman manifest push cyrus2281/github-widgets:latest docker://docker.io/cyrus2281/github-widgets:v1.0.0
```

## Docker Hub Repository

- **Repository**: https://hub.docker.com/r/cyrus2281/github-widgets
- **Tags**: 
  - `latest` - Latest stable release (multi-platform)
  - `v1.0.0` - Specific version (multi-platform)

## Troubleshooting

### Issue: "name is already in use"

```bash
# Remove existing manifest/image
podman manifest rm cyrus2281/github-widgets:latest
# or
podman rmi cyrus2281/github-widgets:latest
```

### Issue: ARM64 build is slow

ARM64 builds on AMD64 hosts use QEMU emulation, which is slower. This is expected behavior. Consider:
- Building on native ARM64 hardware (e.g., Apple Silicon Mac)
- Using cloud CI/CD with ARM64 runners
- Being patient - the build will complete, just takes longer

### Issue: Authentication errors

```bash
# Ensure you're logged in to Docker Hub
podman login docker.io
# Enter your Docker Hub username and password/token
```

### Issue: HEALTHCHECK warnings

```
level=warning msg="HEALTHCHECK is not supported for OCI image format and will be ignored. Must use `docker` format"
```

This is a Podman-specific warning. The HEALTHCHECK directive works fine when the image is run with Docker or Podman. You can safely ignore this warning.

## Build Time

- **AMD64 build**: ~30-60 seconds (with cache)
- **ARM64 build**: ~30-60 seconds (with cache, on ARM64 host)
- **ARM64 build on AMD64**: ~2-5 minutes (QEMU emulation)
- **Total process**: ~5-10 minutes including push

## Image Size

- **AMD64 image**: ~202 MB
- **ARM64 image**: ~201 MB
- **Manifest list**: ~1.19 KB

## CI/CD Integration

For automated builds, add these steps to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v2

- name: Login to Docker Hub
  uses: docker/login-action@v2
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Build and push
  uses: docker/build-push-action@v4
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: |
      cyrus2281/github-widgets:latest
      cyrus2281/github-widgets:v${{ github.ref_name }}
```

## Additional Resources

- [Podman Manifest Documentation](https://docs.podman.io/en/latest/markdown/podman-manifest.1.html)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images Guide](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile Reference](./Dockerfile)

## Support

For issues or questions:
- GitHub Issues: https://github.com/cyrus2281/github-widgets/issues
- Docker Hub: https://hub.docker.com/r/cyrus2281/github-widgets
