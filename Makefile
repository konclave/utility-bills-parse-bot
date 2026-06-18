SHELL = /bin/bash
-include .env

# ============================
# Auxiliary targets.
# ============================
.PHONY: help
help:
	@echo
	@egrep "^\s*#\s*target\s*:\s*" [Mm]akefile \
	| sed "s/^\s*#\s*target\s*:\s*//g"
	@echo

all: help
	@:

.PHONY: deploy
# target: deploy – archive source code, register Telegram bot webhook and deploy archive to Yandex Cloud Functions
deploy: pack register deploy-yc

.PHONY: deploy-vercel
# target: deploy-vercel – deploy bot to Vercel and register Telegram webhook to Vercel URL
deploy-vercel: register-vercel
	@vercel --prod

.PHONY: register-vercel
# target: register-vercel – register Telegram webhook to Vercel URL
register-vercel:
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/setWebHook?url=$(VERCEL_HOOK_URL)api/webhook&drop_pending_updates=True"

.PHONY: upload
# target: upload – upload existing archive to AWS Lambda
upload:
	@aws lambda update-function-code --zip-file fileb://bill-parser.zip --function-name GetExpensesTelegramBot

.PHONY: pack
# target: pack – archive sources
pack: cleanup
	@zip -r9q bill-parser.zip ./ -x ".git/*" -x ".git" -x ".DS_Store" -x ".remember/*" -x ".superpowers/*" -x ".worktrees/*" -x "docs/*" -x "superpowers/*"

.PHONY: status
# target: status – print Telegram bot status
status:
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/getwebhookinfo" | json_pp

.PHONY: register
# target: register – register Telegram bot webhook
register:
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/setWebHook?url=$(YANDEX_HOOK_URL)$(BOT_HOOK_PATH)&drop_pending_updates=True"

.PHONY: unregister
# target: unregister – delete Telegram bot webhook
unregister:
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/deleteWebHook?url=$(YANDEX_HOOK_URL)$(BOT_HOOK_PATH)&drop_pending_updates=True"


.PHONY: deploy-gateway
# target: deploy-gateway – update Yandex Cloud API Gateway from api-gateway.yaml
deploy-gateway:
	@yc serverless api-gateway update d5dvbvaselvn2d30mv6v --spec api-gateway.yaml

.PHONY: pack-proxy
# target: pack-proxy – archive only proxy source files (excludes bot, tests, fixtures)
pack-proxy:
	@rm -f ./proxy.zip
	@zip -r9q proxy.zip \
		proxy.js \
		package.json \
		src/water/fetch-water.js \
		src/electricity/fetch-electricity.js \
		src/mosobleirc/fetch.js \
		src/mosobleirc/auth.js \
		src/mosobleirc/store.js \
		src/mosobleirc/config.js \
		src/shared/s3.js \
		src/shared/parse-pdf.js \
		src/shared/period.js

.PHONY: deploy-yc-proxy
# target: deploy-yc-proxy – deploy provider proxy function to Yandex Cloud
deploy-yc-proxy: pack-proxy
	@yc serverless function version create \
		--function-id $(YC_PROXY_LAMBDA_ID) \
		--runtime nodejs22 \
		--entrypoint proxy.handler \
		--execution-timeout 45s \
		--service-account-id $(YC_SERVICE_ACCOUNT_ID) \
		--environment LOGIN=$(LOGIN) \
		--environment PASSWORD="$$(grep '^PASSWORD=' .env | cut -d= -f2-)" \
		--environment MOSENERGO_LOGIN=$(MOSENERGO_LOGIN) \
		--environment MOSENERGO_PASSWORD="$$(grep '^MOSENERGO_PASSWORD=' .env | cut -d= -f2-)" \
		--environment MOSENERGO_ACCOUNT=$(MOSENERGO_ACCOUNT) \
		--environment MOSENERGO_ID_KNG=$(MOSENERGO_ID_KNG) \
		--environment MOSENERGO_NM_ABN=$(MOSENERGO_NM_ABN) \
		--environment MOSOBL_ACCOUNT=$(MOSOBL_ACCOUNT) \
		--environment MOSOBL_TENANT_TOKEN=$(MOSOBL_TENANT_TOKEN) \
		--environment MOSOBL_LOGIN=$(MOSOBL_LOGIN) \
		--environment MOSOBL_PASSWORD="$$(grep '^MOSOBL_PASSWORD=' .env | cut -d= -f2-)" \
		--environment REQUEST_TIMEOUT=30000 \
		--environment MESSAGE_FORMAT=$(MESSAGE_FORMAT) \
		--source-path ./proxy.zip

.PHONY: deploy-yc
# target: deploy-yc – deploy existing archive to Yandex Cloud
deploy-yc:
	@yc serverless function version create \
		--function-id $(YC_LAMBDA_ID) \
		--runtime nodejs22 \
		--entrypoint index.handler \
		--execution-timeout 45s \
		--service-account-id $(YC_SERVICE_ACCOUNT_ID)\
		--environment LOGIN=$(LOGIN) \
		--environment PASSWORD=$(PASSWORD) \
		--environment MOSENERGO_LOGIN=$(MOSENERGO_LOGIN) \
		--environment MOSENERGO_PASSWORD=$(MOSENERGO_PASSWORD) \
		--environment MOSENERGO_ACCOUNT=$(MOSENERGO_ACCOUNT) \
		--environment MOSENERGO_ID_KNG=$(MOSENERGO_ID_KNG) \
		--environment MOSENERGO_NM_ABN=$(MOSENERGO_NM_ABN) \
		--environment BOT_TOKEN=$(BOT_TOKEN) \
		--environment BOT_HOOK_PATH=$(BOT_HOOK_PATH) \
		--environment MOSOBL_ACCOUNT=$(MOSOBL_ACCOUNT) \
		--environment MOSOBL_TENANT_TOKEN=$(MOSOBL_TENANT_TOKEN) \
		--environment MOSOBL_LOGIN=$(MOSOBL_LOGIN) \
		--environment MOSOBL_PASSWORD=$(MOSOBL_PASSWORD) \
		--environment REQUEST_TIMEOUT=5000 \
		--environment MESSAGE_FORMAT=$(MESSAGE_FORMAT) \
		--source-path ./bill-parser.zip
	@yc serverless function version create \
		--function-id $(YC_STORE_LAMBDA_ID) \
		--runtime nodejs18 \
		--entrypoint index.storeHandler \
		--execution-timeout 45s \
		--service-account-id $(YC_SERVICE_ACCOUNT_ID)\
		--async
		--environment YC_REGION=ru-central1 \
		--environment YC_S3_BUCKET=electricity-invoices \
		--environment YC_S3_ACCESS_KEY=$(YC_S3_ACCESS_KEY) \
		--environment YC_S3_SECRET_ACCESS_KEY=$(YC_S3_SECRET_ACCESS_KEY) \
		--source-path ./bill-parser.zip

.PHONY: cleanup
# target: cleanup – remove archive file
cleanup:
	@rm -f ./bill-parser.zip
	@rm -rf node_modules

.PHONY: update-github-secrets
# target: update-github-secrets – update Github secrets from .env file
update-github-secrets:
	@test -f .env && gh secret set --env-file .env && \
		echo "✅ Github action secrets updated" || \
		echo "⚠️  .env file not found, skipping Github secrets update"

.PHONY: dev
# target: dev - start development server
dev:
	npm run start

.PHONY: test
# target: test - run tests
test:
	npm run test

.PHONY: e2e
e2e:
	curl -X POST -H "Content-Type: application/json" http://localhost:8000

.PHONY: dump-pdf
# traget: dump-pdf – dumps PDF file to strings array JSON file. make dump-pdf PDF=./source.pdf JSON=./destenation.json
dump-pdf:
	node ./src/dump-pdf.js $(PDF) $(JSON)
