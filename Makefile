.PHONY: install prepare peers train score pipeline test

install:
	python3 -m pip install -e .

prepare:
	python3 -m ml.src.cli prepare

peers:
	python3 -m ml.src.cli peers

train:
	python3 -m ml.src.cli train

score:
	python3 -m ml.src.cli score

pipeline:
	python3 -m ml.src.cli run-all

test:
	python3 -m unittest discover -s ml/tests -v

