.PHONY: prettier eslint check setup

prettier:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,json}"

eslint:
	npx eslint .

check:
	make eslint
	npm run format:check

setup:
	git config core.hooksPath .githooks
