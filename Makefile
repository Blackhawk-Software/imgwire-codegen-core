OPENAPI_URL ?= http://localhost:8000/openapi.json
SDK_TARGET ?= node

.PHONY: test-local-openapi

test-local-openapi:
	yarn build
	node scripts/local-openapi-smoke.mjs "$(OPENAPI_URL)" "$(SDK_TARGET)"
