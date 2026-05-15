.PHONY: setup clean lint test build release release/minor release/major

PROJECT_NAME := nogginlessdom
SRC_DIR := src
TEST_DIR := tests
BUILD_DIR := build
VERSION_FILE := VERSION

VERSION := $(shell cat $(VERSION_FILE))

setup:
	@echo "Installing git hooks..."
	@bash git-hooks/setup.sh
	@echo "Installing dependencies..."
	bun install
	@echo "Setup complete."

clean:
	@echo "Cleaning..."
	-@docker ps -aq --filter "name=$(PROJECT_NAME)" | xargs -r docker rm -f 2>/dev/null
	-@docker images -q "$(PROJECT_NAME)*" | xargs -r docker rmi -f 2>/dev/null
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)
	@echo "Clean complete."

lint:
	@echo "Running markdownlint..."
	bunx markdownlint '**/*.md' --ignore node_modules --ignore site
	@echo "Running eslint..."
	bunx eslint $(SRC_DIR)
	@if find $(TEST_DIR) -name '*.ts' | grep -q .; then bunx eslint $(TEST_DIR); fi
	@echo "Running yamllint..."
	@find . -name '*.yml' -o -name '*.yaml' | grep -v node_modules | grep -v site | xargs -r bunx yaml-lint
	@echo "Running jsonlint..."
	@find . -name '*.json' -not -path '*/node_modules/*' -not -path '*/site/*' -not -name 'bun.lock' | xargs -r -I{} bunx jsonlint -q {}
	@echo "Running prettier check..."
	bunx prettier --check '$(SRC_DIR)/**/*.ts'
	@if find $(TEST_DIR) -name '*.ts' | grep -q .; then bunx prettier --check '$(TEST_DIR)/**/*.ts'; fi
	@echo "Lint complete."

test:
	@echo "Running unit tests..."
	bun test $(TEST_DIR)/unit
	@echo "Running integration tests..."
	bun test $(TEST_DIR)/integration
	@echo "Running e2e tests..."
	bun test $(TEST_DIR)/e2e
	@echo "All tests passed."

build: clean
	@echo "Building $(PROJECT_NAME) v$(VERSION)..."
	bun build $(SRC_DIR)/index.ts --outdir $(BUILD_DIR) --target node
	bunx tsc --emitDeclarationOnly
	@echo "Build complete."

SHELL := /bin/bash

define bump_version
	@CURRENT=$$(cat $(VERSION_FILE)); \
	IFS='.' read -r MAJOR MINOR PATCH <<< "$$CURRENT"; \
	$(1); \
	NEW="$$MAJOR.$$MINOR.$$PATCH"; \
	echo "$$NEW" > $(VERSION_FILE); \
	sed -i "s/\"version\": \".*\"/\"version\": \"$$NEW\"/" package.json; \
	git add $(VERSION_FILE) package.json; \
	git commit -m "chore: release v$$NEW"; \
	git tag "v$$NEW"; \
	echo "Released v$$NEW"
endef

release:
	$(call bump_version,PATCH=$$((PATCH + 1)))

release/minor:
	$(call bump_version,MINOR=$$((MINOR + 1)); PATCH=0)

release/major:
	$(call bump_version,MAJOR=$$((MAJOR + 1)); MINOR=0; PATCH=0)
