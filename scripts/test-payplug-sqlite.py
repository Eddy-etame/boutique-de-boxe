"""Actual migration and payment-update SQL, using disposable in-memory SQLite only.

No connection to a deployed database, network, provider, or email service.
The companion Node test checks the actual TypeScript statement's bind count/order.
"""
import json
import pathlib
import re
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/payplug-orders.ts').read_text(encoding='utf-8')


def source_sql(prefix):
    # The application currently uses ordinary double-quoted SQL string literals.
    match = re.search(r'"(' + re.escape(prefix) + r'[^"\n]*)"', SOURCE)
    if not match:
        raise AssertionError('Actual source SQL not found: ' + prefix)
    return json.loads('"' + match.group(1) + '"')


UPDATE = source_sql('UPDATE payment_attempts SET provider_id=')
CLEAR_CART = source_sql("UPDATE carts SET payload='[]'")
NOW = '2026-09-10T12:00:00.000Z'
PAID_AT = '2026-09-10T11:59:00.000Z'


class PaymentSqlTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        migrations = sorted((ROOT / 'drizzle').glob('*.sql'))
        self.assertTrue(migrations)
        for migration in migrations:
            self.db.executescript(migration.read_text(encoding='utf-8'))
        self.insert_attempt('attempt-one')

    def tearDown(self):
        self.db.close()

    def insert_attempt(self, identifier, key='key-one', revision=1, provider=None):
        self.db.execute('''INSERT INTO payment_attempts
            (id,cart_id,request_key,fingerprint,cart_revision,mode,name,email,billing,lines,
             subtotal,shipping,total,delivery,provider_id,status,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (identifier,'cart-one',key,'fingerprint',revision,'payplug_test','Local Test',
             'nobody@example.invalid','{}','[]',4000,890,4890,'home',provider,'creating',NOW,NOW))

    def apply(self, state, refund=0, provider='pay_12345678'):
        self.db.execute(UPDATE, (
            provider,'https://secure.payplug.com/pay/test',refund,state,state,refund,
            PAID_AT if state == 'paid' or refund else None,refund,None,NOW,
            'attempt-one',provider,
        ))

    def row(self):
        return self.db.execute('SELECT * FROM payment_attempts WHERE id=?', ('attempt-one',)).fetchone()

    def test_actual_update_has_twelve_parameters(self):
        self.assertEqual(UPDATE.count('?'), 12)
        self.apply('pending')
        self.assertEqual(self.row()['status'], 'pending')

    def test_migration_defaults_refund_marker_to_zero(self):
        self.assertEqual(self.row()['refunded_cents'], 0)

    def test_paid_cannot_regress_to_pending(self):
        self.apply('paid')
        self.apply('pending')
        self.assertEqual(self.row()['status'], 'paid')
        self.assertEqual(self.row()['paid_at'], PAID_AT)

    def test_refund_review_survives_delayed_snapshots(self):
        self.apply('paid')
        self.apply('unconfirmed', refund=1500)
        for state in ('paid', 'pending', 'failed'):
            self.apply(state)
            self.assertEqual(self.row()['status'], 'unconfirmed')
            self.assertEqual(self.row()['refunded_cents'], 1500)
            self.assertIn('Remboursement', self.row()['error'])
            self.assertEqual(self.row()['paid_at'], PAID_AT)

    def test_refund_amount_is_monotonic(self):
        self.apply('unconfirmed', refund=3000)
        self.apply('unconfirmed', refund=1500)
        self.assertEqual(self.row()['refunded_cents'], 3000)

    def test_uncertain_without_refund_can_become_paid(self):
        self.apply('unconfirmed')
        self.apply('paid')
        self.assertEqual(self.row()['status'], 'paid')
        self.assertEqual(self.row()['refunded_cents'], 0)
        self.assertIsNone(self.row()['error'])

    def test_provider_binding_cannot_be_replaced(self):
        self.apply('pending')
        self.apply('paid', provider='pay_different9')
        self.assertEqual(self.row()['provider_id'], 'pay_12345678')
        self.assertEqual(self.row()['status'], 'pending')

    def test_same_cart_key_is_unique(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_attempt('attempt-two', revision=2)

    def test_same_cart_revision_is_unique_even_with_new_key(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_attempt('attempt-two', key='key-two')

    def test_provider_id_is_unique(self):
        self.apply('pending')
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_attempt('attempt-two', key='key-two', revision=2, provider='pay_12345678')


if __name__ == '__main__':
    unittest.main(verbosity=2)
