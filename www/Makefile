CSS_SOURCES := $(wildcard *.scss)
CSS_TARGETS := $(patsubst %.scss, build/%.css, $(CSS_SOURCES))

.PHONY: all
all: $(CSS_TARGETS)

build:
	mkdir -p build

build/%.css: %.scss build
	sass $< $@
