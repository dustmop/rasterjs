default: all

all: addon webpack

addon:
	npm install

webpack:
	npm run build
