default: all

all: addon webpack

addon:
	npm install

webpack:
	npm run build

tests:
	npm test
	npm run web-test
