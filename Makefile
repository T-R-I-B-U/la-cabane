.PHONY: prettier check setup

prettier:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,json}"

check:
	npm run lint
	npm run format:check

setup:
	git config core.hooksPath .githooks
