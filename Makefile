SHELL = /bin/bash
include .env

.PHONY: deploy
deploy: pack register deploy-yc

.PHONY: upload
upload:
	@aws lambda update-function-code --zip-file fileb://bill-parser.zip --function-name GetExpensesTelegramBot

.PHONY: pack
pack: cleanup
	@zip -r9q bill-parser.zip ./

.PHONY: status
status:	
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/getwebhookinfo" | json_pp

.PHONY: register
register:
	@curl "https://api.telegram.org/bot$(BOT_TOKEN)/setWebHook?url=$(YANDEX_HOOK_URL)"

.PHONY: deploy-yc
deploy-yc:
	@yc serverless function version create \
		--function-id $(YC_LAMBDA_ID) \
		--runtime nodejs16 \
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
		--runtime nodejs16 \
		--entrypoint index.storeHandler \
		--execution-timeout 45s \
		--service-account-id $(YC_SERVICE_ACCOUNT_ID)\
		--environment YC_REGION=ru-central1 \
		--environment YC_S3_ACCESS_KEY=YCAJEtcsytDcii7NoxCNv3ckw \
		--environment YC_S3_SECRET_ACCESS_KEY=YCPL0uOUJ1O3KIAf0I7CbZpvwnM2VIiURaaPSy1h \
		--source-path ./bill-parser.zip

.PHONY: cleanup
cleanup:
		@rm ./bill-parser.zip

.PHONY: update-github-secrets
update-github-secrets:
	@gh secret set --env-file .env && \
  	echo "✅ Github action secrets updated"
