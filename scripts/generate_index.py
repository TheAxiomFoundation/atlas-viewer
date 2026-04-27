#!/usr/bin/env python3
"""Generate unified index of all arch documents and RuleSpec encodings.

This script creates a JSON index combining:
1. All documents in ~/.arch/ (Canada, UK, federal, state PDFs)
2. All RuleSpec encodings in rules-us/statute/

The output can be used by the archview webapp.
"""

import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path


def extract_canada_title(xml_path: Path) -> str | None:
    """Extract title from Canadian legislation XML."""
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        ns = {"lims": "http://justice.gc.ca/lims"}

        # Try ShortTitle first
        short_title = root.find(".//ShortTitle", ns)
        if short_title is not None and short_title.text:
            return short_title.text.strip()

        # Fall back to LongTitle
        long_title = root.find(".//LongTitle", ns)
        if long_title is not None and long_title.text:
            return long_title.text.strip()[:100]

        return None
    except Exception:
        return None


def extract_uk_title(xml_path: Path) -> str | None:
    """Extract title from UK legislation XML."""
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        ns = {"leg": "http://www.legislation.gov.uk/namespaces/legislation"}

        # Try Title element
        title = root.find(".//{http://www.legislation.gov.uk/namespaces/legislation}Title")
        if title is not None and title.text:
            return title.text.strip()

        # Try dc:title in metadata
        dc_title = root.find(".//{http://purl.org/dc/elements/1.1/}title")
        if dc_title is not None and dc_title.text:
            return dc_title.text.strip()

        return None
    except Exception:
        return None


def scan_arch_directory(arch_root: Path) -> list[dict]:
    """Scan ~/.arch for all documents."""
    documents = []

    # Canada - XML acts
    canada_dir = arch_root / "canada"
    if canada_dir.exists():
        for xml_file in canada_dir.glob("*.xml"):
            code = xml_file.stem
            title = extract_canada_title(xml_file)
            documents.append({
                "id": f"canada/{code}",
                "jurisdiction": "canada",
                "source": "laws-lois",
                "type": "statute",
                "format": "xml",
                "title": title or f"Canada Act {code}",
                "archPath": str(xml_file),
                "hasRuleSpec": False,
                "rulespecPath": None,
                "citation": f"RSC {code}",
                "text": None,
                "code": None,
            })

    # UK - XML acts
    uk_dir = arch_root / "uk" / "ukpga"
    if uk_dir.exists():
        for year_dir in uk_dir.iterdir():
            if year_dir.is_dir() and year_dir.name.isdigit():
                for xml_file in year_dir.glob("*.xml"):
                    chapter = xml_file.stem
                    year = year_dir.name
                    title = extract_uk_title(xml_file)
                    documents.append({
                        "id": f"uk/ukpga/{year}/{chapter}",
                        "jurisdiction": "uk",
                        "source": "ukpga",
                        "type": "statute",
                        "format": "xml",
                        "title": title or f"UK Act {year} c.{chapter}",
                        "archPath": str(xml_file),
                        "hasRuleSpec": False,
                        "rulespecPath": None,
                        "citation": f"c.{chapter} ({year})",
                        "text": None,
                        "code": None,
                    })

    # Federal benefits - PDFs
    federal_dir = arch_root / "federal"
    if federal_dir.exists():
        for agency_dir in federal_dir.iterdir():
            if agency_dir.is_dir():
                for pdf_file in agency_dir.rglob("*.pdf"):
                    rel_path = pdf_file.relative_to(federal_dir)
                    documents.append({
                        "id": f"federal/{rel_path.with_suffix('')}",
                        "jurisdiction": "us",
                        "source": agency_dir.name,
                        "type": "guidance",
                        "format": "pdf",
                        "title": pdf_file.stem.replace("_", " ").replace("-", " ").title(),
                        "archPath": str(pdf_file),
                        "hasRuleSpec": False,
                        "rulespecPath": None,
                        "citation": None,
                        "text": None,
                        "code": None,
                    })

    # State PDFs from PolicyEngine sources
    pe_us_dir = arch_root / "policyengine-us"
    if pe_us_dir.exists():
        for state_dir in pe_us_dir.iterdir():
            if state_dir.is_dir() and len(state_dir.name) == 2:
                for pdf_file in state_dir.glob("*.pdf"):
                    documents.append({
                        "id": f"state/{state_dir.name}/{pdf_file.stem}",
                        "jurisdiction": f"us-{state_dir.name}",
                        "source": "policyengine-us",
                        "type": "guidance",
                        "format": "pdf",
                        "title": pdf_file.stem.replace("_", " ").replace("-", " ").title(),
                        "archPath": str(pdf_file),
                        "hasRuleSpec": False,
                        "rulespecPath": None,
                        "citation": None,
                        "text": None,
                        "code": None,
                    })

    return documents


def scan_rulespec_files(rules_us_root: Path) -> list[dict]:
    """Scan rules-us/statute for RuleSpec encodings."""
    documents = []
    statute_dir = rules_us_root / "statute"

    if not statute_dir.exists():
        return documents

    for rulespec_file in statute_dir.rglob("*.yaml"):
        rel_path = rulespec_file.relative_to(statute_dir)
        path_parts = rel_path.with_suffix("").parts

        # Build citation from path (e.g., 26/32/a -> "26 USC § 32(a)")
        if len(path_parts) >= 2:
            title = path_parts[0]
            section = path_parts[1]
            subsection = "/".join(path_parts[2:]) if len(path_parts) > 2 else ""

            if subsection:
                citation = f"{title} USC § {section}({subsection.replace('/', ')(')})"
            else:
                citation = f"{title} USC § {section}"
        else:
            citation = str(rel_path)

        # Read RuleSpec file content
        try:
            content = rulespec_file.read_text()

            # Extract title from variable label or description
            title_match = re.search(r'label:\s*["\']([^"\']+)["\']', content)
            doc_title = title_match.group(1) if title_match else f"Section {citation}"

            # Extract text block if present
            text_match = re.search(r'text:\s*"""([^"]*)"""', content, re.DOTALL)
            text = text_match.group(1).strip() if text_match else ""

            documents.append({
                "id": f"us/{'/'.join(path_parts)}",
                "jurisdiction": "us",
                "source": "usc",
                "type": "statute",
                "format": "rulespec",
                "title": doc_title,
                "archPath": None,
                "hasRuleSpec": True,
                "rulespecPath": str(rulespec_file),
                "citation": citation,
                "text": text,
                "code": content,
            })
        except Exception as e:
            print(f"Error reading {rulespec_file}: {e}")

    return documents


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate unified arch document index")
    parser.add_argument(
        "--arch-root",
        default=str(Path.home() / ".arch"),
        help="Path to arch root directory",
    )
    parser.add_argument(
        "--rules-us",
        default=str(Path.home() / "TheAxiomFoundation" / "rules-us"),
        help="Path to rules-us repository",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent / "src" / "data" / "documents.json"),
        help="Output JSON file path",
    )
    parser.add_argument(
        "--include-content",
        action="store_true",
        help="Include full text/code content (increases file size)",
    )
    args = parser.parse_args()

    arch_root = Path(args.arch_root).expanduser()
    rules_us = Path(args.rules_us).expanduser()

    print(f"Scanning arch directory: {arch_root}")
    arch_docs = scan_arch_directory(arch_root)
    print(f"  Found {len(arch_docs)} arch documents")

    print(f"Scanning RuleSpec files: {rules_us}")
    rulespec_docs = scan_rulespec_files(rules_us)
    print(f"  Found {len(rulespec_docs)} RuleSpec encodings")

    # Combine and deduplicate
    all_docs = arch_docs + rulespec_docs

    # Sort by jurisdiction, then by id
    all_docs.sort(key=lambda d: (d["jurisdiction"], d["id"]))

    # Optionally strip content to reduce file size
    if not args.include_content:
        for doc in all_docs:
            if doc["format"] != "rulespec":
                doc["text"] = None
                doc["code"] = None

    # Build index
    index = {
        "generated": datetime.utcnow().isoformat() + "Z",
        "count": len(all_docs),
        "stats": {
            "canada": len([d for d in all_docs if d["jurisdiction"] == "canada"]),
            "uk": len([d for d in all_docs if d["jurisdiction"] == "uk"]),
            "us_federal": len([d for d in all_docs if d["jurisdiction"] == "us" and d["source"] != "policyengine-us"]),
            "us_state": len([d for d in all_docs if d["jurisdiction"].startswith("us-")]),
            "rulespec_encoded": len([d for d in all_docs if d["hasRuleSpec"]]),
        },
        "documents": all_docs,
    }

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(index, indent=2))

    print(f"\nWrote index to {output_path}")
    print(f"  Total documents: {index['count']}")
    print(f"  Stats: {index['stats']}")


if __name__ == "__main__":
    main()
