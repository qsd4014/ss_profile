#!/usr/bin/env python3
import argparse
import json
from collections import OrderedDict
from pathlib import Path


RULESET_VERSION = 1

RULE_TYPES = {
    "DOMAIN": "domain",
    "DOMAIN-SUFFIX": "domain_suffix",
    "DOMAIN-KEYWORD": "domain_keyword",
    "DOMAIN-REGEX": "domain_regex",
    "IP-CIDR": "ip_cidr",
    "IP-CIDR6": "ip_cidr",
}


def clean_line(line):
    line = line.strip()
    if not line or line.startswith("#") or line.startswith(";"):
        return ""
    return line


def parse_rule(line):
    parts = [part.strip() for part in line.split(",")]
    if len(parts) < 2:
        return None

    field = RULE_TYPES.get(parts[0].upper())
    if field is None:
        return None

    value = parts[1]
    if not value:
        return None

    return field, value


def convert_file(source):
    grouped_rules = OrderedDict()

    for raw_line in source.read_text(encoding="utf-8").splitlines():
        line = clean_line(raw_line)
        if not line:
            continue

        parsed = parse_rule(line)
        if parsed is None:
            continue

        field, value = parsed
        grouped_rules.setdefault(field, [])
        if value not in grouped_rules[field]:
            grouped_rules[field].append(value)

    return {
        "version": RULESET_VERSION,
        "rules": [{field: values} for field, values in grouped_rules.items()],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules-dir", default="Rules")
    parser.add_argument("--output-dir", default="Rules_SingBox")
    args = parser.parse_args()

    rules_dir = Path(args.rules_dir)
    output_dir = Path(args.output_dir)

    if not rules_dir.exists():
        raise SystemExit(f"Rules directory not found: {rules_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    converted = 0
    for source in sorted(rules_dir.glob("*.list")):
        payload = convert_file(source)
        target = output_dir / f"{source.stem}.json"
        target.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        converted += 1

    print(f"Updated {converted} sing-box rule file(s).")


if __name__ == "__main__":
    main()
