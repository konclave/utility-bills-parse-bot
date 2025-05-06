SHELL = /bin/bash
include .env

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

.PHONY: upload
# target: upload – upload existing archive to AWS Lambda
upload:
	@aws lambda update-function-code --zip-file fileb://bill-parser.zip --function-name GetExpensesTelegramBot

.PHONY: pack
# target: pack – archive sources
pack: cleanup
	@zip -r9q bill-parser.zip ./

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


.PHONY: deploy-yc
# target: deploy-yc – deploy existing archive to Yandex Cloud
deploy-yc:
	@yc serverless function version create \
		--function-id $(YC_LAMBDA_ID) \
		--runtime nodejs18 \
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
		--environment REQUEST_TIMEOUT=5000 \
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
	@gh secret set --env-file .env && \
  	echo "✅ Github action secrets updated"

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
