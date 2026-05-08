.PHONY: help dev build build-ui build-bin tidy vet test clean release-local

VERSION ?= dev
LDFLAGS := -s -w -X main.version=$(VERSION)

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

dev: ## Run the UI dev server (Vite) — for iterative UI work
	pnpm dev:ui

build-ui: ## Build the React UI into web/dist (consumed by //go:embed)
	pnpm build:ui

build-bin: ## Build the Go binary; requires web/dist to be populated
	go build -ldflags="$(LDFLAGS)" -o solsclaw ./cmd/solsclaw

build: build-ui build-bin ## Full build: UI → embed → Go binary

tidy: ## Refresh go.sum
	go mod tidy

vet: ## go vet ./...
	go vet ./...

test: ## go test ./...
	go test ./...

clean: ## Remove build outputs
	find web/dist -mindepth 1 ! -name '.gitkeep' -delete
	rm -rf solsclaw solsclaw-* dist-bin

# Build all release artifacts locally (mirrors what goreleaser does in CI).
# Useful for verifying the cross-compile story before pushing a tag.
release-local: build-ui ## Build all 5 platform binaries into dist-bin/
	@mkdir -p dist-bin
	@for target in \
	  darwin-arm64 \
	  darwin-amd64 \
	  linux-amd64 \
	  linux-arm64 \
	  windows-amd64 ; do \
	    os=$${target%-*}; arch=$${target#*-}; \
	    ext=""; [ "$$os" = "windows" ] && ext=".exe"; \
	    name="dist-bin/solsclaw-$$target$$ext"; \
	    echo "→ $$name"; \
	    GOOS=$$os GOARCH=$$arch CGO_ENABLED=0 \
	      go build -ldflags="$(LDFLAGS)" -o "$$name" ./cmd/solsclaw || exit 1; \
	    if command -v sha256sum >/dev/null 2>&1; then \
	      sha256sum "$$name" | awk '{print $$1}' > "$$name.sha256"; \
	    else \
	      shasum -a 256 "$$name" | awk '{print $$1}' > "$$name.sha256"; \
	    fi ; \
	  done
	@ls -lh dist-bin
