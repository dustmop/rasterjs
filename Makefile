default: all

all: addon build dev

addon:
	npm install

build:
	npm run build

dev:
	npm run dev

tests:
	npm test
