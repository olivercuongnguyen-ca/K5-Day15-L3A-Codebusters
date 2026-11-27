"""Database connections: Postgres when DATABASE_URL is set (e.g. Neon), otherwise SQLite.

The rest of the code writes SQLite-style SQL (`?` placeholders, `with con:` for a transaction, rows read as
row["col"]). For Postgres, PgConnection keeps that interface:
    ?  -> %s, and a literal % is escaped, so the same query text runs on both
    with con:          -> a transaction (nested `with` becomes a savepoint); outside it every statement autocommits
    rows               -> dicts
Connections are kept one per thread (Neon setup costs a TLS handshake), and prepared statements are off so the
Neon / PgBouncer pooled endpoint works. Neon drops idle connections when compute scales to zero: a statement outside
a transaction is retried once on a fresh connection.
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
        self._psycopg = psycopg
        self.url = url
        self._tx = []
        self._open()

    def _open(self):
        from psycopg.rows import dict_row
        self._con = self._psycopg.connect(self.url, autocommit=True, row_factory=dict_row, prepare_threshold=None,
                                          connect_timeout=15)

    def _run(self, fn):
        try:
            return fn()
        except self._psycopg.OperationalError:
            if self._tx:  # mid-transaction: the caller must see the failure
                raise
            self._open()  # dropped idle connection: retry once on a fresh one
            return fn()

    @staticmethod
    def _sql(sql):
        return sql.replace("%", "%%").replace("?", "%s")

    def execute(self, sql, params=None):
        if params:
            return self._run(lambda: self._con.execute(self._sql(sql), tuple(params)))
        return self._run(lambda: self._con.execute(sql))

    def executemany(self, sql, seq):
        seq = [tuple(p) for p in seq]
        if not seq:
            return
        def go():
            with self._con.cursor() as cur:
                cur.executemany(self._sql(sql), seq)  # psycopg pipelines these: one round trip per batch
        self._run(go)

    def executescript(self, script):
        self._run(lambda: self._con.execute(script))

    def close(self):
        self._con.close()

    def commit(self):  # autocommit outside `with con:`; kept so SQLite-style callers work
        pass

    def __enter__(self):
        def begin():
            tx = self._con.transaction()
            tx.__enter__()
            return tx
        self._tx.append(begin() if self._tx else self._run(begin))
        return self

    def __exit__(self, *exc):
        return self._tx.pop().__exit__(*exc)

    @property
    def closed(self):
        return self._con.closed or self._con.broken


def postgres(url, on_new=None):
    """This thread's Postgres connection; reconnects if the old one dropped. `on_new(con)` runs once per new one."""
    con = getattr(_local, "pg", None)
    if con is None or con.closed or con.url != url:
        con = PgConnection(url)
        _local.pg = con
        if on_new:
            on_new(con)
    return con


def sqlite(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con
