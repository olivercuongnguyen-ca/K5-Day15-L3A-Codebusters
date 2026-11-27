"""Database connections: Postgres when DATABASE_URL is set (e.g. Neon), otherwise SQLite.

The rest of the code writes SQLite-style SQL (`?` placeholders, `with con:` for a transaction, rows read as
row["col"]). For Postgres, PgConnection keeps that interface:
    ?  -> %s, and a literal % is escaped, so the same query text runs on both
    with con:          -> a transaction (nested `with` becomes a savepoint); outside it every statement autocommits
    rows               -> dicts
Connections are kept one per thread (Neon setup costs a TLS handshake), and prepared statements are off so the
Neon / PgBouncer pooled endpoint works.
"""
import os
import sqlite3
import threading

_local = threading.local()


def database_url() -> str:
    return (os.environ.get("DATABASE_URL") or "").strip()


class PgConnection:
    def __init__(self, url):
        import psycopg
        from psycopg.rows import dict_row
        self._con = psycopg.connect(url, autocommit=True, row_factory=dict_row, prepare_threshold=None)
        self._tx = []

    @staticmethod
    def _sql(sql):
        return sql.replace("%", "%%").replace("?", "%s")

    def execute(self, sql, params=None):
        if params:
            return self._con.execute(self._sql(sql), tuple(params))
        return self._con.execute(sql)

    def executemany(self, sql, seq):
        seq = list(seq)
        if not seq:
            return
        with self._con.cursor() as cur:
            cur.executemany(self._sql(sql), [tuple(p) for p in seq])

    def executescript(self, script):
        self._con.execute(script)

    def commit(self):  # autocommit outside `with con:`; kept so SQLite-style callers work
        pass

    def __enter__(self):
        tx = self._con.transaction()
        tx.__enter__()
        self._tx.append(tx)
        return self

    def __exit__(self, *exc):
        return self._tx.pop().__exit__(*exc)

    @property
    def closed(self):
        return self._con.closed or self._con.broken


def postgres(url, on_new=None):
    """This thread's Postgres connection; reconnects if the old one dropped. `on_new(con)` runs once per new one."""
    con = getattr(_local, "pg", None)
    if con is None or con.closed or getattr(_local, "pg_url", None) != url:
        con = PgConnection(url)
        _local.pg, _local.pg_url = con, url
        if on_new:
            on_new(con)
    return con


def sqlite(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con
