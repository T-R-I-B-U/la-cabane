.PHONY: prettier eslint check setup

prettier:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,json}"

eslint:
	npx eslint .

check:
	make eslint
	make prettier

setup:
	git config core.hooksPath .githooks
