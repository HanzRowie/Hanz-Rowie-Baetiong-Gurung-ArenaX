"""
Test script for referee availability fee fields and payment tracking system.
Run with: python test_referee_features.py
Make sure the Django server is running on port 8000.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# ─── Auth helpers ────────────────────────────────────────────────────────────

def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login/", json={"email": email, "password": password})
    if r.status_code == 200:
        token = r.json().get("access") or r.json().get("token")
        print(f"  ✅ Logged in as {email}")
        return token
    print(f"  ❌ Login failed for {email}: {r.status_code} {r.text[:200]}")
    return None

def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ─── Test functions ───────────────────────────────────────────────────────────

def test_referee_profile_fee_fields(token):
    print("\n[1] Referee Profile - Fee Fields")
    r = requests.get(f"{BASE_URL}/api/referees/profiles/", headers=headers(token))
    if r.status_code == 200:
        data = r.json()
        profiles = data.get("results", data) if isinstance(data, dict) else data
        if profiles:
            p = profiles[0]
            has_match_fee = "default_fee_per_match" in p
            has_session_fee = "default_fee_per_session" in p
            print(f"  {'✅' if has_match_fee else '❌'} default_fee_per_match field present: {p.get('default_fee_per_match')}")
            print(f"  {'✅' if has_session_fee else '❌'} default_fee_per_session field present: {p.get('default_fee_per_session')}")
            return p.get("id")
        else:
            print("  ⚠️  No profiles found — creating one")
            r2 = requests.post(f"{BASE_URL}/api/referees/profiles/", headers=headers(token), json={
                "certification_level": "LEVEL_2",
                "years_experience": 3,
                "default_fee_per_match": 2500,
                "default_fee_per_session": 8000,
            })
            print(f"  {'✅' if r2.status_code == 201 else '❌'} Create profile: {r2.status_code}")
            if r2.status_code == 201:
                p = r2.json()
                print(f"     fee_per_match={p.get('default_fee_per_match')}, fee_per_session={p.get('default_fee_per_session')}")
                return p.get("id")
    else:
        print(f"  ❌ GET profiles failed: {r.status_code} {r.text[:200]}")
    return None


def test_update_profile_fees(token, profile_id):
    print("\n[2] Update Referee Profile Fees")
    if not profile_id:
        print("  ⚠️  Skipped — no profile ID")
        return
    r = requests.patch(f"{BASE_URL}/api/referees/profiles/{profile_id}/", headers=headers(token), json={
        "default_fee_per_match": 3000,
        "default_fee_per_session": 10000,
    })
    if r.status_code == 200:
        p = r.json()
        print(f"  ✅ Updated fees — match: {p.get('default_fee_per_match')}, session: {p.get('default_fee_per_session')}")
    else:
        print(f"  ❌ Update failed: {r.status_code} {r.text[:200]}")


def test_availability_with_fees(token):
    print("\n[3] Availability Slots with Fee Fields")
    r = requests.get(f"{BASE_URL}/api/referees/availability/", headers=headers(token))
    if r.status_code == 200:
        data = r.json()
        slots = data.get("results", data) if isinstance(data, dict) else data
        if slots:
            s = slots[0]
            has_match_fee = "fee_per_match" in s
            has_session_fee = "fee_per_session" in s
            print(f"  {'✅' if has_match_fee else '❌'} fee_per_match field present: {s.get('fee_per_match')}")
            print(f"  {'✅' if has_session_fee else '❌'} fee_per_session field present: {s.get('fee_per_session')}")
        else:
            print("  ⚠️  No slots yet — creating one with fees")
    else:
        print(f"  ❌ GET availability failed: {r.status_code} {r.text[:200]}")

    # Create a new slot with fees
    r2 = requests.post(f"{BASE_URL}/api/referees/availability/", headers=headers(token), json={
        "available_date": "2026-04-15",
        "start_time": "09:00:00",
        "end_time": "17:00:00",
        "is_available": True,
        "notes": "Available for matches",
        "fee_per_match": 2500,
        "fee_per_session": 8000,
    })
    if r2.status_code in (200, 201):
        s = r2.json()
        print(f"  ✅ Created slot with fees — match: {s.get('fee_per_match')}, session: {s.get('fee_per_session')}")
        return s.get("id")
    else:
        print(f"  ❌ Create slot failed: {r2.status_code} {r2.text[:200]}")
    return None


def test_payment_summary(token):
    print("\n[4] Referee Payment Summary")
    r = requests.get(f"{BASE_URL}/api/referees/payment-summary/", headers=headers(token))
    if r.status_code == 200:
        data = r.json()
        summary = data.get("summary", {})
        print(f"  ✅ Payment summary returned")
        print(f"     total_earned:    NPR {summary.get('total_earned', 0)}")
        print(f"     pending_amount:  NPR {summary.get('pending_amount', 0)}")
        print(f"     held_in_escrow:  NPR {summary.get('held_in_escrow', 0)}")
        print(f"     total_payments:  {summary.get('total_payments', 0)}")
        by_status = data.get("by_status", {})
        if by_status:
            print(f"     status breakdown: {list(by_status.keys())}")
    else:
        print(f"  ❌ Payment summary failed: {r.status_code} {r.text[:200]}")


def test_payment_records_list(token):
    print("\n[5] Referee Payment Records List")
    r = requests.get(f"{BASE_URL}/api/referees/payment-records/", headers=headers(token))
    if r.status_code == 200:
        data = r.json()
        records = data.get("results", data) if isinstance(data, dict) else data
        print(f"  ✅ Payment records endpoint works — {len(records)} records found")
    else:
        print(f"  ❌ Payment records failed: {r.status_code} {r.text[:200]}")


def test_create_payment_record(org_token, referee_id, tournament_id):
    print("\n[6] Create Payment Record (as Organizer)")
    r = requests.post(f"{BASE_URL}/api/referees/payment-records/create/", headers=headers(org_token), json={
        "referee_id": referee_id,
        "tournament_id": tournament_id,
        "amount": 5000,
        "description": "Match officiating fee - Test",
        "notes": "Created via test script",
    })
    if r.status_code == 201:
        record = r.json()
        print(f"  ✅ Payment record created")
        print(f"     id:     {record.get('id')}")
        print(f"     amount: {record.get('amount')} {record.get('currency')}")
        print(f"     status: {record.get('payment_status')}")
        return record.get("id")
    else:
        print(f"  ❌ Create payment record failed: {r.status_code} {r.text[:300]}")
    return None


def test_mark_payment_paid(org_token, payment_record_id):
    print("\n[7] Mark Payment as Paid (as Organizer)")
    if not payment_record_id:
        print("  ⚠️  Skipped — no payment record ID")
        return
    r = requests.post(
        f"{BASE_URL}/api/referees/payment-records/{payment_record_id}/mark-paid/",
        headers=headers(org_token)
    )
    if r.status_code == 200:
        record = r.json()
        print(f"  ✅ Payment marked as paid")
        print(f"     status:  {record.get('payment_status')}")
        print(f"     paid_at: {record.get('paid_at')}")
    else:
        print(f"  ❌ Mark paid failed: {r.status_code} {r.text[:300]}")


def test_payment_summary_after_payment(token):
    print("\n[8] Payment Summary After Creating a Record")
    r = requests.get(f"{BASE_URL}/api/referees/payment-summary/", headers=headers(token))
    if r.status_code == 200:
        data = r.json()
        summary = data.get("summary", {})
        print(f"  ✅ Updated summary:")
        print(f"     total_earned:   NPR {summary.get('total_earned', 0)}")
        print(f"     pending_amount: NPR {summary.get('pending_amount', 0)}")
        print(f"     total_payments: {summary.get('total_payments', 0)}")
        recent = data.get("recent_payments", [])
        if recent:
            print(f"     most recent:    {recent[0].get('amount')} {recent[0].get('currency')} — {recent[0].get('payment_status')}")
    else:
        print(f"  ❌ Summary failed: {r.status_code}")


def test_referee_earnings(token):
    print("\n[9] Referee Earnings Endpoint")
    r = requests.get(f"{BASE_URL}/api/referees/earnings/", headers=headers(token))
    if r.status_code == 200:
        print(f"  ✅ Earnings endpoint works: {json.dumps(r.json(), indent=2)[:300]}")
    else:
        print(f"  ❌ Earnings failed: {r.status_code} {r.text[:200]}")


def test_permission_guard(referee_token, referee_id, tournament_id):
    print("\n[10] Permission Guard — Referee Cannot Create Payment Records")
    r = requests.post(f"{BASE_URL}/api/referees/payment-records/create/", headers=headers(referee_token), json={
        "referee_id": referee_id,
        "tournament_id": tournament_id,
        "amount": 9999,
    })
    if r.status_code == 403:
        print(f"  ✅ Correctly blocked with 403")
    else:
        print(f"  ❌ Expected 403, got {r.status_code}: {r.text[:200]}")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Referee Availability & Payment Tracking — Test Suite")
    print("=" * 60)

    REFEREE_EMAIL = "sarah.referee@arenax.com"
    ORGANIZER_EMAIL = "pending2@test.com"
    PASSWORD = "Test123@"

    REFEREE_ID = "434211df-9379-4da7-888a-daffa659511f"
    TOURNAMENT_ID = "113a75bb-deee-4511-b9ce-fec89f9512ad"

    print("\n--- Authenticating ---")
    ref_token = login(REFEREE_EMAIL, PASSWORD)
    org_token = login(ORGANIZER_EMAIL, PASSWORD)

    if not ref_token:
        print("\n❌ Cannot proceed without referee token. Check credentials.")
        exit(1)

    # Referee-side tests
    profile_id = test_referee_profile_fee_fields(ref_token)
    test_update_profile_fees(ref_token, profile_id)
    test_availability_with_fees(ref_token)
    test_payment_summary(ref_token)
    test_payment_records_list(ref_token)
    test_referee_earnings(ref_token)

    # Organizer-side tests
    if org_token:
        payment_record_id = test_create_payment_record(org_token, REFEREE_ID, TOURNAMENT_ID)
        test_mark_payment_paid(org_token, payment_record_id)
        test_payment_summary_after_payment(ref_token)
        test_permission_guard(ref_token, REFEREE_ID, TOURNAMENT_ID)
    else:
        print("\n⚠️  Skipping organizer tests — login failed")

    print("\n" + "=" * 60)
    print("  Tests complete")
    print("=" * 60)
