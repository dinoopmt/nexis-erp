#!/bin/bash

# GRN Edit Manager - CURL Test Script
# Tests against running server with real API calls
#
# Usage: bash server/tests/curl-tests.sh
# Prerequisites: 
#   - Node server running on localhost:5000
#   - MongoDB with test data
#   - curl installed

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API="http://localhost:5000/api"
TEST_USER_ID="65a1234567890abcdef12345"  # Replace with real user ID

# ========================================
# Helper Functions
# ========================================

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ========================================
# TEST 1: GET List of Failed Edits
# ========================================
test_get_failed_edits() {
    print_header "TEST 1: Retrieve Failed Edit Records"
    
    echo "Command:"
    echo "  curl -X GET $API/failed-edits"
    echo ""
    
    response=$(curl -s -X GET "$API/failed-edits" -H "Content-Type: application/json")
    
    if echo "$response" | grep -q "_id"; then
        print_success "Retrieved failed edit records"
        echo "Response: $response" | head -n 5
    else
        print_warn "No failed edits found (this might be OK on first run)"
    fi
}

# ========================================
# TEST 2: Try to Edit GRN (Will be blocked or locked)
# ========================================
test_edit_grn_attempt() {
    print_header "TEST 2: Attempt to Edit Posted GRN"
    
    local GRN_ID="${1:-65a1234567890abcdef12345}"  # Replace with real GRN ID
    
    echo "Command:"
    echo "  curl -X PUT $API/grn/$GRN_ID \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"items\": [...], \"createdBy\": \"$TEST_USER_ID\"}'"
    echo ""
    
    cat > /tmp/grn_edit.json << EOF
{
  "items": [
    {
      "productId": "65a1234567890abcdef12346",
      "quantity": 50,
      "unitCost": 10
    }
  ],
  "createdBy": "$TEST_USER_ID",
  "notes": "Test edit"
}
EOF
    
    echo "Sending PUT request..."
    response=$(curl -s -w "\n%{http_code}" -X PUT "$API/grn/$GRN_ID" \
        -H "Content-Type: application/json" \
        -d @/tmp/grn_edit.json)
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    echo "Response Code: $http_code"
    
    if [ "$http_code" = "200" ]; then
        print_success "GRN edit accepted"
        echo "Response (truncated): $(echo $body | jq '.' | head -n 10)"
    elif [ "$http_code" = "400" ]; then
        print_error "Validation failed (this is OK if data is invalid)"
        echo "Error: $(echo $body | jq '.error' 2>/dev/null || echo $body)"
    elif [ "$http_code" = "403" ]; then
        print_warn "Edit rejected - likely locked or transaction-blocked"
        echo "Message: $(echo $body | jq '.message' 2>/dev/null || echo $body)"
    else
        print_error "Unexpected response: $http_code"
    fi
}

# ========================================
# TEST 3: Check Edit Lock Status
# ========================================
test_check_lock_status() {
    print_header "TEST 3: Check Edit Lock Status"
    
    local GRN_ID="${1:-65a1234567890abcdef12345}"
    
    echo "Command:"
    echo "  curl -X GET $API/grn/$GRN_ID"
    echo ""
    
    response=$(curl -s -X GET "$API/grn/$GRN_ID" -H "Content-Type: application/json")
    
    # Check if lock exists
    lock=$(echo "$response" | jq '.editLock' 2>/dev/null)
    
    if [ "$lock" != "null" ] && [ "$lock" != "" ]; then
        print_info "Lock exists on GRN:"
        echo "$response" | jq '.editLock'
    else
        print_info "No lock on GRN (available for editing)"
    fi
    
    # Show version
    version=$(echo "$response" | jq '.__v' 2>/dev/null)
    print_info "Current version: $version"
}

# ========================================
# TEST 4: Manual Recovery of Failed Edit
# ========================================
test_manual_recovery() {
    print_header "TEST 4: Attempt Manual Recovery"
    
    local FAILURE_ID="${1:-65a1234567890abcdef12347}"  # Replace with real failure ID
    
    echo "Command:"
    echo "  curl -X PUT $API/failed-edits/$FAILURE_ID/recover?action=retry"
    echo ""
    
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        "$API/failed-edits/$FAILURE_ID/recover?action=retry" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Recovery initiated"
        echo "$body" | jq '.message' 2>/dev/null || echo "$body"
    else
        print_warn "Recovery failed (ID might not exist): $http_code"
    fi
}

# ========================================
# TEST 5: Database Verification
# ========================================
test_db_verification() {
    print_header "TEST 5: Database Verification Queries"
    
    echo "To verify data in MongoDB, run these commands in mongosh:"
    echo ""
    echo "  # Check for edit locks"
    echo "  db.goods_receipt_notes.find({ 'editLock': { \$ne: null } })"
    echo ""
    echo "  # Check failed edits"
    echo "  db.failed_edits.find({ recovered: false })"
    echo ""
    echo "  # Check GRN version"
    echo "  db.goods_receipt_notes.findOne({ grnNumber: 'GRN-XXX' }, { __v: 1, editLock: 1 })"
    echo ""
    echo "  # Check stock movements (to see atomicity)"
    echo "  db.stock_movements.find({ reference: /GRN-XXX/ }).sort({ createdDate: -1 })"
    echo ""
}

# ========================================
# MAIN TEST RUNNER
# ========================================

main() {
    print_header "🧪 GRN EDIT MANAGER - CURL TEST SUITE"
    
    echo "Prerequisites Check:"
    
    # Check server connectivity
    if curl -s "$API/health" > /dev/null 2>&1; then
        print_success "Server is running on $API"
    else
        print_error "Server not responding on $API"
        print_info "Start server: cd server && npm start"
        exit 1
    fi
    
    echo ""
    echo "Running tests..."
    echo ""
    
    # Run tests
    test_get_failed_edits
    test_check_lock_status "YOUR_GRN_ID_HERE"  # Replace with real GRN ID
    test_edit_grn_attempt "YOUR_GRN_ID_HERE"   # Replace with real GRN ID
    test_db_verification
    
    print_header "📊 TEST SUMMARY"
    echo "Tests completed. Verify results above."
    echo ""
    echo "💡 NEXT STEPS:"
    echo "1. Replace 'YOUR_GRN_ID_HERE' with real GRN IDs from your database"
    echo "2. Run actual edits and observe lock behavior"
    echo "3. Check MongoDB for lock records"
    echo "4. Trigger a failure scenario to test rollback"
    echo ""
}

# Show usage
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: bash server/tests/curl-tests.sh [GRN_ID] [FAILURE_ID]"
    echo ""
    echo "Arguments:"
    echo "  GRN_ID      - GRN MongoDB ID to test (optional)"
    echo "  FAILURE_ID  - Failed edit ID to recover (optional)"
    echo ""
    echo "Examples:"
    echo "  bash server/tests/curl-tests.sh"
    echo "  bash server/tests/curl-tests.sh 65a1234567890abcdef12345"
    exit 0
fi

main "$@"
