# cdp-api-docs-builder

Shared API docs builder for CDP tenant services, published as the `defradigital/cdp-api-docs-builder` Docker image.

It contains the Docusaurus glue code once (`site/`) and builds docs for a tenant repo by reading:

- `<repo>/docs/guides/*.md`
- `<repo>/docs/openapi/swagger.json` (optional, committed by the tenant)

## Build with local Node

```bash
cd ~/dev/DEFRA/cdp-api-docs-builder
./build.sh ~/dev/DEFRA/cdp-uploader latest
./build.sh ~/dev/DEFRA/cdp-uploader 1.0.0
./build.sh ~/dev/DEFRA/cdp-api-docs-builder/example latest
```

Outputs are written to `<repo>/build-<target>`.

## Check a tenant's docs (PR dry run)

```bash
./build.sh ~/dev/DEFRA/cdp-uploader check
```

Builds into a temporary folder and keeps nothing. It fails on broken links, broken anchors, broken Markdown links, MDX that doesn't compile, and a `swagger.json` that isn't valid JSON. Real builds use the same rules, so a PR that passes the check won't fail at release.

## Build with Docker

Build image:

```bash
cd ~/dev/DEFRA/cdp-api-docs-builder
docker build -t cdp-api-docs-builder:local .
```

Run against a tenant repo:

```bash
docker run --rm \
  -e SERVICE_NAME=cdp-uploader \
  -v ~/dev/DEFRA/cdp-uploader:/repo \
  cdp-api-docs-builder:local /repo latest
```

`SERVICE_NAME` is optional outside containers. In CI/container runs, set it so the
output base URL is `/api/<service>/<target>/` instead of `/api/repo/<target>/`.

## Publishing the image

Merging to `main` runs `.github/workflows/publish.yml`, which pushes `defradigital/cdp-api-docs-builder:<version>` and `:latest` to Docker Hub and tags the commit with the version. Tenant workflows pull it from there through `DEFRA/cdp-build-action/api-docs-build`, and can pin a version with `builder-version`.

It logs in with `github-ecr-role`, the role for platform images that aren't tenant services. Needs:

- `DEFRA/cdp-api-docs-builder` in `github_docker_role.repo_list` in `cdp-tf-core/github_oidc.tf`
- the `defradigital/cdp-api-docs-builder` Docker Hub repository, created once with the "Create DockerHub Repository" workflow in `cdp-tenant-config`

Pull requests build the image and check both examples without pushing: `example/` (guides only) and `example-api/` (guides and an OpenAPI spec).

## Site settings (home page front matter)

Site-wide settings go in the front matter of the home page (`docs/guides/index.md`, or the guide with `slug: /`):

```yaml
---
slug: /
sidebar_label: Overview
sidebar_position: 1
site_title: CDP Uploader API Docs
site_tagline: Upload and virus scan files for CDP services
phase: live
---
```

All optional:

- `site_title`: site header title (defaults to readable repo name)
- `site_tagline`: page metadata description (defaults to the spec's `info.title`)
- `phase`: GOV.UK phase banner tag (defaults to `beta`)
- `api_reference_redirect_from`: old path (or list of paths) the API reference used to live at, e.g. `/api/uploader/`. Every reference page gets a redirect page at the old path, so existing links keep working

Every guide can also set `sidebar_position`, `sidebar_label`, `title` and `tags`. Tagged pages are listed under `/tags/`.
