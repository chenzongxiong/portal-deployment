#!/usr/bin/env python3
import os
import argparse
import logging
import random
import subprocess
import sys
import time
import datetime
import requests
from requests.exceptions import RequestException


logging.basicConfig(
    filename="/tmp/monitor.log",
    filemode="a",
    level=getattr(logging, 'INFO'),
    format="%(asctime)s %(levelname)s: %(message)s",
)

def run_cmd(cmd: str):
    try:
        result = subprocess.run(
            cmd,
            check=True,
            shell=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        return result
    except subprocess.CalledProcessError as cpe:
        logging.error(f"Command '{cmd}' failed with exit code {cpe.returncode}. Output: {cpe.output}")
    except Exception as ex:
        logging.error(f'Command: {cmd}, unknown error: {str(ex)}')


def get_container_start_time(container: str) -> datetime.datetime:
    cmd = ["docker", "inspect", "-f", "{{.State.StartedAt}}", container]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    started_at = result.stdout.strip()
    # Example: 2025-09-02T12:34:56.789012345Z
    return datetime.datetime.fromisoformat(started_at.replace("Z", "+00:00"))

def get_uptime(container: str) -> int:
    start_time = get_container_start_time(container)
    now = datetime.datetime.now(datetime.timezone.utc)
    uptime_seconds = int((now - start_time).total_seconds())
    return uptime_seconds


class TelegramBot:
    channel_id = '@fokus_monitor_channel'
    token = '7078844811:AAHv66ZTgmZd7-8Mqawkis5j3SoZ-dIGNFM'

    @classmethod
    def send_message(cls, message: str):
        url = f"https://api.telegram.org/bot{cls.token}/sendMessage"
        payload = {
            "chat_id": cls.channel_id,
            "text": message
        }
        response = requests.post(url, data=payload)

        if response.status_code == 200:
            logging.info("Message sent successfully!")
        else:
            logging.info("Failed to send message:", response.text)


def rand_sleep_3_to_5_min():
    seconds = random.randint(180, 300)  # 3–5 minutes
    logging.info("Waiting %s seconds before the next step...", seconds)
    time.sleep(seconds)


def is_endpoint_active(url: str, expected_status: int = 200, timeout: int = 10) -> bool:
    """
    Returns True if the endpoint returns the expected_status (default 200).
    Uses GET with a short timeout.
    """
    try:
        resp = requests.get(url, timeout=timeout)
        logging.info("Checked %s -> HTTP %s", url, resp.status_code)
        return resp.status_code == expected_status
    except RequestException as e:
        logging.warning("Error checking endpoint %s: %s", url, e)
        return False


def restart_piveau_hub_search():
    cmd = "docker restart piveau-hub-search"
    logging.info(f"Restarting service: {cmd}")
    run_cmd(cmd)
    uptime = get_uptime('piveau-hub-search')
    if uptime < 120:
        TelegramBot.send_message(f"Restart service {cmd} successfully")
    else:
        TelegramBot.send_message(f"Restart service {cmd} failed")

def main():
    # "https://meta4bua.fokus.fraunhofer.de/search/search?filter=dataset&limit=10&page=0"
    # "https://meta4cat.fokus.fraunhofer.de/search/search?&filter=dataset&limit=10&page=0"
    # "https://meta4ds.fokus.fraunhofer.de/search/search?filter=dataset&limit=10&page=0"
    # "https://quadriga.fokus.fraunhofer.de/search/search?filter=dataset&limit=10&page=0"
    project = os.environ.get("PROJECT")
    if project is None:
        raise Exception("Please specify the project, meta4ds, meta4bua, meta4cat, quadriga")

    url = f'https://{project}.fokus.fraunhofer.de/search/search?filter=dataset&limit=10&page=0'
    def active():
        try:
            resp = requests.get(url, timeout=120)
            status_code = resp.status_code
            logging.info("Checked %s -> HTTP %s", url, status_code)
            results = resp.json()['result']['results']
            if len(results) > 0:
                return True
            else:
                return False
        except RequestException as e:
            logging.warning("Error checking endpoint %s: %s", url, e)
            TelegramBot.send_message(f"Error checking endpoing {url}, {str(e)}")
            return False

    # 1) Initial check
    if active():
        logging.info("Endpoint is active. No action needed.")
        sys.exit(0)

    logging.error(f"Endpoint is INACTIVE after second check; restarting service 'piveau-hub-search'")
    restart_piveau_hub_search()


if __name__ == "__main__":
    main()
    # PROJECT=meta4bua python monitor-and-restart.py
