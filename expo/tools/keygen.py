#!/usr/bin/env python3
"""
РендерАИ — Генератор лицензионных ключей.

Запуск:
  python3 keygen.py              # 1 ключ на 30 дней
  python3 keygen.py 7            # 1 ключ на 7 дней
  python3 keygen.py 30 5         # 5 ключей по 30 дней

Ключ проверяется в приложении офлайн — без серверов.
"""

import sys
import secrets
from datetime import datetime, timedelta

# ⚠️ СЕКРЕТ — должен совпадать с LICENSE_SECRET в licenseService.ts
LICENSE_SECRET = "renderai-mf-2026-secret-key"
EPOCH = datetime(2025, 1, 1)


def fnv1a(data):
    h = 0x811C9DC5
    for ch in data:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def compute_checksum(nonce, days, created):
    base = f"{LICENSE_SECRET}:{nonce}:{days}:{created}"
    h1 = fnv1a(base)
    h2 = fnv1a(base + ":v2")
    return (format(h1, "08x")[:3] + format(h2, "08x")[:3]).upper()


def generate_key(duration_days=30):
    if duration_days < 1 or duration_days > 255:
        raise ValueError("Срок: от 1 до 255 дней")
    nonce = secrets.token_hex(2).upper()
    created = (datetime.utcnow() - EPOCH).days
    checksum = compute_checksum(nonce, duration_days, created)
    raw = f"{nonce}{duration_days:02X}{created:04X}{checksum}"
    return f"RAI-{raw[0:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}"


def decode_key(key):
    clean = key.strip().upper().replace("RAI-", "").replace("-", "")
    if len(clean) != 16:
        return None
    nonce, days = clean[0:4], int(clean[4:6], 16)
    created, checksum = int(clean[6:10], 16), clean[10:16]
    if checksum != compute_checksum(nonce, days, created):
        return None
    d = EPOCH + timedelta(days=created)
    return {"days": days, "created": d.strftime("%d.%m.%Y"),
            "expires": (d + timedelta(days=days)).strftime("%d.%m.%Y")}


def main():
    duration = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    print(f"\n  РендерАИ — Генерация ключей ({duration} дней x {count})\n")
    for _ in range(count):
        key = generate_key(duration)
        info = decode_key(key)
        print(f"  {key}  |  до {info['expires']}")
    print()


if __name__ == "__main__":
    main()
