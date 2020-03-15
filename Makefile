BIN := venv/bin
NPM := $(BIN)/npm
SHELL := env PATH=$(BIN):$(PATH) /bin/bash

DOCKER_REVISION ?= testing-$(USER)
DOCKER_TAG = docker-push.ocf.berkeley.edu/labmap:$(DOCKER_REVISION)
RANDOM_PORT := $(shell expr $$(( 8000 + (`id -u` % 1000) + 1 )))

.PHONY: dev
dev: cook-image
	@echo "Will be accessible at http://$(shell hostname -f ):$(RANDOM_PORT)/"
	docker run --rm -p "$(RANDOM_PORT):8000" "$(DOCKER_TAG)"

.PHONY: cook-image
cook-image: web-resources
	docker build --pull -t $(DOCKER_TAG) .

.PHONY: push-image
push-image:
	docker push $(DOCKER_TAG)

.PHONY: compile
compile: node_modules
	$(NPM) run tsc
	$(NPM) run tslint

.PHONY: web-resources
web-resources: compile
	$(MAKE) -C www

node_modules: venv package.json package-lock.json
	$(BIN)/nodeenv -pq
	$(NPM) install

venv: requirements.txt
	vendor/venv-update \
		venv= $@ -ppython3 \
		install= -r requirements.txt -r requirements-dev.txt

.PHONY: clean
clean:
	rm -rf venv

.PHONY: update-requirements
update-requirements: venv
	$(BIN)/upgrade-requirements

.PHONY: install-hooks
install-hooks: venv
	venv/bin/pre-commit install -f --install-hooks

.PHONY: test
test: venv compile
	venv/bin/pre-commit run --all-files
