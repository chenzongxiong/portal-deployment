#!/usr/bin/env python3
import argparse
import subprocess
import os
import sys
from pathlib import Path
import yaml
import time
HOST = "localhost"
PORT = 8090


def list_pipes(project):
    """Find available pipes for a project."""
    project_path = Path(f'pipes/{project}')
    files = [x for x in project_path.rglob('*.yaml')]
    pipes = []
    for fname in files:
        data = yaml.safe_load(fname.read_text())
        pipe = data['header']['name']
        if pipe == 'metrics':
            continue
        pipes.append(pipe)

    return sorted(pipes)


def main():
    parser = argparse.ArgumentParser(
        description="Harvest datasets from pipes.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        "-p", "--project",
        required=True,
        choices=["nfdi4ds", "quadriga", "nfdi4cat"],
        help="Set the project"
    )
    parser.add_argument(
        "-d", "--dataset",
        action="append",
        help="Dataset(s) to harvest (from pipes/<project>/pipe-*.yaml)"
    )
    parser.add_argument(
        "-a", "--all",
        action="store_true",
        help="Harvest all datasets in project"
    )
    parser.add_argument(
        "--skip-dry-run",
        action="store_true",
        help="Execute harvesting instead of dry-run"
    )

    args = parser.parse_args()

    # Determine pipes to run
    if args.all:
        pipes = list_pipes(args.project)
    elif args.dataset:
        pipes = args.dataset
    else:
        print("Error: must provide either --dataset or --all")
        parser.print_help()
        sys.exit(1)

    # Loop over pipes
    for pipe in pipes:
        print(f"Skip dry run: {1 if args.skip_dry_run else 0}")
        if args.skip_dry_run:
            print(f"Harvesting dataset {pipe}")
            # Example: Uncomment this block to really send requests
            import requests
            url = f"http://{HOST}:{PORT}/pipes/{pipe}/triggers/immediateTrigger"
            resp = requests.put(
                url,
                headers={"Content-Type": "application/json"},
                json={"status": "enabled", "id": "immediateTrigger"}
            )
            print(f"[{pipe}] response: {resp.status_code} {resp.text}")
            # sleep 5 minutes
            time.sleep(300)
        else:
            print(f"[DryRun] Harvesting dataset {pipe}")


if __name__ == "__main__":
    main()
