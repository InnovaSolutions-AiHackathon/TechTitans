SHELL := /bin/bash

.PHONY: up down migrate seed e2e

up:
	docker compose up --build

down:
	docker compose down

migrate:
	@echo "Migrations placeholder (SQLModel/Alembic can be added next)."

seed:
	@echo "Seed placeholder: load demo companies/peers and sample filings."

e2e:
	@echo "Run backend tests and frontend checks"
	python -m pytest backend/tests -q
	cd frontend && npm run lint
