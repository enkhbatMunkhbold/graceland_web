#!/usr/bin/env python3
"""Copy application data from a SQLite backup into an empty PostgreSQL schema."""

import argparse
import getpass
import os
from pathlib import Path

import sqlalchemy as sa


SKIP_TABLES = {"alembic_version"}


def parse_args():
    project_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=project_root / "backups" / "app-before-postgres-migration.db",
        help="Path to the SQLite backup",
    )
    parser.add_argument(
        "--allow-nonempty",
        action="store_true",
        help="Allow inserting into a target that already contains application rows",
    )
    return parser.parse_args()


def normalized_postgres_url():
    url = os.environ.get("MIGRATION_DATABASE_URL", "").strip()
    if not url:
        url = getpass.getpass("Paste Render External Database URL: ").strip()
    if not url:
        raise SystemExit("No PostgreSQL URL was provided.")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if not url.startswith(("postgresql://", "postgresql+psycopg2://")):
        raise SystemExit("MIGRATION_DATABASE_URL must be a PostgreSQL URL.")
    return url


def quote_identifier(engine, name):
    return engine.dialect.identifier_preparer.quote(name)


def main():
    args = parse_args()
    source_path = args.source.expanduser().resolve()
    if not source_path.is_file():
        raise SystemExit(f"SQLite backup not found: {source_path}")

    source = sa.create_engine(f"sqlite:///{source_path}")
    target = sa.create_engine(normalized_postgres_url(), pool_pre_ping=True)

    source_inspector = sa.inspect(source)
    target_inspector = sa.inspect(target)
    source_tables = set(source_inspector.get_table_names()) - SKIP_TABLES
    target_tables = set(target_inspector.get_table_names()) - SKIP_TABLES

    missing = source_tables - target_tables
    if missing:
        raise SystemExit(
            "PostgreSQL is missing migrated tables: " + ", ".join(sorted(missing))
        )

    metadata = sa.MetaData()
    metadata.reflect(bind=target, only=sorted(source_tables))
    ordered_tables = [
        table for table in metadata.sorted_tables if table.name in source_tables
    ]

    with target.connect() as connection:
        populated = {}
        for table in ordered_tables:
            count = connection.scalar(sa.select(sa.func.count()).select_from(table))
            if count:
                populated[table.name] = count
    if populated and not args.allow_nonempty:
        details = ", ".join(f"{name}={count}" for name, count in populated.items())
        raise SystemExit(
            "Refusing to copy into a non-empty PostgreSQL database: " + details
        )

    source_metadata = sa.MetaData()
    source_metadata.reflect(bind=source, only=[table.name for table in ordered_tables])

    copied = {}
    with source.connect() as source_connection, target.begin() as target_connection:
        for target_table in ordered_tables:
            source_table = source_metadata.tables[target_table.name]
            rows = source_connection.execute(sa.select(source_table)).mappings().all()
            if rows:
                target_connection.execute(target_table.insert(), [dict(row) for row in rows])
            copied[target_table.name] = len(rows)

        for table in ordered_tables:
            primary_key = target_inspector.get_pk_constraint(table.name).get(
                "constrained_columns"
            ) or []
            if len(primary_key) != 1:
                continue
            column_name = primary_key[0]
            column = table.c[column_name]
            if not isinstance(column.type, sa.Integer):
                continue
            sequence = target_connection.scalar(
                sa.text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
                {"table_name": table.name, "column_name": column_name},
            )
            if not sequence:
                continue
            maximum = target_connection.scalar(sa.select(sa.func.max(column)))
            target_connection.execute(
                sa.text("SELECT setval(CAST(:sequence AS regclass), :value, :used)"),
                {
                    "sequence": sequence,
                    "value": maximum if maximum is not None else 1,
                    "used": maximum is not None,
                },
            )

    print("Migration completed successfully:")
    for table_name in sorted(copied):
        print(f"  {table_name}: {copied[table_name]} rows")


if __name__ == "__main__":
    main()
