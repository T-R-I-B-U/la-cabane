.PHONY: prettier eslint check setup compress-models compress-models-force compress-models-optimized compress-models-optimized-force

prettier:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,json}"

eslint:
	npx eslint .

check:
	make eslint
	npm run format:check

setup:
	git config core.hooksPath .githooks

compress-models:
	node scripts/compress-models.mjs

compress-models-force:
	node scripts/compress-models.mjs --force

compress-models-optimized:
	node scripts/compress-models-optimized.mjs

compress-models-optimized-force:
	node scripts/compress-models-optimized.mjs --force
