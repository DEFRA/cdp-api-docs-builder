# cdp-api-docs-builder (local demo)

Local prototype of the shared API docs builder.

It contains the Docusaurus glue code once (`site/`) and builds docs for a tenant repo by reading:

- `<repo>/cdp.yml`
- `<repo>/docs/guides/*.md`
- `<repo>/docs/openapi/swagger.json` (optional)

If `apiDocs.generate` is set in `cdp.yml`, the command runs in the tenant repo before the build.

## Build with local Node

```bash
cd ~/dev/DEFRA/cdp-api-docs-builder
./build.sh ~/dev/DEFRA/cdp-uploader latest
./build.sh ~/dev/DEFRA/cdp-uploader 1.0.0
./build.sh ~/dev/DEFRA/cdp-api-docs-builder/example latest
```

Outputs are written to `<repo>/build-<target>`.

## Build with Docker

Build image:

```bash
cd ~/dev/DEFRA/cdp-api-docs-builder
docker build -t cdp-api-docs-builder:local .
```

Run against a tenant repo:

```bash
docker run --rm \
  -v ~/dev/DEFRA/cdp-api-docs-builder:/workspace \
  -v ~/dev/DEFRA/cdp-uploader:/repo \
  cdp-api-docs-builder:local /repo latest
```

## Inputs (`cdp.yml`)

```yaml
apiDocs:
  title: CDP Uploader API Docs
  generate: npm run docs:openapi
  phase: beta
```

Optional keys:

- `title`: site header title (defaults to readable repo name)
- `generate`: command to produce `docs/openapi/swagger.json`
- `phase`: GOV.UK phase banner (`alpha`, `beta`, `live`)
