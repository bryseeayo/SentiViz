.PHONY: serve clean

PORT ?= 8000

serve:
	python3 -m http.server $(PORT)

clean:
	@true

